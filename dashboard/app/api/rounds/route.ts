import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats, gradePrediction, computeBetSignal } from '../../../lib/stats';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WindowStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  pUnder2: number;
}

function computeWindowStats(wValues: number[]): WindowStats | null {
  if (wValues.length === 0) return null;
  const n = wValues.length;
  const sorted = [...wValues].sort((a, b) => a - b);
  const mean = wValues.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const variance = wValues.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const under2 = wValues.filter(v => v < 2).length;
  const pUnder2 = Math.round((under2 / n) * 100);

  return {
    count: n,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    pUnder2
  };
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

    // 4. Fetch the entire database history (up to 50,000 rounds)
    let historyRounds: { crash_point: number }[] = [];
    const PAGE_SIZE = 1000;
    for (let i = 0; i < 50; i++) {
      const { data: pageData, error: pageErr } = await supabase
        .from('crash_rounds')
        .select('crash_point')
        .order('created_at', { ascending: false })
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
      
      if (pageErr || !pageData || pageData.length === 0) break;
      historyRounds.push(...(pageData as { crash_point: number }[]));
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

    const values = historyRounds.map(r => Number(r.crash_point));

    // Compute stats for 20, 50, and 200 round windows
    const stats20 = computeWindowStats(values.slice(0, 20));
    const stats50 = computeWindowStats(values.slice(0, 50));
    const stats200 = computeWindowStats(values);

    // Compute complete stats for recommendations / page view
    const stats = computeStats(values.slice(0, 50));

    // 5. Build prompt and run next prediction
    const recentHistory = values.slice(0, 20).reverse().join(', ');
    const nextRoundNumber = roundNumber + 1;

    const prompt = `You are a statistical analyst reviewing crash game data.

Recent crash points (oldest → newest): [${recentHistory}]

Rolling features computed over different round windows:
- Last 20 rounds (Short-term): Mean ${stats20?.mean}x | Median ${stats20?.median}x | StdDev ${stats20?.stdDev} | % <2x: ${stats20?.pUnder2}%
- Last 50 rounds (Mid-term): Mean ${stats50?.mean}x | Median ${stats50?.median}x | StdDev ${stats50?.stdDev} | % <2x: ${stats50?.pUnder2}%
- Last 200 rounds (Long-term): Mean ${stats200?.mean}x | Median ${stats200?.median}x | StdDev ${stats200?.stdDev} | % <2x: ${stats200?.pUnder2}%

Current Streaks & Trends:
- Consecutive low rounds (<2x): ${stats.currentLowStreak}
- Volatility: ${stats.volatility}
- Suggested cashout target: ${stats.suggestedCashout}x (with historical hit rate of ${stats.suggestedCashoutWinRate}%)

Your task: Based ONLY on these statistics, respond with valid JSON (no markdown, no explanation):
{
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "confidence": <integer 0-100>,
  "summary": "<2 sentences max — describe the pattern and risk for next round>",
  "predicted_multiplier": <number (expected maximum multiplier ceiling for next round, e.g. 1.85, 4.20, 15.00)>,
  "long_targets": {
    "x5": <integer 0-100 (probability next round reaches 5x)>,
    "x10": <integer 0-100 (probability next round reaches 10x)>,
    "x20": <integer 0-100 (probability next round reaches 20x)>
  }
}`;

    // AI Prediction Fallbacks (Now the primary statistical logic)
    let aiRisk = stats.riskLabel;
    let aiConfidence = stats.confidence;
    let aiSummary = `Based on ${stats.count} rounds, the avg crash is ${stats.mean}x. Statistical risk score is ${stats.riskScore}/100.`;
    let aiPredMultiplier = stats.suggestedCashout;
    let aiLongTargets = {
      x5: stats.targets.find(t => t.target === 5.0)?.hitRate ?? 20,
      x10: stats.targets.find(t => t.target === 10.0)?.hitRate ?? 10,
      x20: stats.targets.find(t => t.target === 20.0)?.hitRate ?? 5
    };

    const betSignal = computeBetSignal(stats);

    // 6. Save the next prediction to Supabase
    const { data: insertedPred, error: predErr } = await supabase
      .from('predictions')
      .insert({
        predicted_risk: aiRisk,
        confidence: aiConfidence,
        summary: aiSummary,
        round_number: nextRoundNumber,
        predicted_multiplier: aiPredMultiplier,
        long_targets: aiLongTargets
      })
      .select()
      .single();

    if (predErr) {
      console.error('Failed to save prediction:', predErr);
    }

    return NextResponse.json({
      success: true,
      round: insertedRound,
      stats,
      prediction: insertedPred ? {
        ...insertedPred,
        ...betSignal
      } : {
        predicted_risk: aiRisk,
        confidence: aiConfidence,
        summary: aiSummary,
        round_number: nextRoundNumber,
        predicted_multiplier: aiPredMultiplier,
        long_targets: aiLongTargets,
        ...betSignal
      }
    });

  } catch (err: any) {
    console.error('API /rounds error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
