import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats, computeBetSignal, buildHumanSummary } from '../../../lib/stats';
import { PEAK_HOURS_UTC, buildPrompt, callAI, getLKTimeData } from '../../../lib/ai';
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
    const prompt = buildPrompt(stats, betSignal, timeData);
    
    let swingTarget = betSignal.swing_target;
    let volatilityPhase = betSignal.volatility_phase;
    let recommendedStakePct = betSignal.recommended_stake_pct;

    try {
      const aiResponse = await callAI(prompt);
      if (aiResponse) {
        const { result: ai, model } = aiResponse;
        aiModelUsed = model;
        
        if (['LOW','MEDIUM','HIGH'].includes(ai.risk)) aiRisk = ai.risk;
        if (typeof ai.confidence === 'number' && ai.confidence >= 0 && ai.confidence <= 100) aiConfidence = Math.min(ai.confidence, 99);
        if (typeof ai.summary === 'string' && ai.summary.length > 5) aiSummary = ai.summary;
        
        // Fix #4: Hard-lock SKIP. AI cannot override a mathematically confirmed SKIP signal.
        if (betSignal.strategy !== 'SKIP') {
          if (typeof ai.cashout_target === 'number' && ai.cashout_target > 1.0 && ai.cashout_target <= 20.0) {
            let targetVal = ai.cashout_target;
            if (targetVal > 2.0) {
              const closestTarget = stats.targets.reduce((prev: any, curr: any) => 
                Math.abs(curr.target - targetVal) < Math.abs(prev.target - targetVal) ? curr : prev
              );
              const hasPositiveEv = closestTarget ? closestTarget.ev > 0 : false;
              const isCalmOrNormal = volatilityPhase === 'CALM' || volatilityPhase === 'NORMAL';
              const allowHighTarget = timeData.isLKPrime && isCalmOrNormal && hasPositiveEv;

              if (!allowHighTarget) {
                swingTarget = targetVal;
                targetVal = 2.0;
              }
            }
            aiPredMultiplier = targetVal;
            finalCashout = targetVal;
          }
          if (['CONSERVATIVE','BALANCED','AGGRESSIVE','SKIP'].includes(ai.strategy)) {
            strategyLabel = ai.strategy === 'BALANCED' ? 'CONSERVATIVE' : ai.strategy;
          }
          if (typeof ai.should_bet === 'boolean') finalBet = ai.should_bet;
        }
        
        if (typeof ai.swing_target === 'number' || ai.swing_target === null) swingTarget = ai.swing_target;
        if (typeof ai.volatility_phase === 'string') volatilityPhase = ai.volatility_phase;
        if (typeof ai.recommended_stake_pct === 'number') recommendedStakePct = ai.recommended_stake_pct;

        if (typeof ai.summary === 'string') {
          strategyReason = (betSignal.skip_reason ? betSignal.skip_reason + ' | ' : '') + 'AI: ' + ai.summary;
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
