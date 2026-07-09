import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats, computeBetSignal, buildHumanSummary } from '../../../lib/stats';
import { PEAK_HOURS_UTC, buildPrompt, callAI, getLKTimeData, systemPrompt } from '../../../lib/ai';
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


// ─── Main handler ──────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
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
    const timeData = getLKTimeData();
    const betSignal = computeBetSignal(stats, gameType, timeData);

    // If Sleep phase and strategy is SKIP, do not call AI or cache to DB
    if (timeData.isLKSleep && betSignal.strategy === 'SKIP') {
      const summary = buildHumanSummary(stats, betSignal);
      const prediction = {
        risk: 'HIGH',
        predicted_risk: 'HIGH', // for fallback compat
        confidence: 0, // Engine paused, so confidence is 0
        summary,
        should_bet: false,
        strategy: 'SKIP',
        cashout_target: 0,
        recommended_bet_units: 0,
        swing_target: null,
        volatility_phase: betSignal.volatility_phase,
        recommended_stake_pct: 0,
        timeData,
        stats,
        skip_reason: betSignal.skip_reason,
        ai_failed: false,
      };
      return NextResponse.json(prediction);
    }

    // Return cached pred but with fresh stats — fill in any null fields with fresh betSignal
    if (existingPred) {
      return NextResponse.json({
        risk: existingPred.predicted_risk,
        confidence: Math.min(existingPred.confidence ?? Math.min(stats.confidence, 85), 99),
        // Always regenerate summary so it reflects current live stats and looks human
        summary: buildHumanSummary(stats, betSignal),
        predicted_multiplier: existingPred.predicted_multiplier ?? betSignal.cashout_target,
        long_targets: existingPred.long_targets,
        should_bet: betSignal.should_bet ?? existingPred.should_bet,
        recommended_bet_units: betSignal.recommended_bet_units,
        skip_reason: existingPred.skip_reason ?? betSignal.skip_reason,
        strategy: betSignal.strategy ?? existingPred.strategy,
        cashout_target: betSignal.cashout_target ?? existingPred.cashout_target,
        strategy_reason: existingPred.strategy_reason ?? betSignal.strategy_reason ?? 'Based on historical pattern analysis.',
        ai_model_used: existingPred.ai_model_used ?? 'stats-only',
        stats,
        swing_target: existingPred.swing_target ?? betSignal.swing_target,
        volatility_phase: existingPred.volatility_phase ?? betSignal.volatility_phase,
        recommended_stake_pct: existingPred.recommended_stake_pct ?? betSignal.recommended_stake_pct,
        timeData,
        ai_failed: (existingPred.ai_model_used ?? 'stats-only') === 'stats-only',
        ai_fallback_reason: (existingPred.ai_model_used ?? 'stats-only') === 'stats-only' ? 'AI timeout — using statistical model only' : undefined,
      });
    }

    // ── Stats-only defaults ──
    let aiRisk        = stats.riskLabel as 'LOW' | 'MEDIUM' | 'HIGH';
    let aiConfidence  = Math.min(stats.confidence, 85);
    let aiSummary     = buildHumanSummary(stats, betSignal);
    let aiPredMultiplier = betSignal.cashout_target ?? stats.p90SafeCashout;
    const aiLongTargets  = {
      x5:  stats.targets.find((t: any) => t.target === 5.0)?.hitRate  ?? 20,
      x10: stats.targets.find((t: any) => t.target === 10.0)?.hitRate ?? 10,
      x20: stats.targets.find((t: any) => t.target === 20.0)?.hitRate ?? 5,
    };
    let strategyLabel  = betSignal.strategy ?? 'CONSERVATIVE';
    let strategyReason = betSignal.skip_reason ?? betSignal.strategy_reason ?? 'Stats-based signal.';
    let finalBet       = strategyLabel === 'SKIP' ? false : (betSignal.should_bet ?? true);
    let finalCashout   = strategyLabel === 'SKIP' ? 0 : (betSignal.cashout_target ?? stats.p90SafeCashout);
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

    const userMessage = `
Current UTC hour: ${contextVal.current_hour_utc}
Last 50 rounds avg: ${contextVal.avg_crash}
Last 50 rounds median: ${contextVal.median_crash}  
Rounds above 5x in last 50: ${contextVal.above_5x_count}
Rounds above 10x in last 50: ${contextVal.above_10x_count}

Now give me the 3-tier prediction JSON.
`;

    let swingTarget = betSignal.swing_target;
    let volatilityPhase = betSignal.volatility_phase;
    let recommendedStakePct = betSignal.recommended_stake_pct;

    let tierSafe   = Math.max(1.8, finalCashout);
    let tierSwing  = swingTarget || 3.5;
    let tierMoon   = aiLongTargets.x10 || 8.0;
    let skipRound  = strategyLabel === 'SKIP';
    let aiColdStreak = cold_streak;

    try {
      const aiResponse = await callAI(systemPrompt, userMessage);
      if (aiResponse) {
        const { result: ai, model } = aiResponse;
        aiModelUsed = model;
        
        if (typeof ai.confidence === 'number' && ai.confidence >= 0 && ai.confidence <= 100) {
          aiConfidence = Math.min(ai.confidence, 75); // max 75, never 100
        }
        if (typeof ai.reasoning === 'string' && ai.reasoning.length > 5) {
          aiSummary = ai.reasoning;
          strategyReason = (betSignal.skip_reason ? betSignal.skip_reason + ' | ' : '') + 'AI: ' + ai.reasoning;
        }
        
        if (typeof ai.tier_safe === 'number' && ai.tier_safe >= 1.0) {
          tierSafe = ai.tier_safe;
          aiPredMultiplier = ai.tier_safe;
          finalCashout = ai.tier_safe;
        }
        if (typeof ai.tier_swing === 'number' && ai.tier_swing >= 1.0) {
          tierSwing = ai.tier_swing;
          swingTarget = ai.tier_swing;
        }
        if (typeof ai.tier_moon === 'number' && ai.tier_moon >= 1.0) {
          tierMoon = ai.tier_moon;
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

        // Fix #4: Hard-lock SKIP. AI cannot override a mathematically confirmed SKIP signal.
        if (betSignal.strategy !== 'SKIP') {
          if (skipRound) {
            strategyLabel = 'SKIP';
            finalBet = false;
            finalCashout = 0;
          } else {
            strategyLabel = 'BET_NORMAL';
            finalBet = true;
          }
        }
      }
    } catch (err) {
      console.error('[AI CALL] Error:', err);
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
      skip_round:           skipRound,
      context_window:       contextVal,
      instant_crash_risk:   stats.instant_crash_risk,
      instant_crash_warning: stats.instant_crash_warning,
      hot_hour:             hot_hour,
    };

    await supabase.from('predictions').insert(aiPrediction);

    return NextResponse.json({
      ...aiPrediction,
      risk: aiPrediction.predicted_risk, // map for frontend expectation
      recommended_bet_units: betSignal.recommended_bet_units,
      stats,
      timeData,
      ai_failed: aiModelUsed === 'stats-only',
      ai_fallback_reason: aiModelUsed === 'stats-only' ? 'AI timeout — using statistical model only' : undefined,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message, timeData: getLKTimeData() }, { status: 500 });
  }
}
