/**
 * ai.ts — AI formatting layer for the crash-game statistics service.
 *
 * STABLE v2 changes:
 *  - Confidence ceiling reduced 75 → 60
 *  - Prompt updated to reflect 3.00x hard max and new INSTANT boundary (1.15)
 *  - cold_streak derivation uses sessionDanger (already computed in stats)
 *  - enforcePrediction respects SIGNAL_MAX_CASHOUT = 3.00x
 *  - buildFallbackPrediction anchored to new stable targets
 */

import type { BetSignal, CrashStats, MasterSignal } from './stats';

export type PeakHourTag = 'NORM' | 'WARM' | 'HOT' | 'PEAK';
export type LKPhase =
  | 'SLEEP'
  | 'MORNING'
  | 'DAY'
  | 'EVENING'
  | 'PRIME'
  | 'LATE';
export type LKRule = 'SKIP' | 'CAUTION' | 'BET_NORMAL' | 'BET_SAFE';

export interface PeakHourProfile {
  hour: number;
  label: string;
  score: number;
  tag: PeakHourTag;
  note: string;
}

export interface LKPhaseInfo {
  phase: LKPhase;
  rule: LKRule;
  playerCount: string;
  note: string;
}

export interface LKTimeData {
  currentUTCHour: number;
  currentLKHour: number;
  currentLKMinute: number;
  currentLKTimeStr: string;
  lkPhase: LKPhase;
  lkRule: LKRule;
  lkPlayerCount: string;
  lkNote: string;
  isLKPrime: boolean;
  isLKSleep: boolean;
  currentAMPM: 'AM' | 'PM';
  peakHours: readonly PeakHourProfile[];
}

export interface AIPrediction {
  tier_safe: number;
  tier_swing: number;
  tier_moon: number;
  skip_round: boolean;
  cold_streak: boolean;
  confidence: number;
  reasoning: string;
  p5x_chance: number;
  p10x_chance: number;
  p20x_chance: number;
}

export interface AIPredictionResult {
  result: AIPrediction;
  model: string;
}

interface OpenRouterMessage  { content?: unknown; }
interface OpenRouterChoice   { message?: OpenRouterMessage; }
interface OpenRouterResponse { choices?: OpenRouterChoice[]; }

const AI_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
] as const;

const OPENROUTER_URL       = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS   = 8_000;
const MAX_REASONING_LENGTH = 500;
/** Stable v2: ceiling reduced from 75 to 60 for consistent output. */
const AI_CONFIDENCE_CEIL   = 60;
/** Must match SIGNAL_MAX_CASHOUT in stats.ts */
const SIGNAL_MAX_CASHOUT   = 3.00;

