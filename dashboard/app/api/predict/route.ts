import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats, computeBetSignal } from '../../../lib/stats';
import { PEAK_HOURS_UTC, buildPrompt, callAI } from '../../../lib/ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Full history fetch — paginated up to 50,000 rounds with timestamps ──
async function fetchRecentRounds() {
  const rounds: { round_number: number; crash_point: number; created_at: string }[] = [];
  const PAGE_SIZE = 1000;
  for (let i = 0; i < 50; i++) {
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

    const values = rounds.map(r => ({ crash_point: Number(r.crash_point), created_at: r.created_at }));

    // ── Compute stats immediately ──
    const stats = computeStats(values);
    const betSignal = computeBetSignal(stats);

    const now = new Date();
    const timeData = {
      currentUTCHour: now.getUTCHours(),
      currentLocalHour: now.getHours(),
      currentAMPM: now.getHours() >= 12 ? 'PM' : 'AM',
      peakHours: PEAK_HOURS_UTC,
    };

    // Return cached pred but with fresh stats
    if (existingPred) {
      return NextResponse.json({
        risk: existingPred.predicted_risk,
        confidence: existingPred.confidence,
        summary: existingPred.summary,
        predicted_multiplier: existingPred.predicted_multiplier,
        long_targets: existingPred.long_targets,
        should_bet: existingPred.should_bet,
        recommended_bet_units: betSignal.recommended_bet_units,
        skip_reason: existingPred.skip_reason,
        strategy: existingPred.strategy,
        cashout_target: existingPred.cashout_target,
        strategy_reason: existingPred.strategy_reason,
        ai_model_used: existingPred.ai_model_used ?? 'stats-only',
        stats,
        swing_target: existingPred.swing_target,
        volatility_phase: existingPred.volatility_phase ?? betSignal.volatility_phase,
        recommended_stake_pct: existingPred.recommended_stake_pct ?? betSignal.recommended_stake_pct,
      });
    }

    // ── Stats-only defaults ──
    let aiRisk        = stats.riskLabel as 'LOW' | 'MEDIUM' | 'HIGH';
    let aiConfidence  = Math.min(stats.confidence, 85); // cap at 85 without AI
    let aiSummary     = `${stats.count} rounds analyzed. Risk: ${stats.riskScore}/100. EMA: ${stats.ema}x. ${betSignal.should_bet ? 'BET signal.' : 'SKIP signal.'}`;
    let aiPredMultiplier = stats.p99SafeCashout; // anchor to 99% as default
    const aiLongTargets  = {
      x5:  stats.targets.find((t: any) => t.target === 5.0)?.hitRate  ?? 20,
      x10: stats.targets.find((t: any) => t.target === 10.0)?.hitRate ?? 10,
      x20: stats.targets.find((t: any) => t.target === 20.0)?.hitRate ?? 5,
    };
    let strategyLabel  = betSignal.strategy;
    let strategyReason = betSignal.skip_reason ?? 'Stats-only baseline.';
    let finalBet       = strategyLabel === 'SKIP' ? false : betSignal.should_bet;
    let finalCashout   = strategyLabel === 'SKIP' ? 0     : betSignal.cashout_target;
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
        if (typeof ai.confidence === 'number' && ai.confidence >= 0 && ai.confidence <= 100) aiConfidence = ai.confidence;
        if (typeof ai.summary === 'string' && ai.summary.length > 5) aiSummary = ai.summary;
        
        // Fix #4: Hard-lock SKIP. AI cannot override a mathematically confirmed SKIP signal.
        if (betSignal.strategy !== 'SKIP') {
          if (typeof ai.cashout_target === 'number' && ai.cashout_target > 1.0 && ai.cashout_target <= 20.0) {
            aiPredMultiplier = ai.cashout_target;
            finalCashout = ai.cashout_target;
          }
          if (['CONSERVATIVE','BALANCED','AGGRESSIVE','SKIP'].includes(ai.strategy)) strategyLabel = ai.strategy;
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
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
