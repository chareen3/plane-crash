import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeStats, computeBetSignal } from '../../../lib/stats';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// computeBetSignal is imported from lib/stats.ts

// ─── Peak hours scoring (UTC) ──────────────────────────────────────────────
// Based on Aviator/Crash game typical traffic patterns
const PEAK_HOURS_UTC = [
  { hour: 0,  label: '00:00 UTC', score: 60, tag: 'WARM' as const, note: 'Asia late night, moderate volume' },
  { hour: 1,  label: '01:00 UTC', score: 45, tag: 'NORM' as const, note: 'Low global volume' },
  { hour: 2,  label: '02:00 UTC', score: 35, tag: 'COLD' as const, note: 'Very low volume' },
  { hour: 3,  label: '03:00 UTC', score: 30, tag: 'COLD' as const, note: 'Very low volume' },
  { hour: 4,  label: '04:00 UTC', score: 30, tag: 'COLD' as const, note: 'Very low volume' },
  { hour: 5,  label: '05:00 UTC', score: 40, tag: 'NORM' as const, note: 'EU early risers' },
  { hour: 6,  label: '06:00 UTC', score: 55, tag: 'WARM' as const, note: 'EU morning pickup' },
  { hour: 7,  label: '07:00 UTC', score: 65, tag: 'HOT'  as const, note: 'EU prime morning' },
  { hour: 8,  label: '08:00 UTC', score: 75, tag: 'HOT'  as const, note: 'EU/Africa morning peak' },
  { hour: 9,  label: '09:00 UTC', score: 80, tag: 'PEAK' as const, note: 'High EU volume' },
  { hour: 10, label: '10:00 UTC', score: 85, tag: 'PEAK' as const, note: 'EU full volume' },
  { hour: 11, label: '11:00 UTC', score: 85, tag: 'PEAK' as const, note: 'EU full volume' },
  { hour: 12, label: '12:00 UTC', score: 80, tag: 'PEAK' as const, note: 'EU noon + US East wake' },
  { hour: 13, label: '13:00 UTC', score: 78, tag: 'HOT'  as const, note: 'EU afternoon + US morning' },
  { hour: 14, label: '14:00 UTC', score: 82, tag: 'PEAK' as const, note: 'EU/US overlap' },
  { hour: 15, label: '15:00 UTC', score: 88, tag: 'PEAK' as const, note: 'Global peak, EU+US+Asia overlap' },
  { hour: 16, label: '16:00 UTC', score: 90, tag: 'PEAK' as const, note: 'Highest global volume window' },
  { hour: 17, label: '17:00 UTC', score: 88, tag: 'PEAK' as const, note: 'EU evening + US afternoon' },
  { hour: 18, label: '18:00 UTC', score: 85, tag: 'PEAK' as const, note: 'Post-work EU, US active' },
  { hour: 19, label: '19:00 UTC', score: 80, tag: 'HOT'  as const, note: 'Evening prime' },
  { hour: 20, label: '20:00 UTC', score: 75, tag: 'HOT'  as const, note: 'EU late evening' },
  { hour: 21, label: '21:00 UTC', score: 68, tag: 'HOT'  as const, note: 'US peak + Asia early' },
  { hour: 22, label: '22:00 UTC', score: 65, tag: 'WARM' as const, note: 'US evening + Asia pickup' },
  { hour: 23, label: '23:00 UTC', score: 60, tag: 'WARM' as const, note: 'US late + Asia morning' },
];