export const PEAK_HOURS_UTC: readonly PeakHourProfile[] = [
  { hour:  0, label: '00:00 UTC', score: 40,  tag: 'NORM', note: 'LK 5:30 AM'  },
  { hour:  1, label: '01:00 UTC', score: 50,  tag: 'NORM', note: 'LK 6:30 AM'  },
  { hour:  2, label: '02:00 UTC', score: 55,  tag: 'NORM', note: 'LK 7:30 AM'  },
  { hour:  3, label: '03:00 UTC', score: 65,  tag: 'WARM', note: 'LK 8:30 AM'  },
  { hour:  4, label: '04:00 UTC', score: 65,  tag: 'WARM', note: 'LK 9:30 AM'  },
  { hour:  5, label: '05:00 UTC', score: 65,  tag: 'WARM', note: 'LK 10:30 AM' },
  { hour:  6, label: '06:00 UTC', score: 65,  tag: 'WARM', note: 'LK 11:30 AM' },
  { hour:  7, label: '07:00 UTC', score: 70,  tag: 'HOT',  note: 'LK 12:30 PM' },
  { hour:  8, label: '08:00 UTC', score: 65,  tag: 'WARM', note: 'LK 1:30 PM'  },
  { hour:  9, label: '09:00 UTC', score: 65,  tag: 'WARM', note: 'LK 2:30 PM'  },
  { hour: 10, label: '10:00 UTC', score: 65,  tag: 'WARM', note: 'LK 3:30 PM'  },
  { hour: 11, label: '11:00 UTC', score: 70,  tag: 'HOT',  note: 'LK 4:30 PM'  },
  { hour: 12, label: '12:00 UTC', score: 75,  tag: 'HOT',  note: 'LK 5:30 PM'  },
  { hour: 13, label: '13:00 UTC', score: 80,  tag: 'HOT',  note: 'LK 6:30 PM'  },
  { hour: 14, label: '14:00 UTC', score: 95,  tag: 'PEAK', note: 'LK 7:30 PM'  },
  { hour: 15, label: '15:00 UTC', score: 100, tag: 'PEAK', note: 'LK 8:30 PM'  },
  { hour: 16, label: '16:00 UTC', score: 95,  tag: 'PEAK', note: 'LK 9:30 PM'  },
  { hour: 17, label: '17:00 UTC', score: 85,  tag: 'HOT',  note: 'LK 10:30 PM' },
  { hour: 18, label: '18:00 UTC', score: 70,  tag: 'WARM', note: 'LK 11:30 PM' },
  { hour: 19, label: '19:00 UTC', score: 40,  tag: 'NORM', note: 'LK 12:30 AM' },
  { hour: 20, label: '20:00 UTC', score: 40,  tag: 'NORM', note: 'LK 1:30 AM'  },
  { hour: 21, label: '21:00 UTC', score: 40,  tag: 'NORM', note: 'LK 2:30 AM'  },
  { hour: 22, label: '22:00 UTC', score: 40,  tag: 'NORM', note: 'LK 3:30 AM'  },
  { hour: 23, label: '23:00 UTC', score: 40,  tag: 'NORM', note: 'LK 4:30 AM'  },
] as const;

export const LK_PHASE_TABLE: Readonly<Record<number, LKPhaseInfo>> = {
   0: { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<15',     note: '12 AM. Safety lock.'          },
   1: { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<10',     note: '1 AM. Safety lock.'           },
   2: { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<10',     note: '2 AM. Safety lock.'           },
   3: { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<10',     note: '3 AM. Safety lock.'           },
   4: { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<10',     note: '4 AM. Safety lock.'           },
   5: { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '10-15',   note: '5 AM. Safety lock.'           },
   6: { phase: 'MORNING', rule: 'CAUTION',    playerCount: '15-30',   note: '6 AM. Conservative targets.'  },
   7: { phase: 'MORNING', rule: 'CAUTION',    playerCount: '30-50',   note: '7 AM. Conservative targets.'  },
   8: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '50-100',  note: '8 AM. Standard controls.'     },
   9: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '80-120',  note: '9 AM. Standard controls.'     },
  10: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '10 AM. Standard controls.'    },
  11: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '11 AM. Standard controls.'    },
  12: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '120-180', note: '12 PM. Standard controls.'    },
  13: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '1 PM. Standard controls.'     },
  14: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '2 PM. Standard controls.'     },
  15: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '3 PM. Standard controls.'     },
  16: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '150-200', note: '4 PM. Standard controls.'     },
  17: { phase: 'EVENING', rule: 'BET_NORMAL', playerCount: '150-200', note: '5 PM. Standard controls.'     },
  18: { phase: 'EVENING', rule: 'BET_SAFE',   playerCount: '200-280', note: '6 PM. Conservative controls.' },
  19: { phase: 'PRIME',   rule: 'BET_SAFE',   playerCount: '300-400', note: '7 PM. Conservative controls.' },
  20: { phase: 'PRIME',   rule: 'BET_SAFE',   playerCount: '400-500', note: '8 PM. Conservative controls.' },
  21: { phase: 'PRIME',   rule: 'BET_SAFE',   playerCount: '400-600', note: '9 PM. Conservative controls.' },
  22: { phase: 'PRIME',   rule: 'BET_SAFE',   playerCount: '300-400', note: '10 PM. Conservative controls.'},
  23: { phase: 'LATE',    rule: 'CAUTION',    playerCount: '100-200', note: '11 PM. Reduce exposure.'      },
};

