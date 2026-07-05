import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats } from '../../../lib/stats';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// AI models removed for pure statistical confidence

// ─── Bet signal logic ──────────────────────────────────────────────────────
function computeBetSignal(stats: any): {
  should_bet: boolean;
  skip_reason: string | null;
  strategy: string;
  cashout_target: number;
} {
  const reasons: string[] = [];

  if (stats.currentLowStreak >= 4) reasons.push(`${stats.currentLowStreak} consecutive <2x rounds`);
  if (stats.riskScore >= 72) reasons.push(`risk score ${stats.riskScore}/100`);
  if (stats.trend === 'falling' && stats.recentMean < 1.8) reasons.push('falling trend below 1.8x avg');
  if (stats.pUnder2 > 62) reasons.push(`${stats.pUnder2}% chance under 2x`);

  if (reasons.length > 0) {
    return { should_bet: false, skip_reason: reasons.join(' · '), strategy: 'SKIP', cashout_target: 0 };
  }

  let strategy = 'CONSERVATIVE';
  let cashout_target = stats.conservativeCashout;

  if (stats.currentHighStreak >= 3 && stats.trend === 'rising') {
    strategy = 'AGGRESSIVE';
    cashout_target = stats.aggressiveCashout;
  } else if (stats.riskScore < 35 && stats.trend !== 'falling') {
    strategy = 'BALANCED';
    cashout_target = stats.p70SafeCashout;
  }

  return { should_bet: true, skip_reason: null, strategy, cashout_target };
}

// Prompt builder removed

// ─── Main handler ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    let rounds = [];
    const PAGE_SIZE = 1000;
    for (let i = 0; i < 50; i++) {
      const { data: pageData, error: pageErr } = await supabase
        .from('crash_rounds')
        .select('*')
        .order('created_at', { ascending: false })
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
      
      if (pageErr || !pageData || pageData.length === 0) break;
      rounds.push(...pageData);
      if (pageData.length < PAGE_SIZE) break;
    }

    if (rounds.length < 3)
      return NextResponse.json({ error: 'Need 3+ rounds.' });

    const lastRoundNumber = rounds[0]?.round_number ?? 0;
    const nextRoundNumber = lastRoundNumber + 1;

    const { data: existingPred } = await supabase
      .from('predictions')
      .select('*')
      .eq('round_number', nextRoundNumber)
      .maybeSingle();

    const values = rounds.map(r => Number(r.crash_point));
    const stats = computeStats(values);

    if (existingPred) {
      return NextResponse.json({
        risk: existingPred.predicted_risk,
        confidence: existingPred.confidence,
        summary: existingPred.summary,
        predicted_multiplier: existingPred.predicted_multiplier,
        long_targets: existingPred.long_targets,
        should_bet: existingPred.should_bet,
        skip_reason: existingPred.skip_reason,
        strategy: existingPred.strategy,
        cashout_target: existingPred.cashout_target,
        strategy_reason: existingPred.strategy_reason,
        stats,
      });
    }

    const betSignal = computeBetSignal(stats);
    let aiRisk = stats.riskLabel as 'LOW' | 'MEDIUM' | 'HIGH';
    let aiConfidence = stats.confidence;
    let aiSummary = `${stats.count} rounds analyzed. Risk score: ${stats.riskScore}/100. ${betSignal.should_bet ? 'Signal: BET.' : 'Signal: SKIP.'}`;
    let aiPredMultiplier = stats.suggestedCashout;
    let aiLongTargets = {
      x5:  stats.targets.find((t: any) => t.target === 5.0)?.hitRate ?? 20,
      x10: stats.targets.find((t: any) => t.target === 10.0)?.hitRate ?? 10,
      x20: stats.targets.find((t: any) => t.target === 20.0)?.hitRate ?? 5,
    };
    let strategyLabel = betSignal.strategy;
    let strategyReason = betSignal.skip_reason ?? 'Stats-only fallback.';
    let aiModelUsed = 'stats-only';

    const finalBet = strategyLabel === 'SKIP' ? false : betSignal.should_bet;
    const finalCashout = strategyLabel === 'SKIP' ? 0 : betSignal.cashout_target;

    await supabase.from('predictions').insert({
      predicted_risk: aiRisk,
      confidence: aiConfidence,
      summary: aiSummary,
      round_number: nextRoundNumber,
      predicted_multiplier: aiPredMultiplier,
      long_targets: aiLongTargets
    });

    return NextResponse.json({
      risk: aiRisk,
      confidence: aiConfidence,
      summary: aiSummary,
      predicted_multiplier: aiPredMultiplier,
      long_targets: aiLongTargets,
      should_bet: finalBet,
      skip_reason: betSignal.skip_reason,
      strategy: strategyLabel,
      cashout_target: finalCashout,
      strategy_reason: strategyReason,
      stats,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
