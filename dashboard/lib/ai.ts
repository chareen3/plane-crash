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

interface OpenRouterMessage {
  content?: unknown;
}

interface OpenRouterChoice {
  message?: OpenRouterMessage;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

const AI_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
] as const;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REASONING_LENGTH = 500;

export const PEAK_HOURS_UTC: readonly PeakHourProfile[] = [
  { hour: 0, label: '00:00 UTC', score: 40, tag: 'NORM', note: 'LK 5:30 AM' },
  { hour: 1, label: '01:00 UTC', score: 50, tag: 'NORM', note: 'LK 6:30 AM' },
  { hour: 2, label: '02:00 UTC', score: 55, tag: 'NORM', note: 'LK 7:30 AM' },
  { hour: 3, label: '03:00 UTC', score: 65, tag: 'WARM', note: 'LK 8:30 AM' },
  { hour: 4, label: '04:00 UTC', score: 65, tag: 'WARM', note: 'LK 9:30 AM' },
  { hour: 5, label: '05:00 UTC', score: 65, tag: 'WARM', note: 'LK 10:30 AM' },
  { hour: 6, label: '06:00 UTC', score: 65, tag: 'WARM', note: 'LK 11:30 AM' },
  { hour: 7, label: '07:00 UTC', score: 70, tag: 'HOT', note: 'LK 12:30 PM' },
  { hour: 8, label: '08:00 UTC', score: 65, tag: 'WARM', note: 'LK 1:30 PM' },
  { hour: 9, label: '09:00 UTC', score: 65, tag: 'WARM', note: 'LK 2:30 PM' },
  { hour: 10, label: '10:00 UTC', score: 65, tag: 'WARM', note: 'LK 3:30 PM' },
  { hour: 11, label: '11:00 UTC', score: 70, tag: 'HOT', note: 'LK 4:30 PM' },
  { hour: 12, label: '12:00 UTC', score: 75, tag: 'HOT', note: 'LK 5:30 PM' },
  { hour: 13, label: '13:00 UTC', score: 80, tag: 'HOT', note: 'LK 6:30 PM' },
  { hour: 14, label: '14:00 UTC', score: 95, tag: 'PEAK', note: 'LK 7:30 PM' },
  { hour: 15, label: '15:00 UTC', score: 100, tag: 'PEAK', note: 'LK 8:30 PM' },
  { hour: 16, label: '16:00 UTC', score: 95, tag: 'PEAK', note: 'LK 9:30 PM' },
  { hour: 17, label: '17:00 UTC', score: 85, tag: 'HOT', note: 'LK 10:30 PM' },
  { hour: 18, label: '18:00 UTC', score: 70, tag: 'WARM', note: 'LK 11:30 PM' },
  { hour: 19, label: '19:00 UTC', score: 40, tag: 'NORM', note: 'LK 12:30 AM' },
  { hour: 20, label: '20:00 UTC', score: 40, tag: 'NORM', note: 'LK 1:30 AM' },
  { hour: 21, label: '21:00 UTC', score: 40, tag: 'NORM', note: 'LK 2:30 AM' },
  { hour: 22, label: '22:00 UTC', score: 40, tag: 'NORM', note: 'LK 3:30 AM' },
  { hour: 23, label: '23:00 UTC', score: 40, tag: 'NORM', note: 'LK 4:30 AM' },
] as const;

/**
 * Traffic labels are UX context only. They must never be treated as evidence
 * that an independent RNG outcome is more predictable at a particular hour.
 */
