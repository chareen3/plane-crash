import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats, computeBetSignal, buildHumanSummary, analyzeStability, buildAdvisoryTiers } from '../../../lib/stats';
import { PEAK_HOURS_UTC, buildPrompt, callAI, getLKTimeData, systemPrompt, AI_CONFIDENCE_CEIL } from '../../../lib/ai';
import { getSriLankaTimeSlot, getPrediction } from '../../../lib/prediction';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Full history fetch — paginated up to 5,000 rounds with timestamps ──
async function fetchRecentRounds() {
  const rounds: { round_number: number; crash_point: number; created_at: string }[] = [];
  const PAGE_SIZE = 1000;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from('crash_rounds')
      .select('round_number, crash_point, created_at')
      .order('created_at', { ascending: false })
      .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    rounds.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rounds;
}


function getTier(v: number): 'INSTANT' | 'LOW' | 'MED' | 'HIGH' {
  if (v < 1.15) return 'INSTANT';
  if (v < 2.00) return 'LOW';
  if (v < 5.00) return 'MED';
  return 'HIGH';
}

async function fetchHistoricalHourRounds(sriLankaHour: number) {
  // Query 90 days (last 3 months) of history for accurate timezone/season pattern mapping
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('crash_rounds')
    .select('round_number, crash_point, created_at, hour_sl')
    .eq('hour_sl', sriLankaHour)
    .gte('created_at', ninetyDaysAgo)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching historical hour rounds:', error);
    return [];
  }
  return data || [];
}




