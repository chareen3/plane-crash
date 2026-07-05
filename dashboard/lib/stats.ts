/**
 * stats.ts — Statistical prediction engine for crash games.
 *
 * Key insight from research: crash games use provably-fair RNG (geometric/exponential distribution).
 * True outcome prediction is mathematically impossible. What we CAN do:
 *  - Compute the "safe cashout" point where P(crash ≥ X) is historically high
 *  - Use EMA to track momentum
 *  - Find percentile targets (e.g. "70% of rounds reached at least 1.8x")
 *  - Detect hot/cold streaks and volatility shifts
 *  - Use the fundamental formula: P(win at X) ≈ historical_count(crash ≥ X) / total
 */

/** Per-target analysis for a specific cashout multiplier */
export interface TargetLevel {
  target: number;       // e.g. 1.2, 2.0, 5.0
  hitCount: number;     // how many rounds reached this
  hitRate: number;      // % of rounds that reached this (0–100)
  recentHitRate: number; // % over last 20 rounds
  signal: 'SAFE' | 'OK' | 'RISKY' | 'RARE'; // how reliable is this target
  lastHitAgo: number;   // how many rounds ago this last triggered (0 = just now)
  longestGap: number;   // worst dry-spell: max consecutive rounds without hitting
  ev: number;           // expected value per unit bet = (hitRate/100 * target) - 1
}

export interface CrashStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;

  // Probability bands (% of rounds that were in each range)
  pUnder2: number;
  p2to5: number;
  pOver5: number;

  // Per-level target analysis
  targets: TargetLevel[];

  // Percentile-based safe cashout targets
  p90SafeCashout: number;
  p80SafeCashout: number;
  p70SafeCashout: number;
  p60SafeCashout: number;
  p50SafeCashout: number;

  // EMA
  ema: number;

  // Streak analysis
  currentLowStreak: number;
  currentHighStreak: number;
  longestLowStreak: number;

  // Trend
  recentMean: number;
  olderMean: number;
  trend: 'rising' | 'falling' | 'flat';

  // Cashout recommendations
  suggestedCashout: number;
  suggestedCashoutWinRate: number;
  conservativeCashout: number;
  aggressiveCashout: number;

  // Risk scoring
  riskScore: number;
  riskLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  volatility: 'low' | 'normal' | 'high';
}

