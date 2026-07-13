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
      .select('id, should_bet, tier_swing, swing_target, cashout_target, predicted_multiplier')
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
      // Grade against cashout_target (the safe tier ~1.10x), NOT tier_swing (moonshot)
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

// Helper: compute stats for a subset of graded predictions
function computeWindow(rows: any[]) {
  const activeBets = rows.filter(p => p.should_bet !== false);
  const skips = rows.filter(p => p.should_bet === false);
  const total = activeBets.length;
  const correct = activeBets.filter(p => p.was_correct).length;
  const winRate = total > 0 ? Math.round((correct / total) * 100) : 0;

  let totalProfitUnits = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let sumTarget = 0;

  for (const p of activeBets) {
    // Use cashout_target (safe tier) for EV — NOT tier_swing (moonshot)
    const target = Number(p.cashout_target || p.predicted_multiplier || 1.15);
    sumTarget += target;
    if (p.was_correct) {
      totalProfitUnits += (target - 1);
      totalWins++;
    } else {
      totalProfitUnits -= 1;
      totalLosses++;
    }
  }

  // Skip "save": we skipped and actual crash was still low (< 1.5x)
  let skipSaves = 0;
  let skipMisses = 0;
  for (const p of skips) {
    const actual = Number(p.actual_crash_point);
    if (!Number.isFinite(actual)) continue;
    if (actual < 1.5) skipSaves++;
    else skipMisses++; // skipped but market went higher (opportunity cost)
  }
  const skipTotal = skips.length;
  const skipGraded = skipSaves + skipMisses;
  const skipSaveRate = skipGraded > 0 ? Math.round((skipSaves / skipGraded) * 100) : 0;

  const signalsTotal = rows.length;
  const betRate = signalsTotal > 0 ? Math.round((total / signalsTotal) * 100) : 0;
  const skipRate = signalsTotal > 0 ? Math.round((skipTotal / signalsTotal) * 100) : 0;

  const avgTarget = total > 0 ? Number((sumTarget / total).toFixed(3)) : 0;
  const realizedEv = total > 0 ? Number((totalProfitUnits / total).toFixed(4)) : 0;

  // Best / worst actual crash among graded bets (player context)
  let bestWin = 0;
  let worstLoss = 0;
  for (const p of activeBets) {
    const actual = Number(p.actual_crash_point);
    if (!Number.isFinite(actual)) continue;
    if (p.was_correct) bestWin = Math.max(bestWin, actual);
    else worstLoss = worstLoss === 0 ? actual : Math.min(worstLoss, actual);
  }

  return {
    total,
    correct,
    winRate,
    totalProfitUnits: Number(totalProfitUnits.toFixed(2)),
    totalWins,
    totalLosses,
    avgTarget,
    realizedEv,
    // New player-facing signal discipline metrics
    signalsTotal,
    skipTotal,
    skipSaves,
    skipMisses,
    skipSaveRate,
    betRate,
    skipRate,
    bestWin: bestWin > 0 ? Number(bestWin.toFixed(2)) : 0,
    worstLoss: worstLoss > 0 ? Number(worstLoss.toFixed(2)) : 0,
  };
}

// GET — return current win rate stats with 24h / 7d / allTime windows
export async function GET() {
  try {
    const { data } = await supabase
      .from('predictions')
      .select('was_correct, predicted_risk, actual_crash_point, created_at, confidence, summary, should_bet, cashout_target, predicted_multiplier, tier_swing, swing_target, tier_safe')
      .not('was_correct', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    const all = data ?? [];

    // Live market snapshot (always useful even with 0 graded bets)
    const { data: recentRounds } = await supabase
      .from('crash_rounds')
      .select('crash_point, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    const marketRows = recentRounds ?? [];
    const marketN = marketRows.length;
    const marketAvg = marketN > 0
      ? Number((marketRows.reduce((s, r) => s + Number(r.crash_point), 0) / marketN).toFixed(2))
      : 0;
    const marketAbove15 = marketN > 0
      ? Math.round((marketRows.filter(r => Number(r.crash_point) >= 1.5).length / marketN) * 100)
      : 0;
    const marketAbove2 = marketN > 0
      ? Math.round((marketRows.filter(r => Number(r.crash_point) >= 2).length / marketN) * 100)
      : 0;
    const marketInstant = marketN > 0
      ? Math.round((marketRows.filter(r => Number(r.crash_point) < 1.15).length / marketN) * 1000) / 10
      : 0;
    const last20 = marketRows.slice(0, 20);
    const last20Avg = last20.length > 0
      ? Number((last20.reduce((s, r) => s + Number(r.crash_point), 0) / last20.length).toFixed(2))
      : 0;

    // Time windows
    const now = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;
    const ms7d  = 7 * 24 * 60 * 60 * 1000;

    const rows24h = all.filter(p => now - new Date(p.created_at).getTime() <= ms24h);
    const rows7d  = all.filter(p => now - new Date(p.created_at).getTime() <= ms7d);
    const rows100 = all.slice(0, 100);

    const last24h  = computeWindow(rows24h);
    const last7d   = computeWindow(rows7d);
    const allTime  = computeWindow(rows100);

    // Signal quality: prefer cashout hit rate; fall back to skip-save rate if no bets yet
    const refWindow = last24h.total >= 5 ? last24h : last7d.total >= 5 ? last7d : last24h.signalsTotal >= 8 ? last24h : last7d;
    let signalQuality: 'STRONG' | 'MODERATE' | 'CAUTION' | 'INSUFFICIENT' = 'INSUFFICIENT';
    if (refWindow.total >= 5) {
      if (refWindow.winRate >= 65)      signalQuality = 'STRONG';
      else if (refWindow.winRate >= 50) signalQuality = 'MODERATE';
      else                               signalQuality = 'CAUTION';
    } else if (refWindow.signalsTotal >= 8) {
      // Discipline-based badge when still mostly SKIP
      if (refWindow.skipSaveRate >= 55 && refWindow.skipRate >= 30) signalQuality = 'MODERATE';
      else if (refWindow.skipSaveRate >= 40) signalQuality = 'CAUTION';
      else signalQuality = 'CAUTION';
    }

    const byRisk = { LOW: { total: 0, correct: 0 }, MEDIUM: { total: 0, correct: 0 }, HIGH: { total: 0, correct: 0 } };
    for (const p of rows100.filter(p => p.should_bet !== false)) {
      const r = p.predicted_risk as 'LOW' | 'MEDIUM' | 'HIGH';
      if (byRisk[r]) {
        byRisk[r].total++;
        if (p.was_correct) byRisk[r].correct++;
      }
    }

    return NextResponse.json({
      ...allTime,
      byRisk,
      recent: data?.slice(0, 10),
      last24h,
      last7d,
      allTime,
      signalQuality,
      signalBasisWindow: last24h.total >= 5 ? '24h' : (last7d.total >= 5 ? '7d' : (last24h.signalsTotal >= 8 ? '24h-signals' : 'none')),
      market: {
        sampleSize: marketN,
        avg: marketAvg,
        last20Avg,
        pctAbove15: marketAbove15,
        pctAbove2: marketAbove2,
        instantPct: marketInstant,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