// ─── AI Prompt Builder ─────────────────────────────────────────────────────
function buildPrompt(stats: any, betSignal: any, timeData: {
  currentUTCHour: number;
  currentLocalHour: number;
  currentAMPM: 'AM' | 'PM';
  peakHours: { hour: number; label: string; score: number; tag: string; note: string }[];
}) {
  const t = (mult: number) =>
    stats.targets?.find((x: any) => Math.abs(x.target - mult) < 0.01);

  const t105  = t(1.05);
  const t110  = t(1.10);
  const t118  = t(1.18);
  const t120  = t(1.20);
  const t150  = t(1.50);
  const t200  = t(2.0);
  const t300  = t(3.0);
  const t500  = t(5.0);
  const t1000 = t(10.0);

  const nowPeak =
    timeData.peakHours.find(h => h.hour === timeData.currentUTCHour) ??
    timeData.peakHours[12] ??
    { label: 'Unknown', tag: 'NORM', score: 50, note: 'No data' };

  return `You are an expert crash game AI analyst for a 1xBet Aviator-style game.

Your job: analyze the current round using BOTH time-based data (hour of day, AM/PM)
AND statistical history, then decide:
- Whether to bet or skip.
- Whether to stay in the low cash-out zone (1.05–1.20x) or go higher (>=1.50x).
- How much stake to use (very small, small, medium; never large).

You MUST balance safety and excitement. If data is not clearly favorable, you default
to safe or SKIP, NOT greedy high bets.

=== ROUND STATS ===
count: ${stats.count}
mean: ${stats.mean?.toFixed(3)}x
median: ${stats.median?.toFixed(3)}x
stdDev: ${stats.stdDev?.toFixed(3)}
min: ${stats.min?.toFixed(2)}x
max: ${stats.max?.toFixed(2)}x
riskScore: ${stats.riskScore}/100
riskLabel: ${stats.riskLabel}
lowStreak: ${stats.currentLowStreak}
highStreak: ${stats.currentHighStreak ?? 0}
trend: ${stats.trend}
EMA: ${stats.ema?.toFixed(3)}x

=== LOW CASH-OUT ZONE (1.05–1.20x) ===
1.05x hitRate: ${t105?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t105?.lastHitAgo ?? '?'} rounds ago)
1.10x hitRate: ${t110?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t110?.lastHitAgo ?? '?'} rounds ago)
1.18x hitRate: ${t118?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t118?.lastHitAgo ?? '?'} rounds ago)
1.20x hitRate: ${t120?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t120?.lastHitAgo ?? '?'} rounds ago)

=== HIGHER TARGETS ===
1.50x hitRate: ${t150?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t150?.lastHitAgo ?? '?'} rounds ago)
2.00x hitRate: ${t200?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t200?.lastHitAgo ?? '?'} rounds ago)
3.00x hitRate: ${t300?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t300?.lastHitAgo ?? '?'} rounds ago)
5.00x hitRate: ${t500?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t500?.lastHitAgo ?? '?'} rounds ago)
10.0x hitRate: ${t1000?.hitRate?.toFixed(1) ?? '?'}% (last hit ${t1000?.lastHitAgo ?? '?'} rounds ago)

=== CURRENT BACKEND SIGNAL (stats-only) ===
baseShouldBet: ${betSignal.should_bet}
baseStrategy: ${betSignal.strategy}
baseCashoutTarget: ${betSignal.cashout_target}
skipReason: ${betSignal.skip_reason ?? 'None'}

=== TIME CONTEXT ===
currentUTCHour: ${timeData.currentUTCHour} (${nowPeak.label} UTC)
currentLocalHour: ${timeData.currentLocalHour} ${timeData.currentAMPM}
peakTag: ${nowPeak.tag}
peakScore: ${nowPeak.score}
peakNote: ${nowPeak.note}

=== RULES YOU MUST FOLLOW ===
1. If riskScore >= 80 or lowStreak >= 5: default to SKIP or ultra-safe 1.05–1.10x with very small stake.
2. Use the 1.05–1.20x zone as a micro-win strategy when hitRate >= 55% and trend is flat/negative.
3. Only suggest >=1.50x targets when riskScore <= 45, lowStreak <= 2, trend is flat/rising,
   AND hitRate(1.50–3.00x) is clearly favorable.
4. Very high targets (5–10x) must be rare, with tiny stake (<=2% bankroll) and clear justification.
5. Never "always go higher"; you must sometimes recommend staying low cash-out or SKIP when data is mixed.

=== OUTPUT FORMAT (STRICT JSON) ===
Return exactly one JSON object:

{
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "confidence": <0-100>,
  "should_bet": true | false,
  "strategy": "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE" | "SKIP",
  "cashout_target": <float>,
  "low_zone_target": <float>,
  "high_zone_target": <float|null>,
  "recommended_stake_pct": <0-5>,
  "summary": "<2-3 sentences: time-of-day + risk + why low vs high + why bet/skip>"
}

Do NOT output anything except the JSON object.`;
}

