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
      .select('id, predicted_risk')
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

    const wasCorrect = gradePrediction(
      pred.predicted_risk as 'LOW' | 'MEDIUM' | 'HIGH',
      actualCrashPoint
    );

    // Update with the actual result
    await supabase
      .from('predictions')
      .update({ actual_crash_point: actualCrashPoint, was_correct: wasCorrect })
      .eq('id', pred.id);

    // Compute updated win rate stats
    const { data: allGraded } = await supabase
      .from('predictions')
      .select('was_correct')
      .not('was_correct', 'is', null);

    const total = allGraded?.length ?? 0;
    const correct = allGraded?.filter(p => p.was_correct).length ?? 0;
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
      .select('was_correct, predicted_risk, actual_crash_point, created_at, confidence, summary')
      .not('was_correct', 'is', null)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(100);

    const total = data?.length ?? 0;
    const correct = data?.filter(p => p.was_correct).length ?? 0;
    const winRate = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Break down by risk type
    const byRisk = { LOW: { total: 0, correct: 0 }, MEDIUM: { total: 0, correct: 0 }, HIGH: { total: 0, correct: 0 } };
    for (const p of data ?? []) {
      const r = p.predicted_risk as 'LOW' | 'MEDIUM' | 'HIGH';
      if (byRisk[r]) {
        byRisk[r].total++;
        if (p.was_correct) byRisk[r].correct++;
      }
    }

    return NextResponse.json({ total, correct, winRate, byRisk, recent: data?.slice(0, 10) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