export const LK_PHASE_TABLE: Readonly<Record<number, LKPhaseInfo>> = {
  0: { phase: 'SLEEP', rule: 'SKIP', playerCount: '<15', note: '12 AM. Safety lock.' },
  1: { phase: 'SLEEP', rule: 'SKIP', playerCount: '<10', note: '1 AM. Safety lock.' },
  2: { phase: 'SLEEP', rule: 'SKIP', playerCount: '<10', note: '2 AM. Safety lock.' },
  3: { phase: 'SLEEP', rule: 'SKIP', playerCount: '<10', note: '3 AM. Safety lock.' },
  4: { phase: 'SLEEP', rule: 'SKIP', playerCount: '<10', note: '4 AM. Safety lock.' },
  5: { phase: 'SLEEP', rule: 'SKIP', playerCount: '10-15', note: '5 AM. Safety lock.' },
  6: { phase: 'MORNING', rule: 'CAUTION', playerCount: '15-30', note: '6 AM. Conservative targets.' },
  7: { phase: 'MORNING', rule: 'CAUTION', playerCount: '30-50', note: '7 AM. Conservative targets.' },
  8: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '50-100', note: '8 AM. Standard controls.' },
  9: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '80-120', note: '9 AM. Standard controls.' },
  10: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '100-150', note: '10 AM. Standard controls.' },
  11: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '100-150', note: '11 AM. Standard controls.' },
  12: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '120-180', note: '12 PM. Standard controls.' },
  13: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '100-150', note: '1 PM. Standard controls.' },
  14: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '100-150', note: '2 PM. Standard controls.' },
  15: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '100-150', note: '3 PM. Standard controls.' },
  16: { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '150-200', note: '4 PM. Standard controls.' },
  17: { phase: 'EVENING', rule: 'BET_NORMAL', playerCount: '150-200', note: '5 PM. Standard controls.' },
  18: { phase: 'EVENING', rule: 'BET_SAFE', playerCount: '200-280', note: '6 PM. Conservative controls.' },
  19: { phase: 'PRIME', rule: 'BET_SAFE', playerCount: '300-400', note: '7 PM. Conservative controls.' },
  20: { phase: 'PRIME', rule: 'BET_SAFE', playerCount: '400-500', note: '8 PM. Conservative controls.' },
  21: { phase: 'PRIME', rule: 'BET_SAFE', playerCount: '400-600', note: '9 PM. Conservative controls.' },
  22: { phase: 'PRIME', rule: 'BET_SAFE', playerCount: '300-400', note: '10 PM. Conservative controls.' },
  23: { phase: 'LATE', rule: 'CAUTION', playerCount: '100-200', note: '11 PM. Reduce exposure.' },
};

const FALLBACK_PHASE: LKPhaseInfo = {
  phase: 'DAY',
  rule: 'BET_NORMAL',
  playerCount: 'Unknown',
  note: 'Standard controls.',
};

export function getLKTimeData(now: Date = new Date()): LKTimeData {
  let lkHour: number | undefined;
  let lkMinute: number | undefined;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(now);
    const hourText = parts.find((part) => part.type === 'hour')?.value;
    const minuteText = parts.find((part) => part.type === 'minute')?.value;
    if (hourText !== undefined) lkHour = Number.parseInt(hourText, 10);
    if (minuteText !== undefined) lkMinute = Number.parseInt(minuteText, 10);
  } catch {
    // Fixed-offset fallback. Asia/Colombo currently has no daylight saving time.
  }

  if (!Number.isInteger(lkHour) || !Number.isInteger(lkMinute)) {
    const colomboMillis = now.getTime() + 5.5 * 60 * 60 * 1_000;
    const colombo = new Date(colomboMillis);
    lkHour = colombo.getUTCHours();
    lkMinute = colombo.getUTCMinutes();
  }

  const safeHour = lkHour ?? 0;
  const safeMinute = lkMinute ?? 0;
  const info = LK_PHASE_TABLE[safeHour] ?? FALLBACK_PHASE;

  return {
    currentUTCHour: now.getUTCHours(),
    currentLKHour: safeHour,
    currentLKMinute: safeMinute,
    currentLKTimeStr: `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`,
    lkPhase: info.phase,
    lkRule: info.rule,
    lkPlayerCount: info.playerCount,
    lkNote: info.note,
    isLKPrime: info.phase === 'PRIME',
    isLKSleep: info.phase === 'SLEEP',
    currentAMPM: safeHour >= 12 ? 'PM' : 'AM',
    peakHours: PEAK_HOURS_UTC,
  };
}

function formatNumber(value: number | undefined, digits = 2): string {
  return Number.isFinite(value) ? (value as number).toFixed(digits) : 'N/A';
}

function targetLine(stats: CrashStats, target: number): string {
  const match = stats.targets.find((item) => Math.abs(item.target - target) < 0.01);
  return match
    ? `${target.toFixed(2)}x: ${match.hitRate}% overall, ${match.recentHitRate}% recent, EV ${match.ev}`
    : `${target.toFixed(2)}x: unavailable`;
}

function patternSummary(stats: CrashStats): string {
  const pattern = stats.detectedPatterns[0];
  if (!pattern) return 'No matching streak pattern with historical outcomes.';

  const rates = pattern.nextRoundWinRates
    .map((rate) => `${rate.target.toFixed(2)}x=${rate.hitRate}%`)
    .join(', ');
  return `${pattern.patternName}; occurrences=${pattern.occurrences}; next-hit rates: ${rates}; p90=${pattern.p90 ?? 'N/A'}x, p80=${pattern.p80 ?? 'N/A'}x, p50=${pattern.p50 ?? 'N/A'}x.`;
}

function sequenceSummary(stats: CrashStats): string {
  const sequence = stats.sequenceMatch;
  if (!sequence) return 'No matching n-gram sequence.';
  return `[${sequence.sequence.join(' -> ')}], occurrences=${sequence.occurrences}, INSTANT=${sequence.pInstantNext}%, safe>=1.15x=${sequence.pSafeNext}%, MED+=${sequence.pMedNext}%, HIGH=${sequence.pHighNext}%.`;
}

