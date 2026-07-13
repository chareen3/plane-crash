import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats, gradePrediction, computeBetSignal, buildHumanSummary, analyzeStability, buildAdvisoryTiers } from '../../../lib/stats';
import { PEAK_HOURS_UTC, buildPrompt, callAI, getLKTimeData, systemPrompt, AI_CONFIDENCE_CEIL } from '../../../lib/ai';
import { getSriLankaTimeSlot, getPrediction } from '../../../lib/prediction';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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




export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { round, summary } = body;

    if (!round || typeof round.crash_point !== 'number') {
      return NextResponse.json({ error: 'Valid round with crash_point required.' }, { status: 400 });
    }

    // Fetch latest round number in database to assign a guaranteed sequential round number
    const { data: maxRoundData, error: maxRoundErr } = await supabase
      .from('crash_rounds')
      .select('round_number')
      .order('round_number', { ascending: false })
      .limit(1);

    if (maxRoundErr) {
      console.error('Failed to fetch max round number:', maxRoundErr);
    }

    const latestRoundNumber = maxRoundData && maxRoundData.length > 0 ? Number(maxRoundData[0].round_number) : 0;
    const roundNumber = typeof round.round_number === 'number' ? round.round_number : (latestRoundNumber + 1);
    const crashPoint = Number(round.crash_point);

    // Fetch last 30 rounds for telemetry calculations
    const { data: lastRounds, error: lastRoundsErr } = await supabase
      .from('crash_rounds')
      .select('crash_point, created_at, duration_ms')
      .order('created_at', { ascending: false })
      .limit(30);

    if (lastRoundsErr) {
      console.error('Failed to fetch last rounds for telemetry:', lastRoundsErr);
    }

    const lastRoundsData = lastRounds || [];

    // Calculate gap_ms
    let gapMs: number | null = null;
    if (lastRoundsData.length > 0) {
      const prevRound = lastRoundsData[0];
      const thisDuration = round.duration_ms || (summary ? summary.duration_ms : 0) || 0;
      const thisCreatedAt = new Date(round.created_at || new Date()).getTime();
      const prevCreatedAt = new Date(prevRound.created_at).getTime();
      gapMs = Math.max(0, (thisCreatedAt - thisDuration) - prevCreatedAt);
    }

    // Calculate tier
    let tier = 'INSTANT';
    if (crashPoint >= 10.0) tier = 'MOON';
    else if (crashPoint >= 5.0) tier = 'HIGH';
    else if (crashPoint >= 2.0) tier = 'MED';
    else if (crashPoint >= 1.15) tier = 'LOW';

    // Calculate streak details
    let streakType = 'MIXED';
    let streakLength = 0;
    if (lastRoundsData.length > 0) {
      const getStreakCat = (v: number) => {
        if (v < 2.0) return 'LOW';
        if (v < 5.0) return 'MED';
        return 'HIGH';
      };
      const firstCat = getStreakCat(Number(lastRoundsData[0].crash_point));
      streakType = firstCat;
      for (const r of lastRoundsData) {
        if (getStreakCat(Number(r.crash_point)) === firstCat) {
          streakLength++;
        } else {
          break;
        }
      }
    }

    const prev5Crashes = lastRoundsData.slice(0, 5).map(r => Number(r.crash_point));

    // Calculate rolling_win_rate_30
    let rollingWinRate30 = 0;
    if (lastRoundsData.length > 0) {
      const wins = lastRoundsData.filter(r => Number(r.crash_point) >= 1.5).length;
      rollingWinRate30 = Number(((wins / lastRoundsData.length) * 100).toFixed(2));
    }

    // Calculate rounds_since_last_moon
    let roundsSinceLastMoon = 0;
    if (crashPoint < 10.0) {
      const { data: lastMoon } = await supabase
        .from('crash_rounds')
        .select('round_number')
        .gte('crash_point', 10.0)
        .order('round_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lastMoon) {
        roundsSinceLastMoon = roundNumber - lastMoon.round_number;
      }
    }

    // 1. Insert completed round details into crash_rounds
    const { data: insertedRound, error: roundErr } = await supabase
      .from('crash_rounds')
      .insert({
        round_number: roundNumber,
        crash_point: crashPoint,
        created_at: round.created_at || new Date().toISOString(),
        duration_ms: round.duration_ms || (summary ? summary.duration_ms : null),
        source: round.source || 'extension',
        round_hash: round.round_hash || null,
        gap_ms: gapMs,
        tier: tier,
        streak_type: streakType,
        streak_length: streakLength,
        prev_5_crashes: prev5Crashes,
        rolling_win_rate_30: rollingWinRate30,
        player_count: round.player_count || null,
        total_bet_volume: round.total_bet_volume || null,
        rounds_since_last_moon: roundsSinceLastMoon,
      })
      .select()
      .single();

    if (roundErr) {
      console.error('Failed to insert round:', roundErr);
      return NextResponse.json({ error: roundErr.message }, { status: 500 });
    }

    // 2. Insert round summary if provided
    if (summary) {
      const { error: summaryErr } = await supabase
        .from('round_summaries')
        .upsert({
          round_number: roundNumber,
          started_at: summary.started_at,
          ended_at: summary.ended_at,
          final_multiplier: Number(summary.final_multiplier),
          final_multiplier_text: summary.final_multiplier_text,
          duration_ms: summary.duration_ms,
          event_count: summary.event_count,
          history_snapshot: summary.history_snapshot,
          notes: summary.notes
        }, { onConflict: 'round_number' });

      if (summaryErr) {
        console.error('Failed to insert round summary:', summaryErr);
      }
    }

    // 3. Grade the previous prediction for this round
    let wasCorrect = null;
    const { data: pred, error: fetchErr } = await supabase
      .from('predictions')
      .select('id, should_bet, tier_swing, swing_target, cashout_target, predicted_multiplier')
      .eq('round_number', roundNumber)
      .is('was_correct', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fetchErr && pred) {
      const isSkip = pred.should_bet === false;
      if (isSkip) {
        wasCorrect = crashPoint < 1.5;
      } else {
        // Grade against tier_safe (the conservative exit target, ~1.10x)
        // tier_swing is the "moonshot" target — do NOT use it for grading success
        const target = Number(
          pred.cashout_target ||
          pred.predicted_multiplier ||
          1.10
        );
        wasCorrect = crashPoint >= target;
      }

      const { error: updateErr } = await supabase
        .from('predictions')
        .update({ actual_crash_point: crashPoint, was_correct: wasCorrect })
        .eq('id', pred.id);
      if (updateErr) {
        console.error('Failed to update prediction grading:', updateErr);
      }
    }

    // Fetch settings from database
    const { data: dbSettings } = await supabase.from('game_settings').select('key, value');
    const settings = Object.fromEntries((dbSettings ?? []).map(r => [r.key, r.value]));
    const isMaintenance = settings.maintenance_mode === true || settings.maintenance_mode === 'true';
    const sleepEnabled = settings.sleep_phase_enabled !== false && settings.sleep_phase_enabled !== 'false';

    if (isMaintenance) {
      const nextRoundNumber = roundNumber + 1;
      const { data: insertedPred } = await supabase
        .from('predictions')
        .upsert({
          predicted_risk:       'HIGH',
          confidence:           0,
          summary:              "System is under maintenance. Predictions and signals are paused.",
          round_number:         nextRoundNumber,
          predicted_multiplier: 0,
          long_targets:         { x5: 0, x10: 0, x20: 0 },
          should_bet:           false,
          skip_reason:          'MAINTENANCE MODE ACTIVE',
          cashout_target:       0,
          strategy:             'SKIP',
          strategy_reason:      'MAINTENANCE MODE ACTIVE',
          ai_model_used:        'maintenance',
          swing_target:         null,
          volatility_phase:     'NORMAL',
          recommended_stake_pct: 0,
          tier_safe:            1.10,
          tier_swing:           3.5,
          tier_moon:            8.0,
          cold_streak:          false,
          skip_round:           true,
          context_window:       {},
          instant_crash_risk:   0,
          instant_crash_warning: 'Maintenance mode.',
          stability_analysis:   { status: 'INSUFFICIENT_DATA', similarity_score: 0, stability_index: 0, matched_patterns_count: 0, historical_win_rate_1_5x: 0, holdScore: 0, holdReasons: [], holdSignal: false }
        }, { onConflict: 'round_number', ignoreDuplicates: false })
        .select()
        .maybeSingle();

      return NextResponse.json({
        success: true,
        round: insertedRound,
        stats: null,
        prediction: insertedPred,
        timeData: getLKTimeData(new Date(), sleepEnabled),
      });
    }

    // 4. Fetch the entire database history (up to 50,000 rounds) with timestamps
    let historyRounds: { crash_point: number; created_at: string }[] = [];
    const PAGE_SIZE = 1000;
    for (let i = 0; i < 5; i++) {
      const { data: pageData, error: pageErr } = await supabase
        .from('crash_rounds')
        .select('crash_point, created_at')
        .order('created_at', { ascending: false })
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
      
      if (pageErr || !pageData || pageData.length === 0) break;
      historyRounds.push(...(pageData as { crash_point: number; created_at: string }[]));
      if (pageData.length < PAGE_SIZE) break;
    }


    if (historyRounds.length < 3) {
      // Return early if not enough data to predict
      return NextResponse.json({
        success: true,
        round: insertedRound,
        stats: null,
        prediction: null
      });
    }

    const values = historyRounds.map((r: any) => ({ crash_point: Number(r.crash_point), created_at: r.created_at }));

    // Time context
    const timeData = getLKTimeData(new Date(), sleepEnabled);

    const gameType = body.gameType || '1xbet';
    const stats = computeStats(values);

    const currentLKHour = timeData.currentLKHour;
    const histHourRounds = await fetchHistoricalHourRounds(currentLKHour);
    const stabilityAnalysis = analyzeStability(values, histHourRounds);

    const betSignal = computeBetSignal(stats, gameType, timeData);

    const finalStabilityAnalysis = {
      ...stabilityAnalysis,
      holdScore: betSignal.holdScore,
      holdReasons: betSignal.holdReasons,
      holdSignal: betSignal.holdSignal,
    };

    stats.stabilityAnalysis = finalStabilityAnalysis;

    const nextRoundNumber = roundNumber + 1;

    let aiRisk = stats.riskLabel as 'LOW' | 'MEDIUM' | 'HIGH';
    // Varying confidence from signal engine (not stuck at 75/85)
    let aiConfidence = Math.min(stats.signalConfidence || stats.confidence, AI_CONFIDENCE_CEIL);
    let aiSummary = buildHumanSummary(stats, betSignal);
    let aiPredMultiplier = betSignal.cashout_target > 0
      ? betSignal.cashout_target
      : stats.suggestedCashout;
    const aiLongTargets = {
      x5:  stats.targets.find(t => t.target === 5.0)?.hitRate ?? 20,
      x10: stats.targets.find(t => t.target === 10.0)?.hitRate ?? 10,
      x20: stats.targets.find(t => t.target === 20.0)?.hitRate ?? 5
    };
    let strategyLabel = betSignal.strategy;
    let strategyReason = betSignal.skip_reason ?? betSignal.strategy_reason ?? 'Stats-only baseline.';
    let finalBet = strategyLabel === 'SKIP' ? false : betSignal.should_bet;
    let finalCashout = strategyLabel === 'SKIP' ? 0 : betSignal.cashout_target;
    let aiModelUsed = 'stats-only';

    // ── Wait for AI prediction ──
    const { data: context } = await supabase
      .from('ai_context_window')
      .select('*')
      .maybeSingle();

    const contextVal = context || {
      current_hour_utc: new Date().getUTCHours(),
      avg_crash: 1.8,
      median_crash: 1.5,
      above_5x_count: 0,
      above_10x_count: 0
    };

    const userMessage = buildPrompt(stats, betSignal, timeData);

    const cold_streak = values.length >= 5 ? values.slice(0, 5).every(v => v.crash_point < 1.5) : false;
    let swingTarget = betSignal.swing_target;
    let volatilityPhase = betSignal.volatility_phase;
    let recommendedStakePct = betSignal.recommended_stake_pct;

    // Always populate advisory tiers from stats (never hit-rate % as multiplier, never null)
    let { tier_safe: tierSafe, tier_swing: tierSwing, tier_moon: tierMoon } =
      buildAdvisoryTiers(stats, betSignal);
    let skipRound  = strategyLabel === 'SKIP';
    let aiColdStreak = cold_streak;

    // v4: always call AI except sleep (maintenance already returned). SKIP no longer blocks AI.
    const skipAI = timeData.isLKSleep;
    let aiResponse = null;

    if (!skipAI) {
      const aiCallPromise = callAI(systemPrompt, userMessage, { stats, betSignal, timeData });
      aiResponse = await Promise.race([
        aiCallPromise,
        new Promise<null>(resolve => setTimeout(() => resolve(null), 15000)),
      ]);
    }

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

      // AI may refine tiers when BET; on SKIP keep stats advisory tiers (enforce may zero AI JSON)
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

      // Hard-lock SKIP. AI cannot override a mathematically confirmed SKIP into a bet.
      if (betSignal.strategy !== 'SKIP') {
        if (skipRound) {
          strategyLabel = 'SKIP';
          finalBet = false;
          finalCashout = 0;
          // Keep advisory tiers for UI/analytics
          const advisory = buildAdvisoryTiers(stats, { ...betSignal, should_bet: false, cashout_target: 0 });
          tierSafe = advisory.tier_safe;
          tierSwing = advisory.tier_swing;
          tierMoon = advisory.tier_moon;
        } else {
          strategyLabel = betSignal.strategy === 'AGGRESSIVE' ? 'AGGRESSIVE' : 'BET_NORMAL';
          finalBet = true;
        }
      }
    }

    // Ensure tiers never null/zero for analytics when we have stats
    if (!tierSafe || tierSafe < 1.0) {
      const advisory = buildAdvisoryTiers(stats, betSignal);
      tierSafe = advisory.tier_safe;
      tierSwing = advisory.tier_swing;
      tierMoon = advisory.tier_moon;
    }
    if (finalBet && finalCashout > 0) {
      tierSafe = finalCashout;
      aiPredMultiplier = finalCashout;
    }

    // 6. Save the next prediction to Supabase
    const { data: insertedPred, error: predErr } = await supabase
      .from('predictions')
      .upsert({
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
        tier_safe:            tierSafe,
        tier_swing:           tierSwing,
        tier_moon:            tierMoon,
        cold_streak:          aiColdStreak,
        skip_round:           skipRound,
        context_window:       contextVal,
        instant_crash_risk:   stats.instant_crash_risk,
        instant_crash_warning: stats.instant_crash_warning,
        stability_analysis:   finalStabilityAnalysis,
      }, { onConflict: 'round_number', ignoreDuplicates: false })
      .select()
      .maybeSingle();

    if (predErr) {
      console.error('Failed to save prediction:', predErr);
    }

    return NextResponse.json({
      success: true,
      round: insertedRound,
      stats,
      prediction: insertedPred ? {
        ...insertedPred,
      } : {
        predicted_risk: aiRisk,
        confidence: aiConfidence,
        summary: aiSummary,
        round_number: nextRoundNumber,
        predicted_multiplier: aiPredMultiplier,
        long_targets: aiLongTargets,
        should_bet: finalBet,
        recommended_bet_units: betSignal.recommended_bet_units,
        skip_reason: betSignal.skip_reason,
        strategy: strategyLabel,
        cashout_target: finalCashout,
        strategy_reason: strategyReason,
        ai_model_used: aiModelUsed,
        swing_target: swingTarget,
        volatility_phase: volatilityPhase,
        recommended_stake_pct: recommendedStakePct,
        tier_safe: tierSafe,
        tier_swing: tierSwing,
        tier_moon: tierMoon,
        cold_streak: aiColdStreak,
        skip_round: skipRound,
        context_window: contextVal,
        instant_crash_risk: stats.instant_crash_risk,
        instant_crash_warning: stats.instant_crash_warning,
        stability_analysis: finalStabilityAnalysis,
      },
      timeData,
    });

  } catch (err: any) {
    console.error('API /rounds error:', err);
    return NextResponse.json({ error: err.message, timeData: getLKTimeData() }, { status: 500 });
  }
}
