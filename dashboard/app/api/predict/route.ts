import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats } from '../../../lib/stats';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Model fallback chain ───────────────────────────────────────────────────
const MODEL_CHAIN = [
  { id: 'google/gemini-flash-1.5', timeout: 6000 },
  { id: 'google/gemma-2-9b-it:free', timeout: 4000 },
];

async function callAI(prompt: string): Promise<{ raw: string; model: string } | null> {
  for (const m of MODEL_CHAIN) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://crash-tracker.app',
        },
        body: JSON.stringify({
          model: m.id,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.25,
        }),
        signal: AbortSignal.timeout(m.timeout),
      });
      if (res.ok) {
        const d = await res.json();
        const raw = d.choices?.[0]?.message?.content || '';
        if (raw.includes('risk')) return { raw, model: m.id };
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

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

// ─── AI prompt builder ─────────────────────────────────────────────────────
function buildPrompt(values: number[], stats: any): string {
  const hist20 = values.slice(0, 20).reverse().join(', ');
  const hist50 = values.slice(0, 50);
  const superHighRuns = hist50.filter((v: number) => v >= 10).length;
  const t2  = stats.targets.find((t: any) => t.target === 2.0);
  const t3  = stats.targets.find((t: any) => t.target === 3.0);
  const t5  = stats.targets.find((t: any) => t.target === 5.0);
  const t10 = stats.targets.find((t: any) => t.target === 10.0);

  return `You are an expert crash game analyst. Analyze the data and predict the NEXT round.

RECENT HISTORY (oldest→newest, last 20): [${hist20}]

STATISTICS (last 50 rounds):
- Mean: ${stats.mean}x | Median: ${stats.median}x | StdDev: ${stats.stdDev}
- EMA (10-round): ${stats.ema}x | Trend: ${stats.trend}
- Recent 10 avg: ${stats.recentMean}x | Prior 20 avg: ${stats.olderMean}x
- Low streak (<2x): ${stats.currentLowStreak} | High streak (≥2x): ${stats.currentHighStreak}
- Risk score: ${stats.riskScore}/100 | Volatility: ${stats.volatility}

PROBABILITY ZONES:
- Under 2x: ${stats.pUnder2}% | 2x–5x: ${stats.p2to5}% | Over 5x: ${stats.pOver5}%
- Super-high runs (≥10x) in last 50: ${superHighRuns}

TARGET HIT RATES (overall | recent 20):
- 2x:  ${t2?.hitRate ?? '??'}% | recent: ${t2?.recentHitRate ?? '??'}% | last hit: ${t2?.lastHitAgo === -1 ? 'never' : t2?.lastHitAgo + 'r ago'}
- 3x:  ${t3?.hitRate ?? '??'}% | recent: ${t3?.recentHitRate ?? '??'}% | last hit: ${t3?.lastHitAgo === -1 ? 'never' : t3?.lastHitAgo + 'r ago'}
- 5x:  ${t5?.hitRate ?? '??'}% | recent: ${t5?.recentHitRate ?? '??'}% | last hit: ${t5?.lastHitAgo === -1 ? 'never' : t5?.lastHitAgo + 'r ago'}
- 10x: ${t10?.hitRate ?? '??'}% | recent: ${t10?.recentHitRate ?? '??'}% | last hit: ${t10?.lastHitAgo === -1 ? 'never' : t10?.lastHitAgo + 'r ago'}

STRATEGY RULES (apply these):
1. If low_streak >= 5: HIGH risk — do NOT suggest betting
2. If high_streak >= 4 AND trend=rising: LOW risk — suggest AGGRESSIVE cashout
3. If risk_score >= 70: HIGH risk regardless
4. If trend falling AND recentMean < 2x: HIGH or MEDIUM risk
5. If last 10x was > 20 rounds ago AND pOver5 > 25%: bump x10 probability
6. For long_targets: be conservative — crash games are house-edge dominant

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "confidence": <integer 0-100>,
  "summary": "<2 punchy sentences: pattern observed + what to do next round>",
  "predicted_multiplier": <number: realistic ceiling e.g. 1.85 or 4.20 or 12.0>,
  "strategy_label": "<one of: SKIP | CONSERVATIVE | BALANCED | AGGRESSIVE>",
  "strategy_reason": "<one sentence why this strategy fits right now>",
  "long_targets": {
    "x5":  <integer 0-100>,
    "x10": <integer 0-100>,
    "x20": <integer 0-100>
  }
}`;
}

// ─── Main handler ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const { data: rounds, error } = await supabase
      .from('crash_rounds')
      .select('round_number, crash_point')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rounds || rounds.length < 3)
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

    const aiResult = await callAI(buildPrompt(values, stats));
    if (aiResult) {
      try {
        const jsonStr = aiResult.raw.replace(/```json?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.risk && parsed.summary) {
          aiRisk = parsed.risk;
          aiConfidence = parsed.confidence ?? aiConfidence;
          aiSummary = parsed.summary;
          aiPredMultiplier = parsed.predicted_multiplier ?? aiPredMultiplier;
          if (parsed.long_targets) aiLongTargets = { ...aiLongTargets, ...parsed.long_targets };
          if (parsed.strategy_label) strategyLabel = parsed.strategy_label;
          if (parsed.strategy_reason) strategyReason = parsed.strategy_reason;
          aiModelUsed = aiResult.model;
        }
      } catch (_) {}
    }

    const finalBet = strategyLabel === 'SKIP' ? false : betSignal.should_bet;
    const finalCashout = strategyLabel === 'SKIP' ? 0 : betSignal.cashout_target;

    await supabase.from('predictions').insert({
      predicted_risk: aiRisk,
      confidence: aiConfidence,
      summary: aiSummary,
      round_number: nextRoundNumber,
      predicted_multiplier: aiPredMultiplier,
      long_targets: aiLongTargets,
      should_bet: finalBet,
      skip_reason: betSignal.skip_reason,
      strategy: strategyLabel,
      cashout_target: finalCashout,
      strategy_reason: strategyReason,
      ai_model_used: aiModelUsed,
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