export function computeStats(values: number[]): CrashStats {
  if (values.length === 0) return emptyStats();

  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);

  // ── Basic statistics ──
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];

  // ── Probability bands ──
  const under2 = values.filter(v => v < 2).length;
  const in2to5  = values.filter(v => v >= 2 && v < 5).length;
  const over5   = values.filter(v => v >= 5).length;
  const pUnder2 = Math.round((under2 / n) * 100);
  const p2to5   = Math.round((in2to5  / n) * 100);
  const pOver5  = Math.round((over5   / n) * 100);

  // ── Per-level target analysis ──
  const TARGET_LEVELS = [1.2, 1.5, 2.0, 3.0, 5.0, 10.0, 15.0, 20.0, 25.0];
  const recent20 = values.slice(0, Math.min(20, n));

  const targets: TargetLevel[] = TARGET_LEVELS.map(target => {
    const hitCount = values.filter(v => v >= target).length;
    const hitRate  = Math.round((hitCount / n) * 100);
    const recentHitCount = recent20.filter(v => v >= target).length;
    const recentHitRate  = Math.round((recentHitCount / recent20.length) * 100);

    // How many rounds ago did it last hit? (values[0] = most recent)
    let lastHitAgo = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i] >= target) { lastHitAgo = i; break; }
    }

    // Longest consecutive gap without hitting
    let longestGap = 0, currentGap = 0;
    for (const v of [...values].reverse()) { // chronological order
      if (v >= target) { longestGap = Math.max(longestGap, currentGap); currentGap = 0; }
      else { currentGap++; }
    }
    longestGap = Math.max(longestGap, currentGap);

    // Expected value per unit: EV = (hitRate/100 * target) - 1
    // Positive EV = statistically favorable historically
    const ev = Math.round(((hitRate / 100) * target - 1) * 100) / 100;

    // Signal
    let signal: TargetLevel['signal'];
    if (hitRate >= 80) signal = 'SAFE';
    else if (hitRate >= 55) signal = 'OK';
    else if (hitRate >= 25) signal = 'RISKY';
    else signal = 'RARE';

    return { target, hitCount, hitRate, recentHitRate, signal, lastHitAgo, longestGap, ev };
  });

  // ── Percentile-based safe cashout targets ──
  // "What multiplier X did at least P% of rounds reach?"
  // values[0] is most recent (desc order), sorted is ascending.
  function winRateAt(target: number): number {
    return Math.round((values.filter(v => v >= target).length / n) * 100);
  }

  function cashoutAtWinRate(targetPct: number): number {
    // Binary search in sorted array for the multiplier where winRate ≈ targetPct
    let lo = sorted[0], hi = sorted[n - 1];
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const wr = (values.filter(v => v >= mid).length / n) * 100;
      if (wr > targetPct) lo = mid; else hi = mid;
    }
    return Math.round(((lo + hi) / 2) * 100) / 100;
  }

  const p90SafeCashout = cashoutAtWinRate(90);
  const p80SafeCashout = cashoutAtWinRate(80);
  const p70SafeCashout = cashoutAtWinRate(70);
  const p60SafeCashout = cashoutAtWinRate(60);
  const p50SafeCashout = +median.toFixed(2);

  // ── EMA — weight recent values more heavily ──
  // alpha = 2 / (span + 1), span = min(20, n)
  const span = Math.min(20, n);
  const alpha = 2 / (span + 1);
  const chronological = [...values].reverse(); // oldest first
  let ema = chronological[0];
  for (let i = 1; i < chronological.length; i++) {
    ema = alpha * chronological[i] + (1 - alpha) * ema;
  }
  ema = Math.round(ema * 100) / 100;

  // ── Streak analysis ──
  let currentLowStreak = 0, currentHighStreak = 0, longestLowStreak = 0;
  let tempLow = 0;
  for (const v of values) { // values[0] = most recent
    if (v < 2) { currentLowStreak++; } else break;
  }
  for (const v of values) {
    if (v >= 2) { currentHighStreak++; } else break;
  }
  for (const v of [...values].reverse()) {
    if (v < 2) { tempLow++; longestLowStreak = Math.max(longestLowStreak, tempLow); }
    else tempLow = 0;
  }

  // ── Trend ──
  const recent = values.slice(0, 5);
  const older  = values.slice(5, 15);
  const recentMean = recent.length > 0 ? recent.reduce((s, v) => s + v, 0) / recent.length : mean;
  const olderMean  = older.length  > 0 ? older.reduce((s, v) => s + v, 0) / older.length   : mean;
  let trend: 'rising' | 'falling' | 'flat' = 'flat';
  if (recentMean > olderMean * 1.2) trend = 'rising';
  else if (recentMean < olderMean * 0.8) trend = 'falling';

  // ── Volatility ──
  const cvRatio = stdDev / mean;
  let volatility: 'low' | 'normal' | 'high' = 'normal';
  if (cvRatio > 1.2) volatility = 'high';
  else if (cvRatio < 0.5) volatility = 'low';

  // ── Risk Score (0–100) ──
  let riskScore = pUnder2; // base
  if (currentLowStreak >= 3) riskScore = Math.min(100, riskScore + 20);
  if (currentLowStreak >= 5) riskScore = Math.min(100, riskScore + 15);
  if (stdDev > 3) riskScore = Math.min(100, riskScore + 10);
  if (trend === 'falling') riskScore = Math.min(100, riskScore + 10);
  if (trend === 'rising')  riskScore = Math.max(0, riskScore - 10);
  if (ema < 2) riskScore = Math.min(100, riskScore + 10);
  riskScore = Math.round(riskScore);

  let riskLabel: 'LOW' | 'MEDIUM' | 'HIGH';
  if (riskScore >= 60) riskLabel = 'HIGH';
  else if (riskScore >= 35) riskLabel = 'MEDIUM';
  else riskLabel = 'LOW';

  // ── Primary cashout recommendation ──
  // Strategy: blend EMA with percentile analysis
  // Use 70% win rate target as the "balanced" recommendation
  // But pull it down in risky periods, up in calm periods
  let suggestedCashout = p70SafeCashout;
  if (riskLabel === 'HIGH') suggestedCashout = p80SafeCashout; // be more conservative
  if (riskLabel === 'LOW')  suggestedCashout = p60SafeCashout; // can afford more risk
  suggestedCashout = Math.max(1.2, Math.round(suggestedCashout * 100) / 100);
  const suggestedCashoutWinRate = winRateAt(suggestedCashout);

  const conservativeCashout = Math.max(1.1, Math.round(p90SafeCashout * 100) / 100);
  const aggressiveCashout   = Math.max(1.5, Math.round(p50SafeCashout * 100) / 100);

  const confidence = Math.min(100, Math.round((n / 50) * 100));

  return {
    count: n, mean: +mean.toFixed(2), median: +median.toFixed(2),
    stdDev: +stdDev.toFixed(2), min: +min.toFixed(2), max: +max.toFixed(2),
    pUnder2, p2to5, pOver5,
    targets,
    p90SafeCashout, p80SafeCashout, p70SafeCashout, p60SafeCashout, p50SafeCashout,
    ema, currentLowStreak, currentHighStreak, longestLowStreak,
    recentMean: +recentMean.toFixed(2), olderMean: +olderMean.toFixed(2), trend,
    suggestedCashout, suggestedCashoutWinRate,
    conservativeCashout, aggressiveCashout,
    riskScore, riskLabel, confidence, volatility,
  };
}