const FALLBACK_PHASE: LKPhaseInfo = {
  phase: 'DAY', rule: 'BET_NORMAL', playerCount: 'Unknown', note: 'Standard controls.',
};

export function getLKTimeData(now: Date = new Date()): LKTimeData {
  let lkHour: number | undefined;
  let lkMinute: number | undefined;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    const parts = fmt.formatToParts(now);
    const h = parts.find(p => p.type === 'hour')?.value;
    const m = parts.find(p => p.type === 'minute')?.value;
    if (h !== undefined) lkHour   = Number.parseInt(h, 10);
    if (m !== undefined) lkMinute = Number.parseInt(m, 10);
  } catch { /* fall through */ }

  if (!Number.isInteger(lkHour) || !Number.isInteger(lkMinute)) {
    const c = new Date(now.getTime() + 5.5 * 60 * 60 * 1_000);
    lkHour   = c.getUTCHours();
    lkMinute = c.getUTCMinutes();
  }

  const safeHour   = lkHour   ?? 0;
  const safeMinute = lkMinute ?? 0;
  const info = LK_PHASE_TABLE[safeHour] ?? FALLBACK_PHASE;

  return {
    currentUTCHour:   now.getUTCHours(),
    currentLKHour:    safeHour,
    currentLKMinute:  safeMinute,
    currentLKTimeStr: `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`,
    lkPhase:       info.phase,
    lkRule:        info.rule,
    lkPlayerCount: info.playerCount,
    lkNote:        info.note,
    isLKPrime: info.phase === 'PRIME',
    isLKSleep: info.phase === 'SLEEP',
    currentAMPM: safeHour >= 12 ? 'PM' : 'AM',
    peakHours: PEAK_HOURS_UTC,
  };
}

function fmt(v: number | undefined, d = 2): string {
  return Number.isFinite(v) ? (v as number).toFixed(d) : 'N/A';
}

function targetLine(stats: CrashStats, target: number): string {
  const m = stats.targets.find(i => Math.abs(i.target - target) < 0.01);
  return m
    ? `${target.toFixed(2)}x: ${m.hitRate}% overall, ${m.recentHitRate}% recent, EV ${m.ev}`
    : `${target.toFixed(2)}x: unavailable`;
}

function patternSummary(stats: CrashStats): string {
  const p = stats.detectedPatterns[0];
  if (!p) return 'No matching streak pattern with historical outcomes.';
  const rates = p.nextRoundWinRates.map(r => `${r.target.toFixed(2)}x=${r.hitRate}%`).join(', ');
  return `${p.patternName}; occurrences=${p.occurrences}; next-hit rates: ${rates}; p90=${p.p90 ?? 'N/A'}x, p80=${p.p80 ?? 'N/A'}x, p50=${p.p50 ?? 'N/A'}x.`;
}

function sequenceSummary(stats: CrashStats): string {
  const s = stats.sequenceMatch;
  if (!s) return 'No matching n-gram sequence.';
  return `[${s.sequence.join(' -> ')}], occurrences=${s.occurrences}, INSTANT=${s.pInstantNext}%, safe>=1.15x=${s.pSafeNext}%, MED+=${s.pMedNext}%, HIGH=${s.pHighNext}%.`;
}

function timeSummary(stats: CrashStats): string {
  const t = stats.timePattern;
  if (!t) return 'No minute profile with at least 10 observations.';
  return `UTC minute ${t.minute}, observations=${t.occurrences}, p90=${t.p90}x, p80=${t.p80}x, p50=${t.p50}x.`;
}

function enforcedSkip(stats: CrashStats, betSignal: BetSignal, timeData: LKTimeData): boolean {
  return (
    !betSignal.should_bet
    || timeData.isLKSleep
    || stats.masterSignal === 'ABORT'
    || stats.masterSignal === 'DANGER'
    || stats.instantClusterRisk > 60
  );
}

