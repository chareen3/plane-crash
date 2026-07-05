import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats } from '../../../lib/stats';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // 1. Fetch last 50 rounds for rich context
    const { data: rounds, error } = await supabase
      .from('crash_rounds')
      .select('round_number, crash_point')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rounds || rounds.length < 3) {
      return NextResponse.json({ error: 'Not enough data yet (need 3+ rounds).' });
    }

    // 2. Compute local stats instantly (no AI needed yet)
    const values = rounds.map(r => Number(r.crash_point));
    const stats = computeStats(values);

    const lastRoundNumber = rounds[0]?.round_number ?? 0;
    const recentHistory = values.slice(0, 20).reverse().join(', ');

    // 3. Build a precise, structured AI prompt
    const prompt = `You are a statistical analyst reviewing crash game data.

Recent crash points (oldest → newest): [${recentHistory}]

Pre-computed statistics:
- Mean: ${stats.mean}x | Median: ${stats.median}x | StdDev: ${stats.stdDev}
- Last 5 avg: ${stats.recentMean}x | Prior 10 avg: ${stats.olderMean}x | Trend: ${stats.trend}
- Consecutive low rounds (<2x): ${stats.currentLowStreak}
- % under 2x: ${stats.pUnder2}% | % 2x-5x: ${stats.p2to5}% | % over 5x: ${stats.pOver5}%
- Statistical risk score: ${stats.riskScore}/100

Your task: Based ONLY on these statistics, respond with valid JSON (no markdown, no explanation):
{
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "confidence": <integer 0-100>,
  "summary": "<2 sentences max — describe the pattern and risk for next round>"
}`;

    // 4. Call OpenRouter with a faster, smaller model
    let aiRisk = stats.riskLabel;
    let aiConfidence = stats.confidence;
    let aiSummary = `Based on ${stats.count} rounds, the avg crash is ${stats.mean}x. Statistical risk score is ${stats.riskScore}/100.`;

    try {
      const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://crash-tracker.app',
        },
        body: JSON.stringify({
          model: 'google/gemma-2-9b-it:free',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(5000), // 5s max — fallback to stats if slow
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const raw = aiData.choices?.[0]?.message?.content || '';
        // Strip any markdown code fences just in case
        const jsonStr = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.risk && parsed.summary) {
          aiRisk = parsed.risk;
          aiConfidence = parsed.confidence ?? aiConfidence;
          aiSummary = parsed.summary;
        }
      }
    } catch (_) {
      // AI timed out or failed — stats-only fallback is already set above
    }

    // 5. Save prediction to Supabase for grading later
    await supabase.from('predictions').insert({
      predicted_risk: aiRisk,
      confidence: aiConfidence,
      summary: aiSummary,
      round_number: lastRoundNumber,
    });

    return NextResponse.json({
      risk: aiRisk,
      confidence: aiConfidence,
      summary: aiSummary,
      stats,
    });

  } catch (err: any) {
    console.error('/api/predict error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