function emptyStats(): CrashStats {
  const emptyTargets = [1.2, 1.5, 2.0, 3.0, 5.0, 10.0, 15.0, 20.0, 25.0].map(target => ({
    target, hitCount: 0, hitRate: 0, recentHitRate: 0,
    signal: 'RARE' as const, lastHitAgo: -1, longestGap: 0, ev: -1,
  }));
  return {
    count: 0, mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
    pUnder2: 0, p2to5: 0, pOver5: 0,
    targets: emptyTargets,
    p90SafeCashout: 1.2, p80SafeCashout: 1.5, p70SafeCashout: 1.8,
    p60SafeCashout: 2.5, p50SafeCashout: 3.0,
    ema: 0, currentLowStreak: 0, currentHighStreak: 0, longestLowStreak: 0,
    recentMean: 0, olderMean: 0, trend: 'flat',
    suggestedCashout: 1.5, suggestedCashoutWinRate: 0,
    conservativeCashout: 1.2, aggressiveCashout: 2.0,
    riskScore: 50, riskLabel: 'MEDIUM', confidence: 0, volatility: 'normal',
  };
}

/**
 * Grade a prediction: was the risk label correct for the actual outcome?
 */
export function gradePrediction(predicted: 'LOW' | 'MEDIUM' | 'HIGH', actual: number): boolean {
  if (predicted === 'HIGH')    return actual < 2;
  if (predicted === 'MEDIUM') return actual >= 2 && actual < 5;
  if (predicted === 'LOW')   return actual >= 5;
  return false;
}

export function computeBetSignal(stats: CrashStats): {
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
  let cashout_target = stats.p90SafeCashout;

  if (stats.currentHighStreak >= 3 && stats.trend === 'rising') {
    strategy = 'AGGRESSIVE';
    cashout_target = stats.p70SafeCashout;
  } else if (stats.riskScore < 35 && stats.trend !== 'falling') {
    strategy = 'BALANCED';
    cashout_target = stats.p80SafeCashout;
  }

  // Enforce a hard minimum on cashout target
  cashout_target = Math.max(1.10, cashout_target);

  return { should_bet: true, skip_reason: null, strategy, cashout_target };
}