export function buildPrompt(
  stats: CrashStats,
  betSignal: BetSignal,
  timeData: LKTimeData,
): string {
  const nowPeak  = timeData.peakHours.find(p => p.hour === timeData.currentUTCHour);
  const mustSkip = enforcedSkip(stats, betSignal, timeData);
  const markovMedHigh = stats.markovNext.MED + stats.markovNext.HIGH;

  return `Analyze the supplied deterministic statistics and return the required JSON.

CRITICAL LIMITS
- Crash outcomes are independent provably-fair RNG. Do not claim certainty or a "due" recovery.
- The backend decision is authoritative. Never override SKIP, ABORT, or DANGER into a bet.
- ENFORCED_SKIP=${mustSkip}. If true: skip_round=true, tier_safe=0, tier_swing=0, tier_moon=0.
- HARD MAX CASHOUT: 3.00x. tier_safe, tier_swing, and tier_moon must never exceed 3.00.
- INSTANT tier boundary is 1.15x (rounds below 1.15x are instant crashes).
- Confidence must not exceed ${Math.min(stats.signalConfidence, AI_CONFIDENCE_CEIL)} and must never exceed ${AI_CONFIDENCE_CEIL}.
- Probabilities must be empirical estimates between 0 and 100.
- Reasoning must contain exactly two short sentences.

SESSION
Rounds=${stats.count}
Mean=${fmt(stats.mean)}x; median=${fmt(stats.median)}x; stdDev=${fmt(stats.stdDev)}
EMA=${fmt(stats.ema)}x; trend=${stats.trend}; volatility=${stats.volatility} (${stats.volatilityPct}%)
Recent outcomes newest-first=${stats.recentOutcomes.map(v => `${v}x`).join(', ') || 'N/A'}
Low streak=${stats.currentLowStreak}; high streak=${stats.currentHighStreak}
Session momentum=${stats.sessionMomentum}; danger=${stats.sessionDanger}; hot=${stats.sessionHot}

AUTHORITATIVE BACKEND SIGNAL
Master signal=${stats.masterSignal}
Weighted risk=${stats.riskScore}/100 (${stats.riskLabel})
Signal confidence ceiling=${Math.min(stats.signalConfidence, AI_CONFIDENCE_CEIL)}
Backend should_bet=${betSignal.should_bet}; strategy=${betSignal.strategy}
Backend target=${betSignal.cashout_target}x; swing=${betSignal.swing_target ?? 'none'}
Backend skip reason=${betSignal.skip_reason ?? 'none'}
Backend reason=${betSignal.strategy_reason ?? stats.cashoutReason}
Instant cluster risk=${stats.instantClusterRisk}%
Instant warning=${stats.instantCrashWarning}

MARKOV MODEL
Next INSTANT=${stats.markovNext.INSTANT}%; LOW=${stats.markovNext.LOW}%; MED=${stats.markovNext.MED}%; HIGH=${stats.markovNext.HIGH}%
Combined MED/HIGH=${markovMedHigh}%; Markov cashout=${stats.markovSuggestedCashout}x

PERCENTILES
p99=${stats.p99SafeCashout}x; p95=${stats.p95SafeCashout}x; p90=${stats.p90SafeCashout}x
p80=${stats.p80SafeCashout}x; p70=${stats.p70SafeCashout}x; p60=${stats.p60SafeCashout}x; median=${stats.p50SafeCashout}x

TARGET HIT RATES
${[1.05, 1.1, 1.18, 1.2, 1.5, 2, 3, 5, 10].map(t => targetLine(stats, t)).join('\n')}

CONDITIONAL EVIDENCE
Pattern: ${patternSummary(stats)}
Sequence: ${sequenceSummary(stats)}
Minute profile: ${timeSummary(stats)}

TIME CONTEXT, NON-PREDICTIVE
LK time=${timeData.currentLKTimeStr}; phase=${timeData.lkPhase}; rule=${timeData.lkRule}
Traffic label=${nowPeak?.tag ?? 'NORM'}; traffic score=${nowPeak?.score ?? 50}; note=${timeData.lkNote}
Do not increase confidence or target because of PRIME phase or high traffic.

OUTPUT POLICY
- If ENFORCED_SKIP=false, tier_safe must equal the backend cashout_target (rounded to 2 decimals), maximum 3.00.
- tier_swing: 0 when backend swing_target is absent; otherwise use that value capped at 3.00.
- tier_moon: informational only, use a historical percentile, never > 3.00, never claim a large result is "due".
- cold_streak: true when sessionDanger=true or when at least 3 of the latest 5 rounds are below 2x.
- p5x_chance, p10x_chance, p20x_chance: use full-history hit rates where available.
- Output raw JSON only, no markdown or extra keys.`;
}