// ─── AI model call with timeout + JSON extraction ─────────────────────────
async function callAI(prompt: string): Promise<any | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    // ── Paginated fetch of full history (up to 50k rounds) ──
    let rounds: any[] = [];
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

    // Return cached prediction if exists
    if (existingPred) {
      return NextResponse.json({
        risk: existingPred.predicted_risk,
        confidence: existingPred.confidence,
        summary: existingPred.summary,
        predicted_multiplier: existingPred.predicted_multiplier,
        long_targets: existingPred.long_targets,
        should_bet: existingPred.should_bet,
        recommended_bet_units: existingPred.recommended_bet_units,
        skip_reason: existingPred.skip_reason,
        strategy: existingPred.strategy,
        cashout_target: existingPred.cashout_target,
        strategy_reason: existingPred.strategy_reason,
        ai_model_used: existingPred.ai_model_used ?? 'stats-only',
        stats,
      });
    }

    // ── Time context for AI prompt ──
    const now = new Date();
    const timeData = {
      currentUTCHour: now.getUTCHours(),
      currentLocalHour: now.getHours(),
      currentAMPM: (now.getHours() >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
      peakHours: PEAK_HOURS_UTC,
    };

    // ── Stats-only defaults (safe fallback) ──
    const betSignal = computeBetSignal(stats);

    let aiRisk        = stats.riskLabel as 'LOW' | 'MEDIUM' | 'HIGH';
    let aiConfidence  = stats.confidence;
    let aiSummary     = `${stats.count} rounds analyzed. Risk score: ${stats.riskScore}/100. ${betSignal.should_bet ? 'Signal: BET.' : 'Signal: SKIP.'}`;
    let aiPredMultiplier = stats.suggestedCashout;
    const aiLongTargets  = {
      x5:  stats.targets.find((t: any) => t.target === 5.0)?.hitRate  ?? 20,
      x10: stats.targets.find((t: any) => t.target === 10.0)?.hitRate ?? 10,
      x20: stats.targets.find((t: any) => t.target === 20.0)?.hitRate ?? 5,
    };

    let strategyLabel  = betSignal.strategy;
    let strategyReason = betSignal.skip_reason ?? 'Stats-only fallback.';
    let finalBet       = strategyLabel === 'SKIP' ? false : betSignal.should_bet;
    let finalCashout   = strategyLabel === 'SKIP' ? 0     : betSignal.cashout_target;
    let aiModelUsed    = 'stats-only';

    // ── AI layer: override only when values are valid ──
    try {
      const prompt = buildPrompt(stats, betSignal, timeData);
      const ai = await callAI(prompt);

      if (ai) {
        aiModelUsed = 'openrouter/gemini-flash-1.5';

        if (ai.risk === 'LOW' || ai.risk === 'MEDIUM' || ai.risk === 'HIGH') {
          aiRisk = ai.risk;
        }
        if (typeof ai.confidence === 'number' && ai.confidence >= 0 && ai.confidence <= 100) {
          aiConfidence = ai.confidence;
        }
        if (typeof ai.summary === 'string' && ai.summary.length > 0) {
          aiSummary = ai.summary;
        }
        if (typeof ai.cashout_target === 'number' && ai.cashout_target > 1.0 && ai.cashout_target < 10.0) {
          aiPredMultiplier = ai.cashout_target;
          finalCashout     = ai.cashout_target;
        }
        if (['CONSERVATIVE','BALANCED','AGGRESSIVE','SKIP'].includes(ai.strategy)) {
          strategyLabel = ai.strategy;
        }
        if (typeof ai.should_bet === 'boolean') {
          finalBet = ai.should_bet;
        }
        if (typeof ai.summary === 'string') {
          strategyReason = (betSignal.skip_reason ?? '') + (betSignal.skip_reason ? ' | ' : '') + 'AI: ' + ai.summary;
        }
      }
    } catch {
      // AI failed → stats-only fallback remains intact
    }

    // ── Persist prediction ──
    await supabase.from('predictions').insert({
      predicted_risk:       aiRisk,
      confidence:           aiConfidence,
      summary:              aiSummary,
      round_number:         nextRoundNumber,
      predicted_multiplier: aiPredMultiplier,
      long_targets:         aiLongTargets,
      should_bet:           finalBet,
      cashout_target:       finalCashout,
      strategy:             strategyLabel,
      strategy_reason:      strategyReason,
      ai_model_used:        aiModelUsed,
    });

    return NextResponse.json({
      risk:                  aiRisk,
      confidence:            aiConfidence,
      summary:               aiSummary,
      predicted_multiplier:  aiPredMultiplier,
      long_targets:          aiLongTargets,
      should_bet:            finalBet,
      recommended_bet_units: betSignal.recommended_bet_units,
      skip_reason:           betSignal.skip_reason,
      strategy:              strategyLabel,
      cashout_target:        finalCashout,
      strategy_reason:       strategyReason,
      ai_model_used:         aiModelUsed,
      stats,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