function timeSummary(stats: CrashStats): string {
  const time = stats.timePattern;
  if (!time) return 'No minute profile with at least 10 observations.';
  return `UTC minute ${time.minute}, observations=${time.occurrences}, p90=${time.p90}x, p80=${time.p80}x, p50=${time.p50}x.`;
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
  const nowPeak = timeData.peakHours.find(
    (profile) => profile.hour === timeData.currentUTCHour,
  );
  const mustSkip = enforcedSkip(stats, betSignal, timeData);
  const markovMedHigh = stats.markovNext.MED + stats.markovNext.HIGH;

  return `Analyze the supplied deterministic statistics and return the required JSON.

CRITICAL LIMITS
- Crash outcomes may be independent provably-fair RNG. Do not claim certainty, a due recovery, or causal power from traffic, time, streaks, or previous rounds.
- The backend decision is authoritative. You may make its language clearer, but never turn SKIP, ABORT, or DANGER into a bet.
- ENFORCED_SKIP=${mustSkip}. If true: skip_round must be true, tier_safe must equal 0, tier_swing must equal 0, and tier_moon must equal 0.
- Probabilities must be empirical estimates only and remain between 0 and 100.
- Confidence must not exceed the backend signal confidence and must never exceed 75.
- Reasoning must contain exactly two short sentences.

SESSION
Rounds=${stats.count}
Mean=${formatNumber(stats.mean)}x; median=${formatNumber(stats.median)}x; stdDev=${formatNumber(stats.stdDev)}
EMA=${formatNumber(stats.ema)}x; trend=${stats.trend}; volatility=${stats.volatility} (${stats.volatilityPct}%)
Recent outcomes newest-first=${stats.recentOutcomes.map((value) => `${value}x`).join(', ') || 'N/A'}
Low streak=${stats.currentLowStreak}; high streak=${stats.currentHighStreak}
Session momentum=${stats.sessionMomentum}; danger=${stats.sessionDanger}; hot=${stats.sessionHot}

AUTHORITATIVE BACKEND SIGNAL
Master signal=${stats.masterSignal}
Weighted risk=${stats.riskScore}/100 (${stats.riskLabel})
Signal confidence ceiling=${Math.min(stats.signalConfidence, 75)}
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
${[1.05, 1.1, 1.18, 1.2, 1.5, 2, 3, 5, 10].map((target) => targetLine(stats, target)).join('\n')}

CONDITIONAL EVIDENCE
Pattern: ${patternSummary(stats)}
Sequence: ${sequenceSummary(stats)}
Minute profile: ${timeSummary(stats)}

TIME CONTEXT, NON-PREDICTIVE
LK time=${timeData.currentLKTimeStr}; phase=${timeData.lkPhase}; rule=${timeData.lkRule}
Traffic label=${nowPeak?.tag ?? 'NORM'}; traffic score=${nowPeak?.score ?? 50}; note=${timeData.lkNote}
Do not increase confidence or target solely because the phase is PRIME or traffic is high.

OUTPUT POLICY
- If ENFORCED_SKIP=false, tier_safe must equal the backend cashout target after rounding to 2 decimals.
- tier_swing must be null-like behavior represented as 0 when the backend swing target is absent; otherwise use that target.
- tier_moon is informational only: use a historical percentile/target, never a claim that a large result is due.
- cold_streak means at least 3 of the latest 5 rounds are below 2x.
- p5x_chance, p10x_chance, and p20x_chance should use corresponding full-history target hit rates where available.
- Output raw JSON only, with no markdown or extra keys.`;
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
- Confidence is an integer from 0 to 75 and cannot exceed the supplied backend ceiling.
- Probabilities are integers from 0 to 100.
- Reasoning is exactly two short sentences and contains no guarantees.
- If ENFORCED_SKIP is true, skip_round=true and all three tiers=0.
- Never infer that a recovery is due after low rounds or that a crash is due after high rounds.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function integerInRange(value: unknown, min: number, max: number): number | null {
  const number = finiteNumber(value);
  if (number === null || !Number.isInteger(number) || number < min || number > max) {
    return null;
  }
  return number;
}

function parsePrediction(value: unknown): AIPrediction | null {
  if (!isRecord(value)) return null;

  const tierSafe = finiteNumber(value.tier_safe);
  const tierSwing = finiteNumber(value.tier_swing);
  const tierMoon = finiteNumber(value.tier_moon);
  const confidence = integerInRange(value.confidence, 0, 75);
  const p5 = integerInRange(value.p5x_chance, 0, 100);
  const p10 = integerInRange(value.p10x_chance, 0, 100);
  const p20 = integerInRange(value.p20x_chance, 0, 100);

  if (
    tierSafe === null
    || tierSwing === null
    || tierMoon === null
    || confidence === null
    || p5 === null
    || p10 === null
    || p20 === null
    || typeof value.skip_round !== 'boolean'
    || typeof value.cold_streak !== 'boolean'
    || typeof value.reasoning !== 'string'
    || value.reasoning.length === 0
    || value.reasoning.length > MAX_REASONING_LENGTH
  ) {
    return null;
  }

  return {
    tier_safe: tierSafe,
    tier_swing: tierSwing,
    tier_moon: tierMoon,
    skip_round: value.skip_round,
    cold_streak: value.cold_streak,
    confidence,
    reasoning: value.reasoning.trim(),
    p5x_chance: p5,
    p10x_chance: p10,
    p20x_chance: p20,
  };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace <= firstBrace) return null;
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown;
    } catch {
      return null;
    }
  }
}