export const systemPrompt = `You are a conservative JSON formatter for a crash-game statistics service. You do not predict random outcomes or use gambler's-fallacy reasoning. The deterministic backend signal is authoritative and cannot be upgraded by you.

Return exactly this JSON object:
{
"tier_safe": number,
"tier_swing": number,
"tier_moon": number,
"skip_round": boolean,
"cold_streak": boolean,
"confidence": number,
"reasoning": string,
"p5x_chance": number,
"p10x_chance": number,
"p20x_chance": number
}

Rules:
- Output valid JSON only.
- Confidence is an integer from 0 to 60.
- All three tier values must be between 0 and 3.00. Never output a tier above 3.00.
- Probabilities are integers from 0 to 100.
- Reasoning is exactly two short sentences with no guarantees.
- If ENFORCED_SKIP is true, skip_round=true and all three tiers=0.
- Never claim that a recovery is due after low rounds or that a crash is due after high rounds.`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function finiteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function integerInRange(v: unknown, lo: number, hi: number): number | null {
  const n = finiteNumber(v);
  if (n === null || !Number.isInteger(n) || n < lo || n > hi) return null;
  return n;
}

function parsePrediction(v: unknown): AIPrediction | null {
  if (!isRecord(v)) return null;
  const tierSafe   = finiteNumber(v.tier_safe);
  const tierSwing  = finiteNumber(v.tier_swing);
  const tierMoon   = finiteNumber(v.tier_moon);
  const confidence = integerInRange(v.confidence, 0, AI_CONFIDENCE_CEIL);
  const p5  = integerInRange(v.p5x_chance,  0, 100);
  const p10 = integerInRange(v.p10x_chance, 0, 100);
  const p20 = integerInRange(v.p20x_chance, 0, 100);
  if (
    tierSafe === null || tierSwing === null || tierMoon === null ||
    confidence === null || p5 === null || p10 === null || p20 === null ||
    typeof v.skip_round  !== 'boolean' ||
    typeof v.cold_streak !== 'boolean' ||
    typeof v.reasoning   !== 'string'  ||
    v.reasoning.length === 0 ||
    v.reasoning.length > MAX_REASONING_LENGTH
  ) return null;
  return {
    tier_safe: tierSafe, tier_swing: tierSwing, tier_moon: tierMoon,
    skip_round: v.skip_round, cold_streak: v.cold_streak,
    confidence, reasoning: v.reasoning.trim(),
    p5x_chance: p5, p10x_chance: p10, p20x_chance: p20,
  };
}

function extractJsonObject(text: string): unknown {
  const t = text.trim();
  try { return JSON.parse(t) as unknown; } catch { /* fall through */ }
  const f = t.indexOf('{'), l = t.lastIndexOf('}');
  if (f < 0 || l <= f) return null;
  try { return JSON.parse(t.slice(f, l + 1)) as unknown; } catch { return null; }
}