// ─── Main handler ──────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { data: dbSettings } = await supabase.from('game_settings').select('key, value');
    const settings = Object.fromEntries((dbSettings ?? []).map(r => [r.key, r.value]));
    const isMaintenance = settings.maintenance_mode === true || settings.maintenance_mode === 'true';
    const sleepEnabled = settings.sleep_phase_enabled !== false && settings.sleep_phase_enabled !== 'false';

    if (isMaintenance) {
      return NextResponse.json({
        risk: 'HIGH',
        predicted_risk: 'HIGH',
        confidence: 0,
        summary: "System is under maintenance. Predictions and signals are paused.",
        should_bet: false,
        strategy: 'SKIP',
        skip_reason: "MAINTENANCE MODE ACTIVE",
        cashout_target: 0,
        timeData: getLKTimeData(new Date(), sleepEnabled),
      });
    }

    const rounds = await fetchRecentRounds();
    if (rounds.length < 3)
      return NextResponse.json({ error: 'Need 3+ rounds.' });

    const lastRoundNumber = rounds[0]?.round_number ?? 0;
    const nextRoundNumber = lastRoundNumber + 1;

    // Check cache
    const { data: existingPred } = await supabase
      .from('predictions')
      .select('*')
      .eq('round_number', nextRoundNumber)
      .maybeSingle();

    const url = new URL(request.url);
    const gameType = (url.searchParams.get('game') || '1xbet') as '1xbet' | 'aviator' | 'luckyjet';
    const userTimezone = url.searchParams.get('tz') || 'UTC';
    
    const lookback_avg_20 = rounds.length > 0 ? rounds.slice(0, 20).reduce((acc, r) => acc + Number(r.crash_point), 0) / Math.min(rounds.length, 20) : 0;
    const lookback_avg_50 = rounds.length > 0 ? rounds.slice(0, 50).reduce((acc, r) => acc + Number(r.crash_point), 0) / Math.min(rounds.length, 50) : 0;
    const cold_streak = rounds.length >= 5 ? rounds.slice(0, 5).every(r => Number(r.crash_point) < 1.5) : false;
    const session_hour_utc = new Date().getUTCHours();
    const hot_hour = [0,1,6,8,12,13,15,17,18,20,21,22,23].includes(session_hour_utc);

    const values = rounds.map(r => ({ crash_point: Number(r.crash_point), created_at: r.created_at }));

    // ── Compute stats immediately ──
    const stats = computeStats(values);
    const timeData = getLKTimeData(new Date(), sleepEnabled);

    // ── Compute AI stability/similarity analyzer ──
    const currentLKHour = timeData.currentLKHour;
    const histHourRounds = await fetchHistoricalHourRounds(currentLKHour);
    const stabilityAnalysis = analyzeStability(values, histHourRounds);

    stats.stabilityAnalysis = stabilityAnalysis;

    const betSignal = computeBetSignal(stats, gameType, timeData);

    const finalStabilityAnalysis = {
      ...stabilityAnalysis,
      holdScore: betSignal.holdScore,
      holdReasons: betSignal.holdReasons,
      holdSignal: betSignal.holdSignal,
    };

    stats.stabilityAnalysis = finalStabilityAnalysis;

    const advisoryTiers = buildAdvisoryTiers(stats, betSignal);

    // Sleep: still write a SKIP prediction so feed never looks "dead"
    if (timeData.isLKSleep && betSignal.strategy === 'SKIP') {
      const summary = buildHumanSummary(stats, betSignal);
      const sleepRow = {
        predicted_risk: 'HIGH',
        confidence: 0,
        summary,
        round_number: nextRoundNumber,
        predicted_multiplier: advisoryTiers.tier_safe,
        should_bet: false,
        strategy: 'SKIP',
        cashout_target: 0,
        recommended_bet_units: 0,
        swing_target: null,
        volatility_phase: betSignal.volatility_phase,
        recommended_stake_pct: 0,
        skip_reason: betSignal.skip_reason,
        strategy_reason: '[v4-balanced] Sleep phase lock',
        ai_model_used: 'sleep-skip',
        tier_safe: advisoryTiers.tier_safe,
        tier_swing: advisoryTiers.tier_swing,
        tier_moon: advisoryTiers.tier_moon,
        skip_round: true,
        stability_analysis: finalStabilityAnalysis,
        instant_crash_risk: stats.instant_crash_risk,
        instant_crash_warning: stats.instant_crash_warning,
      };
      await supabase.from('predictions').upsert(sleepRow, {
        onConflict: 'round_number',
        ignoreDuplicates: false,
      });
      return NextResponse.json({
        ...sleepRow,
        risk: 'HIGH',
        timeData,
        stats,
        ai_failed: false,
        stability_analysis: finalStabilityAnalysis,
      });
    }

    // Cached row: refresh live signal fields + fill null tiers
    if (existingPred) {
      const liveCashout = betSignal.should_bet ? betSignal.cashout_target : 0;
      const tiers = {
        tier_safe: existingPred.tier_safe ?? advisoryTiers.tier_safe,
        tier_swing: existingPred.tier_swing ?? advisoryTiers.tier_swing,
        tier_moon: existingPred.tier_moon ?? advisoryTiers.tier_moon,
      };
      // Backfill null tiers in DB once
      if (existingPred.tier_safe == null || existingPred.tier_swing == null || existingPred.tier_moon == null) {
        await supabase.from('predictions').update(tiers).eq('round_number', nextRoundNumber);
      }
      return NextResponse.json({
        risk: existingPred.predicted_risk,
        confidence: Math.min(
          existingPred.confidence ?? stats.signalConfidence ?? stats.confidence,
          AI_CONFIDENCE_CEIL,
        ),
        summary: buildHumanSummary(stats, betSignal),
        predicted_multiplier: liveCashout || existingPred.predicted_multiplier || tiers.tier_safe,
        long_targets: existingPred.long_targets,
        should_bet: betSignal.should_bet ?? existingPred.should_bet,
        recommended_bet_units: betSignal.recommended_bet_units,
        skip_reason: betSignal.skip_reason ?? existingPred.skip_reason,
        strategy: betSignal.strategy ?? existingPred.strategy,
        cashout_target: liveCashout || existingPred.cashout_target || 0,
        strategy_reason: betSignal.strategy_reason ?? existingPred.strategy_reason ?? 'Based on historical pattern analysis.',
        ai_model_used: existingPred.ai_model_used ?? 'stats-only',
        stats,
        swing_target: betSignal.swing_target ?? existingPred.swing_target,
        volatility_phase: betSignal.volatility_phase ?? existingPred.volatility_phase,
        recommended_stake_pct: betSignal.recommended_stake_pct ?? existingPred.recommended_stake_pct,
        ...tiers,
        timeData,
        ai_failed: (existingPred.ai_model_used ?? 'stats-only') === 'stats-only',
        ai_fallback_reason: (existingPred.ai_model_used ?? 'stats-only') === 'stats-only' ? 'AI timeout — using statistical model only' : undefined,
        stability_analysis: existingPred.stability_analysis || finalStabilityAnalysis,
      });
    }

    // ── Stats-only defaults ──
    let aiRisk        = stats.riskLabel as 'LOW' | 'MEDIUM' | 'HIGH';
    let aiConfidence  = Math.min(stats.signalConfidence || stats.confidence, AI_CONFIDENCE_CEIL);
    let aiSummary     = buildHumanSummary(stats, betSignal);
    let aiPredMultiplier = betSignal.cashout_target > 0
      ? betSignal.cashout_target
      : stats.suggestedCashout;
    const aiLongTargets  = {
      x5:  stats.targets.find((t: any) => t.target === 5.0)?.hitRate  ?? 20,
      x10: stats.targets.find((t: any) => t.target === 10.0)?.hitRate ?? 10,
      x20: stats.targets.find((t: any) => t.target === 20.0)?.hitRate ?? 5,
    };
    let strategyLabel  = betSignal.strategy ?? 'CONSERVATIVE';
    let strategyReason = betSignal.skip_reason ?? betSignal.strategy_reason ?? 'Stats-based signal.';
    let finalBet       = strategyLabel === 'SKIP' ? false : (betSignal.should_bet ?? true);
    let finalCashout   = strategyLabel === 'SKIP' ? 0 : (betSignal.cashout_target ?? stats.suggestedCashout);
    let aiModelUsed    = 'stats-only';

    // ── Wait for AI prediction ──
    const { data: context } = await supabase
      .from('ai_context_window')
      .select('*')
      .maybeSingle();

    const contextVal = context || {
      current_hour_utc: new Date().getUTCHours(),
      avg_crash: lookback_avg_50 || 1.8,
      median_crash: 1.5,
      above_5x_count: 0,
      above_10x_count: 0
    };

    const userMessage = buildPrompt(stats, betSignal, timeData);

    let swingTarget = betSignal.swing_target;
    let volatilityPhase = betSignal.volatility_phase;
    let recommendedStakePct = betSignal.recommended_stake_pct;

    let tierSafe   = advisoryTiers.tier_safe;
    let tierSwing  = advisoryTiers.tier_swing;
    let tierMoon   = advisoryTiers.tier_moon;
    let skipRound  = strategyLabel === 'SKIP';
    let aiColdStreak = cold_streak;

    try {
      // Always call AI (except already handled sleep)
      const aiResponse = await callAI(systemPrompt, userMessage, { stats, betSignal, timeData });
      if (aiResponse) {
        const { result: ai, model } = aiResponse;
        aiModelUsed = model;

        if (typeof ai.confidence === 'number' && ai.confidence >= 0 && ai.confidence <= 100) {
          aiConfidence = Math.min(ai.confidence, AI_CONFIDENCE_CEIL);
        }
        if (typeof ai.reasoning === 'string' && ai.reasoning.length > 5) {
          aiSummary = ai.reasoning;
          strategyReason = (betSignal.skip_reason ? betSignal.skip_reason + ' | ' : '') + 'AI: ' + ai.reasoning;
        }

        if (betSignal.strategy !== 'SKIP') {
          if (typeof ai.tier_safe === 'number' && ai.tier_safe >= 1.0) {
            tierSafe = ai.tier_safe;
            aiPredMultiplier = ai.tier_safe;
            finalCashout = ai.tier_safe;
          }
          if (typeof ai.tier_swing === 'number' && ai.tier_swing >= 1.0) {
            tierSwing = ai.tier_swing;
            swingTarget = ai.tier_swing;
          }
          if (typeof ai.tier_moon === 'number' && ai.tier_moon >= 1.0 && ai.tier_moon <= 3.0) {
            tierMoon = ai.tier_moon;
          }
        }
        if (typeof ai.p5x_chance === 'number' && ai.p5x_chance >= 0 && ai.p5x_chance <= 100) {
          aiLongTargets.x5 = ai.p5x_chance;
        }
        if (typeof ai.p10x_chance === 'number' && ai.p10x_chance >= 0 && ai.p10x_chance <= 100) {
          aiLongTargets.x10 = ai.p10x_chance;
        }
        if (typeof ai.p20x_chance === 'number' && ai.p20x_chance >= 0 && ai.p20x_chance <= 100) {
          aiLongTargets.x20 = ai.p20x_chance;
        }
        if (typeof ai.cold_streak === 'boolean') {
          aiColdStreak = ai.cold_streak;
        }
        if (typeof ai.skip_round === 'boolean') {
          skipRound = ai.skip_round;
        }

        // Hard-lock SKIP — AI cannot upgrade SKIP into a bet
        if (betSignal.strategy !== 'SKIP') {
          if (skipRound) {
            strategyLabel = 'SKIP';
            finalBet = false;
            finalCashout = 0;
            const adv = buildAdvisoryTiers(stats, { ...betSignal, should_bet: false, cashout_target: 0 });
            tierSafe = adv.tier_safe;
            tierSwing = adv.tier_swing;
            tierMoon = adv.tier_moon;
          } else {
            strategyLabel = betSignal.strategy === 'AGGRESSIVE' ? 'AGGRESSIVE' : 'BET_NORMAL';
            finalBet = true;
          }
        }
      }
    } catch (err) {
      console.error('[AI CALL] Error:', err);
    }

    if (finalBet && finalCashout > 0) {
      tierSafe = finalCashout;
      aiPredMultiplier = finalCashout;
    }

    const aiPrediction = {
      predicted_risk:       aiRisk,
      confidence:           aiConfidence,
      summary:              aiSummary,
      round_number:         nextRoundNumber,
      predicted_multiplier: aiPredMultiplier,
      long_targets:         aiLongTargets,
      should_bet:           finalBet,
      skip_reason:          betSignal.skip_reason,
      cashout_target:       finalCashout,
      strategy:             strategyLabel,
      strategy_reason:      strategyReason,
      ai_model_used:        aiModelUsed,
      swing_target:         swingTarget,
      volatility_phase:     volatilityPhase,
      recommended_stake_pct: recommendedStakePct,
      user_timezone:        userTimezone,
      session_hour_utc:     session_hour_utc,
      lookback_avg_20:      lookback_avg_20,
      lookback_avg_50:      lookback_avg_50,
      tier_safe:            tierSafe,
      tier_swing:           tierSwing,
      tier_moon:            tierMoon,
      cold_streak:          aiColdStreak,
      skip_round:           skipRound || !finalBet,
      context_window:       contextVal,
      instant_crash_risk:   stats.instant_crash_risk,
      instant_crash_warning: stats.instant_crash_warning,
      hot_hour:             hot_hour,
      stability_analysis:   finalStabilityAnalysis,
    };

    const { error: insertErr } = await supabase.from('predictions').upsert(aiPrediction, {
      onConflict: 'round_number',
      ignoreDuplicates: false,
    });
    if (insertErr) {
      console.error('[predict] Failed to save prediction:', insertErr);
    }

    return NextResponse.json({
      ...aiPrediction,
      risk: aiPrediction.predicted_risk,
      recommended_bet_units: betSignal.recommended_bet_units,
      stats,
      timeData,
      ai_failed: aiModelUsed === 'stats-only',
      ai_fallback_reason: aiModelUsed === 'stats-only' ? 'AI timeout — using statistical model only' : undefined,
      stability_analysis: finalStabilityAnalysis,
      save_error: insertErr?.message,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message, timeData: getLKTimeData() }, { status: 500 });
  }
}