/**
 * Reapply deterministic guardrails after model output. This prevents a valid
 * but disobedient JSON response from overriding the backend decision.
 */
function enforcePrediction(
  prediction: AIPrediction,
  stats: CrashStats,
  betSignal: BetSignal,
  timeData: LKTimeData,
): AIPrediction {
  const mustSkip = enforcedSkip(stats, betSignal, timeData);
  const confidence = Math.min(
    Math.max(0, Math.round(prediction.confidence)),
    stats.signalConfidence,
    75,
  );
  const coldStreak = stats.recentOutcomes
    .slice(0, 5)
    .filter((value) => value < 2).length >= 3;

  if (mustSkip) {
    return {
      ...prediction,
      tier_safe: 0,
      tier_swing: 0,
      tier_moon: 0,
      skip_round: true,
      cold_streak: coldStreak,
      confidence,
    };
  }

  const safeTarget = Math.max(1.05, betSignal.cashout_target);
  const swingTarget = betSignal.swing_target === null
    ? 0
    : Math.max(safeTarget, betSignal.swing_target);
  const moonFloor = swingTarget > 0 ? swingTarget : safeTarget;

  return {
    ...prediction,
    tier_safe: Math.round(safeTarget * 100) / 100,
    tier_swing: Math.round(swingTarget * 100) / 100,
    tier_moon: Math.round(Math.max(moonFloor, prediction.tier_moon) * 100) / 100,
    skip_round: false,
    cold_streak: coldStreak,
    confidence,
    p5x_chance: Math.min(100, Math.max(0, Math.round(prediction.p5x_chance))),
    p10x_chance: Math.min(100, Math.max(0, Math.round(prediction.p10x_chance))),
    p20x_chance: Math.min(100, Math.max(0, Math.round(prediction.p20x_chance))),
  };
}

export async function callAI(
  prompt: string,
  userMessage: string,
  context?: {
    stats: CrashStats;
    betSignal: BetSignal;
    timeData: LKTimeData;
  },
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
            { role: 'user', content: userMessage },
          ],
          temperature: 0,
          max_tokens: 350,
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
    } catch {
      // Try the next configured provider/model.
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

/**
 * Deterministic fallback for model outages and rate limits. Prefer this over
 * returning no prediction because it preserves the exact backend guardrails.
 */
export function buildFallbackPrediction(
  stats: CrashStats,
  betSignal: BetSignal,
  timeData: LKTimeData,
): AIPrediction {
  const mustSkip = enforcedSkip(stats, betSignal, timeData);
  const hitRate = (target: number): number =>
    stats.targets.find((item) => Math.abs(item.target - target) < 0.01)?.hitRate ?? 0;
  const coldStreak = stats.recentOutcomes
    .slice(0, 5)
    .filter((value) => value < 2).length >= 3;
  const confidence = Math.min(stats.signalConfidence, 75);

  if (mustSkip) {
    return {
      tier_safe: 0,
      tier_swing: 0,
      tier_moon: 0,
      skip_round: true,
      cold_streak: coldStreak,
      confidence,
      reasoning: `Backend controls returned ${stats.masterSignal} with ${stats.riskScore}/100 risk. Skip this round because the deterministic safety gate is active.`,
      p5x_chance: hitRate(5),
      p10x_chance: hitRate(10),
      p20x_chance: hitRate(20),
    };
  }

  return {
    tier_safe: betSignal.cashout_target,
    tier_swing: betSignal.swing_target ?? 0,
    tier_moon: Math.max(betSignal.swing_target ?? betSignal.cashout_target, stats.p50SafeCashout),
    skip_round: false,
    cold_streak: coldStreak,
    confidence,
    reasoning: `Backend signal is ${stats.masterSignal} with ${stats.sessionMomentum} momentum and ${stats.riskScore}/100 risk. Use the ${betSignal.cashout_target.toFixed(2)}x target without treating the estimate as a guarantee.`,
    p5x_chance: hitRate(5),
    p10x_chance: hitRate(10),
    p20x_chance: hitRate(20),
  };
}