function enforcePrediction(
  p: AIPrediction,
  stats: CrashStats,
  betSignal: BetSignal,
  timeData: LKTimeData,
): AIPrediction {
  const mustSkip = enforcedSkip(stats, betSignal, timeData);
  const confidence = Math.min(
    Math.max(0, Math.round(p.confidence)),
    stats.signalConfidence,
    AI_CONFIDENCE_CEIL,
  );
  // Use sessionDanger from stats (authoritative) instead of re-computing
  const coldStreak = stats.sessionDanger ||
    stats.recentOutcomes.slice(0, 5).filter(v => v < 2).length >= 3;

  if (mustSkip) {
    return { ...p, tier_safe: 0, tier_swing: 0, tier_moon: 0, skip_round: true, cold_streak: coldStreak, confidence };
  }

  const safeTarget  = Math.max(1.10, Math.min(betSignal.cashout_target, SIGNAL_MAX_CASHOUT));
  const swingTarget = betSignal.swing_target === null
    ? 0
    : Math.min(Math.max(safeTarget, betSignal.swing_target), SIGNAL_MAX_CASHOUT);
  const moonFloor   = swingTarget > 0 ? swingTarget : safeTarget;

  return {
    ...p,
    tier_safe:   Math.round(safeTarget  * 100) / 100,
    tier_swing:  Math.round(swingTarget * 100) / 100,
    tier_moon:   Math.round(Math.min(Math.max(moonFloor, p.tier_moon), SIGNAL_MAX_CASHOUT) * 100) / 100,
    skip_round:  false,
    cold_streak: coldStreak,
    confidence,
    p5x_chance:  Math.min(100, Math.max(0, Math.round(p.p5x_chance))),
    p10x_chance: Math.min(100, Math.max(0, Math.round(p.p10x_chance))),
    p20x_chance: Math.min(100, Math.max(0, Math.round(p.p20x_chance))),
  };
}

export async function callAI(
  prompt: string,
  userMessage: string,
  context?: { stats: CrashStats; betSignal: BetSignal; timeData: LKTimeData },
): Promise<AIPredictionResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  for (const model of AI_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://plane-crash.vercel.app',
          'X-Title': 'Crash Statistics Dashboard',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user',   content: userMessage },
          ],
          temperature: 0,
          max_tokens:  350,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      if (!response.ok) continue;
      const payload = await response.json() as OpenRouterResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string') continue;
      const parsed = parsePrediction(extractJsonObject(content));
      if (!parsed) continue;
      return {
        result: context
          ? enforcePrediction(parsed, context.stats, context.betSignal, context.timeData)
          : parsed,
        model,
      };
    } catch { /* try next model */ } finally { clearTimeout(timer); }
  }
  return null;
}

export function buildFallbackPrediction(
  stats: CrashStats,
  betSignal: BetSignal,
  timeData: LKTimeData,
): AIPrediction {
  const mustSkip   = enforcedSkip(stats, betSignal, timeData);
  const coldStreak = stats.sessionDanger ||
    stats.recentOutcomes.slice(0, 5).filter(v => v < 2).length >= 3;
  const confidence = Math.min(Math.round(stats.signalConfidence * 0.7), AI_CONFIDENCE_CEIL);

  if (mustSkip) {
    return {
      tier_safe: 0, tier_swing: 0, tier_moon: 0,
      skip_round: true, cold_streak: coldStreak, confidence: 0,
      reasoning: 'Risk controls require skipping this round. No bet is recommended.',
      p5x_chance: 0, p10x_chance: 0, p20x_chance: 0,
    };
  }

  const safeTarget  = Math.max(1.10, Math.min(betSignal.cashout_target, SIGNAL_MAX_CASHOUT));
  const swingTarget = betSignal.swing_target !== null
    ? Math.min(betSignal.swing_target, SIGNAL_MAX_CASHOUT)
    : 0;

  // Empirical probabilities anchored to 97% RTP math
  const p5  = Math.round(Math.min(100, (0.97 / 5)  * 100));
  const p10 = Math.round(Math.min(100, (0.97 / 10) * 100));
  const p20 = Math.round(Math.min(100, (0.97 / 20) * 100));

  return {
    tier_safe:   Math.round(safeTarget  * 100) / 100,
    tier_swing:  Math.round(swingTarget * 100) / 100,
    tier_moon:   Math.round(Math.min(safeTarget * 1.2, SIGNAL_MAX_CASHOUT) * 100) / 100,
    skip_round:  false,
    cold_streak: coldStreak,
    confidence,
    reasoning: `Backend ${stats.masterSignal} signal at ${stats.riskScore}/100 risk. Target ${safeTarget.toFixed(2)}x is within the stable 3.00x cap.`,
    p5x_chance:  p5,
    p10x_chance: p10,
    p20x_chance: p20,
  };
}
