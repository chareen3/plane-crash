import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { gradePrediction } from '../../../lib/stats';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { actualCrashPoint, roundNumber } = await request.json();

    if (typeof actualCrashPoint !== 'number') {
      return NextResponse.json({ error: 'actualCrashPoint required' }, { status: 400 });
    }

    // Find the prediction for this round that hasn't been graded yet
    let query = supabase
      .from('predictions')
      .select('id, predicted_risk, should_bet, cashout_target, predicted_multiplier')
      .is('was_correct', null);
    
    if (typeof roundNumber === 'number') {
      query = query.eq('round_number', roundNumber);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: pred, error: fetchErr } = await query.limit(1).maybeSingle();

    if (fetchErr || !pred) {
      // No prediction for this round / ungraded — nothing to grade
      return NextResponse.json({ graded: false });
    }

    const isSkip = pred.should_bet === false;
    let wasCorrect = false;

    if (isSkip) {
      // Correctly skipped if it crashed low (< 1.5x)
      wasCorrect = actualCrashPoint < 1.5;
    } else {
      // Correctly bet if it reached or exceeded our cashout target
      const target = Number(pred.cashout_target || pred.predicted_multiplier || 1.10);
      wasCorrect = actualCrashPoint >= target;
    }

    // Update with the actual result
    await supabase
      .from('predictions')
      .update({ actual_crash_point: actualCrashPoint, was_correct: wasCorrect })
      .eq('id', pred.id);

    // Compute updated win rate stats (only active bets count for the accuracy winrate)
    const { data: allGraded } = await supabase
      .from('predictions')
      .select('was_correct, should_bet')
      .not('was_correct', 'is', null);

    const activeBets = allGraded?.filter(p => p.should_bet !== false) ?? [];
    const total = activeBets.length;
    const correct = activeBets.filter(p => p.was_correct).length;
    const winRate = total > 0 ? Math.round((correct / total) * 100) : 0;

    return NextResponse.json({ graded: true, wasCorrect, winRate, total, correct });

  } catch (err: any) {
    console.error('/api/grade error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — return current win rate stats
export async function GET() {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('predictions')
      .select('was_correct, predicted_risk, actual_crash_point, created_at, confidence, summary, should_bet, cashout_target, predicted_multiplier')
      .not('was_correct', 'is', null)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(100);

    const activeBets = data?.filter(p => p.should_bet !== false) ?? [];
    const total = activeBets.length;
    const correct = activeBets.filter(p => p.was_correct).length;
    const winRate = total > 0 ? Math.round((correct / total) * 100) : 0;

    let totalProfitUnits = 0;
    let totalLosses = 0;
    let totalWins = 0;
    let sumTarget = 0;

    for (const p of activeBets) {
      const target = Number(p.cashout_target || p.predicted_multiplier || 1.10);
      sumTarget += target;
      if (p.was_correct !== null) {
        if (p.was_correct) {
          totalProfitUnits += (target - 1);
          totalWins++;
        } else {
          totalProfitUnits -= 1;
          totalLosses++;
        }
      }
    }

    const avgTarget = total > 0 ? Number((sumTarget / total).toFixed(3)) : 0;
    const realizedEv = total > 0 ? Number((totalProfitUnits / total).toFixed(4)) : 0;

    // Break down by risk type
    const byRisk = { LOW: { total: 0, correct: 0 }, MEDIUM: { total: 0, correct: 0 }, HIGH: { total: 0, correct: 0 } };
    for (const p of activeBets) {
      const r = p.predicted_risk as 'LOW' | 'MEDIUM' | 'HIGH';
      if (byRisk[r]) {
        byRisk[r].total++;
        if (p.was_correct) byRisk[r].correct++;
      }
    }

    return NextResponse.json({
      total,
      correct,
      winRate,
      byRisk,
      totalProfitUnits: Number(totalProfitUnits.toFixed(2)),
      totalLosses,
      totalWins,
      avgTarget,
      realizedEv,
      recent: data?.slice(0, 10)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
