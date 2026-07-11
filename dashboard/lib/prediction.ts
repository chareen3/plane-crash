import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { computeBetSignal, computeStats, type BetTimeData, type CrashStats } from './stats';

export type TimeSlot = 'night' | 'morning' | 'afternoon' | 'evening';

export interface CrashRoundRow {
  crash_point: number | string | null;
  created_at: string;
  hour_sl?: number | null;
}

export interface PatternAnalysis {
  prediction: 'NO_DATA' | 'CONSERVATIVE' | 'NORMAL' | 'AGGRESSIVE' | 'SKIP';
  avg_crash: number;
  pct_below_2x: number;
  confidence: number;
  stats: CrashStats | null;
  sample_size: number;
  warning?: string;
}

export interface PredictionResult extends PatternAnalysis {
  time_slot: TimeSlot;
  sri_lanka_hour: number;
  queried_same_hour: boolean;
  cashout_target: number;
  master_signal: CrashStats['masterSignal'] | 'NO_DATA';
  risk_score: number;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.');
}

if (!SUPABASE_SERVER_KEY) {
  throw new Error('No Supabase server or anonymous key is configured.');
}

/** Server-only client. Never import this module into a Client Component. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVER_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function getSriLankaParts(now: Date = new Date()): { hour: number; minute: number } {
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
    const hour = hourText === undefined ? Number.NaN : Number.parseInt(hourText, 10);
    const minute = minuteText === undefined ? Number.NaN : Number.parseInt(minuteText, 10);

    if (Number.isInteger(hour) && Number.isInteger(minute)) {
      return { hour, minute };
    }
  } catch {
    // Fall through to the fixed-offset calculation.
  }

  // Asia/Colombo currently uses UTC+05:30 without daylight saving time.
  const colombo = new Date(now.getTime() + 5.5 * 60 * 60 * 1_000);
  return {
    hour: colombo.getUTCHours(),
    minute: colombo.getUTCMinutes(),
  };
}

export function getSriLankaTimeSlot(now: Date = new Date()): TimeSlot {
  const { hour } = getSriLankaParts(now);
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function toStatsTimeData(now: Date = new Date()): BetTimeData {
  const { hour, minute } = getSriLankaParts(now);
  const currentLKTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  let lkPhase: string;
  if (hour < 6) lkPhase = 'SLEEP';
  else if (hour < 8) lkPhase = 'MORNING';
  else if (hour < 17) lkPhase = 'DAY';
  else if (hour < 19) lkPhase = 'EVENING';
  else if (hour < 23) lkPhase = 'PRIME';
  else lkPhase = 'LATE';

  return {
    isLKSleep: lkPhase === 'SLEEP',
    currentLKTimeStr,
    lkPhase,
  };
}

function normalizeRows(data: readonly CrashRoundRow[]): {
  crash_point: number;
  created_at: string;
}[] {
  const seen = new Set<string>();
  const normalized: { crash_point: number; created_at: string }[] = [];

  for (const row of data) {
    const crashPoint = Number(row.crash_point);
    const timestamp = Date.parse(row.created_at);
    if (!Number.isFinite(crashPoint) || crashPoint < 1 || !Number.isFinite(timestamp)) {
      continue;
    }

    // Defensive protection for the duplicate inserts visible in the supplied DB sample.
    const identity = `${timestamp}|${crashPoint}`;
    if (seen.has(identity)) continue;
    seen.add(identity);

    normalized.push({
      crash_point: crashPoint,
      created_at: new Date(timestamp).toISOString(),
    });
  }

  return normalized.sort(
    (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
  );
}

export function analyzePattern(data: readonly CrashRoundRow[]): PatternAnalysis {
  const rounds = normalizeRows(data);
  if (rounds.length === 0) {
    return {
      prediction: 'NO_DATA',
      avg_crash: 0,
      pct_below_2x: 0,
      confidence: 0,
      stats: null,
      sample_size: 0,
      warning: 'No valid crash rounds were available.',
    };
  }

  const stats = computeStats(rounds);
  const prediction: PatternAnalysis['prediction'] =
    stats.masterSignal === 'ABORT' || stats.masterSignal === 'DANGER'
      ? 'SKIP'
      : stats.masterSignal === 'STRONG_BUY'
        ? 'AGGRESSIVE'
        : stats.masterSignal === 'BUY'
          ? 'NORMAL'
          : 'CONSERVATIVE';

  return {
    prediction,
    avg_crash: stats.mean,
    pct_below_2x: stats.pUnder2,
    confidence: stats.signalConfidence,
    stats,
    sample_size: stats.count,
    ...(stats.instantClusterRisk > 60
      ? { warning: stats.instantCrashWarning }
      : {}),
  };
}

/**
 * Retrieves recent rounds and computes the authoritative deterministic signal.
 *
 * Same-hour filtering is optional and off by default. Filtering only by the
 * current hour creates a biased, sparse sample and has no proven predictive
 * value for an independent RNG.
 */
export async function getPrediction(
  supabaseClient: SupabaseClient = supabase,
  timeSlot: TimeSlot = getSriLankaTimeSlot(),
  options: {
    sameSriLankaHourOnly?: boolean;
    limit?: number;
    now?: Date;
  } = {},
): Promise<PredictionResult> {
  const now = options.now ?? new Date();
  const { hour: sriLankaHour } = getSriLankaParts(now);
  const limit = Math.min(1_000, Math.max(50, options.limit ?? 500));
  const sameHourOnly = options.sameSriLankaHourOnly ?? false;

  let query = supabaseClient
    .from('crash_rounds')
    .select('crash_point, created_at, hour_sl')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (sameHourOnly) {
    query = query.eq('hour_sl', sriLankaHour);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to retrieve crash rounds: ${error.message}`);
  }

  const rows = (data ?? []) as CrashRoundRow[];
  const analysis = analyzePattern(rows);

  if (!analysis.stats) {
    return {
      ...analysis,
      time_slot: timeSlot,
      sri_lanka_hour: sriLankaHour,
      queried_same_hour: sameHourOnly,
      cashout_target: 0,
      master_signal: 'NO_DATA',
      risk_score: 50,
    };
  }

  const betSignal = computeBetSignal(
    analysis.stats,
    '1xbet',
    toStatsTimeData(now),
  );

  return {
    ...analysis,
    prediction: betSignal.should_bet ? analysis.prediction : 'SKIP',
    time_slot: timeSlot,
    sri_lanka_hour: sriLankaHour,
    queried_same_hour: sameHourOnly,
    cashout_target: betSignal.cashout_target,
    master_signal: analysis.stats.masterSignal,
    risk_score: analysis.stats.riskScore,
    ...(!betSignal.should_bet && betSignal.skip_reason
      ? { warning: betSignal.skip_reason }
      : {}),
  };
}
