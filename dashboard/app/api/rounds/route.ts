import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats, gradePrediction, computeBetSignal } from '../../../lib/stats';
import { PEAK_HOURS_UTC, buildPrompt, callAI } from '../../../lib/ai';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);




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

    // 1. Insert completed round details into crash_rounds
    const { data: insertedRound, error: roundErr } = await supabase
      .from('crash_rounds')
      .insert({
        round_number: roundNumber,
        crash_point: crashPoint,
        created_at: round.created_at || new Date().toISOString()
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
      .select('id, predicted_risk')
      .eq('round_number', roundNumber)
      .is('was_correct', null)
      .limit(1)
      .maybeSingle();

    if (!fetchErr && pred) {
      wasCorrect = gradePrediction(
        pred.predicted_risk as 'LOW' | 'MEDIUM' | 'HIGH',
        crashPoint
      );

      const { error: updateErr } = await supabase
        .from('predictions')
        .update({ actual_crash_point: crashPoint, was_correct: wasCorrect })
        .eq('id', pred.id);
      if (updateErr) {
        console.error('Failed to update prediction grading:', updateErr);
      }
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

    // Compute complete stats for recommendations across the entire dataset (no slice!)
    const gameType = body.gameType || '1xbet';
    const stats = computeStats(values);
    const betSignal = computeBetSignal(stats, gameType);
    const nextRoundNumber = roundNumber + 1;

    // Time context
    const now = new Date();
    const timeData = {
      currentUTCHour: now.getUTCHours(),
      currentLocalHour: now.getHours(),
      currentAMPM: now.getHours() >= 12 ? 'PM' : 'AM',
      peakHours: PEAK_HOURS_UTC,
    };

    // Stats-only fallbacks
    let aiRisk = stats.riskLabel as 'LOW' | 'MEDIUM' | 'HIGH';
    let aiConfidence = Math.min(stats.confidence, 85);
    let aiSummary = `${stats.count} rounds analyzed. Risk: ${stats.riskScore}/100. EMA: ${stats.ema}x. ${betSignal.should_bet ? 'BET signal.' : 'SKIP signal.'}`;
    let aiPredMultiplier = stats.p99SafeCashout;
    const aiLongTargets = {
      x5:  stats.targets.find(t => t.target === 5.0)?.hitRate ?? 20,
      x10: stats.targets.find(t => t.target === 10.0)?.hitRate ?? 10,
      x20: stats.targets.find(t => t.target === 20.0)?.hitRate ?? 5
    };
    let strategyLabel = betSignal.strategy;
    let strategyReason = betSignal.skip_reason ?? 'Stats-only baseline.';
    let finalBet = strategyLabel === 'SKIP' ? false : betSignal.should_bet;
    let finalCashout = strategyLabel === 'SKIP' ? 0 : betSignal.cashout_target;
    let aiModelUsed = 'stats-only';

    // Parallel AI call
    const prompt = buildPrompt(stats, betSignal, timeData);
    const aiCallPromise = callAI(prompt);

    const aiResponse = await Promise.race([
      aiCallPromise,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 4000)),
    ]);

    let swingTarget = betSignal.swing_target;
    let volatilityPhase = betSignal.volatility_phase;
    let recommendedStakePct = betSignal.recommended_stake_pct;

    if (aiResponse) {
      const { result: ai, model } = aiResponse;
      aiModelUsed = model;

      if (['LOW','MEDIUM','HIGH'].includes(ai.risk))                              aiRisk = ai.risk;
      if (typeof ai.confidence === 'number' && ai.confidence >= 0 && ai.confidence <= 100) aiConfidence = ai.confidence;
      if (typeof ai.summary === 'string' && ai.summary.length > 5)                aiSummary = ai.summary;

      // Fix #4: Hard-lock SKIP. AI cannot override a mathematically confirmed SKIP signal.
      if (betSignal.strategy !== 'SKIP') {
        if (typeof ai.cashout_target === 'number' && ai.cashout_target > 1.0 && ai.cashout_target <= 20.0) {
          aiPredMultiplier = ai.cashout_target;
          finalCashout     = ai.cashout_target;
        }
        if (['CONSERVATIVE','BALANCED','AGGRESSIVE','SKIP'].includes(ai.strategy))  strategyLabel = ai.strategy;
        if (typeof ai.should_bet === 'boolean')                                      finalBet = ai.should_bet;
      }

      if (typeof ai.swing_target === 'number' || ai.swing_target === null)        swingTarget = ai.swing_target;
      if (typeof ai.volatility_phase === 'string')                                volatilityPhase = ai.volatility_phase;
      if (typeof ai.recommended_stake_pct === 'number')                           recommendedStakePct = ai.recommended_stake_pct;
      if (typeof ai.summary === 'string') {
        strategyReason = (betSignal.skip_reason ? betSignal.skip_reason + ' | ' : '') + 'AI: ' + ai.summary;
      }
    }

    // 6. Save the next prediction to Supabase
    const { data: insertedPred, error: predErr } = await supabase
      .from('predictions')
      .insert({
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
      })
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
      }
    });

  } catch (err: any) {
    console.error('API /rounds error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
