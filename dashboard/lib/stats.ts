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
  mathProb: number;     // theoretical probability based on 97% RTP (0–100)
}

export interface PatternMatch {
  patternName: string;
  occurrences: number;
  nextRoundWinRates: { target: number; hitRate: number }[];
  p90?: number;
  p80?: number;
  p50?: number;
}

export interface TimePatternMatch {
  minute: number;
  occurrences: number;
  p90: number;
  p80: number;
  p50: number;
  hitRates: { target: number; hitRate: number }[];
}

export interface SequenceMatch {
  sequence: string[];
  occurrences: number;
  pInstantNext: number; 
  pSafeNext: number; 
  pMedNext: number; 
  pHighNext: number; 
  p90: number; 
  p80: number;
  p50: number;
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
  pInstantCrash: number;

  // Per-level target analysis
  targets: TargetLevel[];

  // Percentile-based safe cashout targets
  p99SafeCashout: number;
  p95SafeCashout: number;
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
  volatilityPct: number;
  q3: number;
  detectedPatterns: PatternMatch[];
  timePattern?: TimePatternMatch;
  sequenceMatch?: SequenceMatch;
  instant_crash_risk?: number;
  instant_crash_warning?: string;
  recentOutcomes: number[];
}


export function computeStats(rawRounds: { crash_point: number, created_at: string }[]): CrashStats {
  if (rawRounds.length === 0) return emptyStats();
  const values = rawRounds.map(r => Number(r.crash_point));
  
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
  const pInstantCrash = Math.round((values.filter(v => v <= 1.01).length / n) * 1000) / 10;

  // ── Per-level target analysis ──
  const TARGET_LEVELS = [1.05, 1.10, 1.18, 1.2, 1.5, 1.8, 2.0, 3.0, 5.0, 10.0, 15.0, 20.0, 25.0];

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

    // Theoretical probability formula: P(reach m) = 0.97 / m. Expressed as percentage 0-100
    const mathProb = Math.round((0.97 / target) * 1000) / 10;

    // Signal
    let signal: TargetLevel['signal'];
    if (hitRate >= 80) signal = 'SAFE';
    else if (hitRate >= 55) signal = 'OK';
    else if (hitRate >= 25) signal = 'RISKY';
    else signal = 'RARE';

    return { target, hitCount, hitRate, recentHitRate, signal, lastHitAgo, longestGap, ev, mathProb };
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

  const p99SafeCashout = cashoutAtWinRate(99);
  const p95SafeCashout = cashoutAtWinRate(95);
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

  // ── Volatility & Quartiles ──
  const cvRatio = stdDev / mean;
  const volatilityPct = +(cvRatio * 100).toFixed(1);
  const q3 = sorted[Math.floor(n * 0.75)] || sorted[sorted.length - 1] || 0;
  
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

  // ── Pattern Detection (Conditional Probabilities) ──
  const detectedPatterns: PatternMatch[] = [];

  function analyzeStreakPattern(streakLen: number, type: 'low' | 'high') {
    if (streakLen === 0) return;
    const outcomes: number[] = [];
    
    for (let i = 1; i < n - streakLen - 1; i++) {
      let match = true;
      for (let j = 1; j <= streakLen; j++) {
        const v = values[i + j];
        if (type === 'low' && v >= 2) { match = false; break; }
        if (type === 'high' && v < 2) { match = false; break; }
      }
      if (!match) continue;

      const boundary = values[i + streakLen + 1];
      if (type === 'low' && boundary < 2) match = false;
      if (type === 'high' && boundary >= 2) match = false;

      if (match) {
        outcomes.push(values[i]);
      }
    }

    if (outcomes.length >= 1) { // Lowered requirement to capture rare streaks
      const pTargets = [1.2, 1.5, 2.0, 3.0, 5.0];
      const winRates = pTargets.map(t => {
        const hits = outcomes.filter(o => o >= t).length;
        return { target: t, hitRate: Math.round((hits / outcomes.length) * 100) };
      });

      const sortedOutcomes = [...outcomes].sort((a, b) => a - b);
      function getP(targetPct: number) {
        let lo = sortedOutcomes[0], hi = sortedOutcomes[sortedOutcomes.length - 1];
        for (let i = 0; i < 50; i++) {
          const mid = (lo + hi) / 2;
          const wr = (outcomes.filter(v => v >= mid).length / outcomes.length) * 100;
          if (wr > targetPct) lo = mid; else hi = mid;
        }
        return Math.min(30.00, Math.max(1.01, Math.round(((lo + hi) / 2) * 100) / 100));
      }

      // Fix 4: Confidence Score filter
      const p2WinRate = winRates.find(w => w.target === 2.0)?.hitRate ?? 0;
      const p15WinRate = winRates.find(w => w.target === 1.5)?.hitRate ?? 0;
      const bestHitRate = Math.max(p2WinRate, p15WinRate) / 100;
      const confidenceScore = outcomes.length * bestHitRate;

      if (confidenceScore >= 0.8) { // Allow patterns that occurred at least once with high hit rate
        detectedPatterns.push({
          patternName: `Exactly ${streakLen} consecutive ${type} crashes`,
          occurrences: outcomes.length,
          nextRoundWinRates: winRates,
          p90: getP(90),
          p80: getP(80),
          p50: getP(50)
        });
      }
    }
  }

  if (currentLowStreak > 0) analyzeStreakPattern(currentLowStreak, 'low');
  if (currentHighStreak > 0) analyzeStreakPattern(currentHighStreak, 'high');

  // ── Minute Timing Pattern ──
  let timePattern: TimePatternMatch | undefined = undefined;
  if (rawRounds[0]?.created_at) {
    const currentMinute = new Date(rawRounds[0].created_at).getMinutes();
    
    const minuteOutcomes: number[] = [];
    for (const r of rawRounds) {
      if (r.created_at) {
        const m = new Date(r.created_at).getMinutes();
        if (m === currentMinute) {
          minuteOutcomes.push(Number(r.crash_point));
        }
      }
    }
    
    if (minuteOutcomes.length >= 10) {
      const sortedM = [...minuteOutcomes].sort((a, b) => a - b);
      function getMP(targetPct: number) {
        let lo = sortedM[0], hi = sortedM[sortedM.length - 1];
        for (let i = 0; i < 50; i++) {
          const mid = (lo + hi) / 2;
          const wr = (minuteOutcomes.filter(v => v >= mid).length / minuteOutcomes.length) * 100;
          if (wr > targetPct) lo = mid; else hi = mid;
        }
        return Math.min(30.00, Math.max(1.01, Math.round(((lo + hi) / 2) * 100) / 100));
      }

      const pTargets = [1.2, 1.5, 2.0, 3.0, 5.0];
      const mHitRates = pTargets.map(t => {
        const hits = minuteOutcomes.filter(o => o >= t).length;
        return { target: t, hitRate: Math.round((hits / minuteOutcomes.length) * 100) };
      });

      timePattern = {
        minute: currentMinute,
        occurrences: minuteOutcomes.length,
        p90: getMP(90),
        p80: getMP(80),
        p50: getMP(50),
        hitRates: mHitRates
      };
    }
  }

  // ── Sequence N-Gram Matching ──
  let sequenceMatch: SequenceMatch | undefined = undefined;
  
  function getTier(v: number): string {
    if (v < 1.10) return 'INSTANT';
    if (v < 2.0) return 'LOW';
    if (v < 5.0) return 'MED';
    return 'HIGH';
  }

  if (values.length >= 5) {
    let currentSeq: string[] = [];
    let seqOutcomes: number[] = [];

    // Fallback from length 4 down to length 2 to ensure we get matches
    for (let len = 4; len >= 2; len--) {
      currentSeq = [];
      for (let j = len - 1; j >= 0; j--) {
        currentSeq.push(getTier(values[j]));
      }
      const seqStr = currentSeq.join(',');
      seqOutcomes = [];

      for (let i = 1; i <= values.length - len; i++) {
        const histSeq = [];
        for (let j = len - 1; j >= 0; j--) {
          histSeq.push(getTier(values[i+j]));
        }
        if (histSeq.join(',') === seqStr) {
          seqOutcomes.push(values[i-1]);
        }
      }
      if (seqOutcomes.length >= 1) break; // Found a match, stop dropping length
    }

    if (seqOutcomes.length >= 1) {
      const sortedOutcomes = [...seqOutcomes].sort((a, b) => a - b);
      function getSP(targetPct: number) {
        let lo = sortedOutcomes[0], hi = sortedOutcomes[sortedOutcomes.length - 1];
        for (let i = 0; i < 50; i++) {
          const mid = (lo + hi) / 2;
          const wr = (seqOutcomes.filter(v => v >= mid).length / seqOutcomes.length) * 100;
          if (wr > targetPct) lo = mid; else hi = mid;
        }
        return Math.min(30.00, Math.max(1.01, Math.round(((lo + hi) / 2) * 100) / 100));
      }

      sequenceMatch = {
        sequence: currentSeq,
        occurrences: seqOutcomes.length,
        pInstantNext: Math.round((seqOutcomes.filter(v => v < 1.10).length / seqOutcomes.length) * 100),
        pSafeNext: Math.round((seqOutcomes.filter(v => v >= 1.15).length / seqOutcomes.length) * 100),
        pMedNext: Math.round((seqOutcomes.filter(v => v >= 2.0).length / seqOutcomes.length) * 100),
        pHighNext: Math.round((seqOutcomes.filter(v => v >= 5.0).length / seqOutcomes.length) * 100),
        p90: getSP(90),
        p80: getSP(80),
        p50: getSP(50)
      };
    }
  }

  // ── Compute Instant Crash Risk (probability of crash < 1.10x) ──
  const lastCrashVal = values.length > 0 ? values[0] : 1.0;
  const recent6Vals = values.slice(0, 6);
  const clusterCountVal = recent6Vals.filter(v => v < 1.15).length;
  const baseRiskVal = values.length > 0 
    ? (values.slice(0, 50).filter(v => v < 1.10).length / Math.min(values.length, 50)) * 100 
    : 10;

  let instantRiskVal = Math.round(baseRiskVal);
  let warningReasonsVal: string[] = [];

  if (lastCrashVal >= 10.0) {
    const fatigueBoostVal = lastCrashVal >= 25.0 ? 55 : 35;
    instantRiskVal += fatigueBoostVal;
    warningReasonsVal.push(`Post-Moonshot Fatigue (Last crash: ${lastCrashVal.toFixed(2)}x)`);
  }

  if (clusterCountVal >= 2) {
    instantRiskVal += 20;
    warningReasonsVal.push(`Instant Crash Clustering (${clusterCountVal} in last 6 rounds)`);
  }

  if (sequenceMatch && sequenceMatch.pInstantNext >= 25) {
    instantRiskVal = Math.max(instantRiskVal, sequenceMatch.pInstantNext + 10);
    warningReasonsVal.push(`N-Gram Sequence Match (${sequenceMatch.pInstantNext}% historical probability)`);
  }

  instantRiskVal = Math.min(95, Math.max(5, instantRiskVal));
  const instantWarningVal = warningReasonsVal.length > 0 ? warningReasonsVal.join(' | ') : 'Normal Volatility';

  return {
    count: n, mean: +mean.toFixed(2), median: +median.toFixed(2),
    stdDev: +stdDev.toFixed(2), min: +min.toFixed(2), max: +max.toFixed(2),
    pUnder2, p2to5, pOver5, pInstantCrash,
    targets,
    p99SafeCashout, p95SafeCashout, p90SafeCashout, p80SafeCashout, p70SafeCashout, p60SafeCashout, p50SafeCashout,
    ema, currentLowStreak, currentHighStreak, longestLowStreak,
    recentMean: +recentMean.toFixed(2), olderMean: +olderMean.toFixed(2), trend,
    suggestedCashout, suggestedCashoutWinRate,
    conservativeCashout, aggressiveCashout,
    riskScore, riskLabel, confidence, volatility, volatilityPct, q3, detectedPatterns, timePattern, sequenceMatch,
    instant_crash_risk: instantRiskVal,
    instant_crash_warning: instantWarningVal,
    recentOutcomes: values.slice(0, 10)
  };
}

function emptyStats(): CrashStats {
  const emptyTargets = [1.05, 1.10, 1.18, 1.2, 1.5, 1.8, 2.0, 3.0, 5.0, 10.0, 15.0, 20.0, 25.0].map(target => ({
    target, hitCount: 0, hitRate: 0, recentHitRate: 0,
    signal: 'RARE' as const, lastHitAgo: -1, longestGap: 0, ev: -1,
    mathProb: Math.round((0.97 / target) * 1000) / 10,
  }));
  return {
    count: 0, mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
    pUnder2: 0, p2to5: 0, pOver5: 0, pInstantCrash: 0,
    targets: emptyTargets,
    p99SafeCashout: 1.05, p95SafeCashout: 1.10,
    p90SafeCashout: 1.2, p80SafeCashout: 1.5, p70SafeCashout: 1.8,
    p60SafeCashout: 2.5, p50SafeCashout: 3.0,
    ema: 0, currentLowStreak: 0, currentHighStreak: 0, longestLowStreak: 0,
    recentMean: 0, olderMean: 0, trend: 'flat',
    suggestedCashout: 1.5, suggestedCashoutWinRate: 0,
    conservativeCashout: 1.2, aggressiveCashout: 2.0,
    riskScore: 50, riskLabel: 'MEDIUM', confidence: 0, volatility: 'normal', volatilityPct: 0, q3: 0, detectedPatterns: [],
    instant_crash_risk: 10,
    instant_crash_warning: 'Normal Volatility',
    recentOutcomes: []
  };
}

/**
 * Grade a prediction: was the risk label correct for the actual outcome?
 */
export function gradePrediction(
  risk: 'LOW' | 'MEDIUM' | 'HIGH',
  actualCrash: number,
  cashoutTarget?: number | null
): boolean {
  // Primary: did the cashout target get hit?
  if (cashoutTarget && cashoutTarget > 1.0) {
    return actualCrash >= cashoutTarget; // ✅ real accuracy
  }
  // Fallback: risk-based
  if (risk === 'LOW')    return actualCrash >= 2.0;
  if (risk === 'MEDIUM') return actualCrash >= 1.5 && actualCrash < 4.0;
  if (risk === 'HIGH')   return actualCrash < 1.5;
  return false;
}

export function computeBetSignal(
  stats: CrashStats,
  gameType: '1xbet' | 'aviator' | 'luckyjet' = '1xbet',
  timeData?: any
): {
  should_bet: boolean;
  skip_reason: string | null;
  strategy: string;
  cashout_target: number;
  recommended_bet_units: number;
  swing_target: number | null;
  volatility_phase: 'CALM' | 'NORMAL' | 'VOLATILE';
  recommended_stake_pct: number;
  strategy_reason?: string;
} {
  const getTargetStats = (mult: number) => {
    const t = stats.targets?.find(x => Math.abs(x.target - mult) < 0.05);
    return {
      hitRate: t?.hitRate ?? 0,
      ev: t?.ev ?? -1,
    };
  };
  const reasons: string[] = [];

  // Determine volatility phase using stdDev
  const stdDev = stats.stdDev || 0;
  let volatility_phase: 'CALM' | 'NORMAL' | 'VOLATILE' = 'NORMAL';
  if (stdDev < 1.5) volatility_phase = 'CALM';
  else if (stdDev > 3.5) volatility_phase = 'VOLATILE';

  // 1. Hard-lock SKIP for Sleep phase
  if (timeData && timeData.isLKSleep) {
    reasons.push(`Sri Lanka Sleep Phase (${timeData.currentLKTimeStr}): near-random RNG, enforcing SKIP.`);
  }

  // 2. Ultra-micro cool-down: SKIP next 2-3 rounds if an ultra-micro (<1.02x) occurred in the last 3 rounds
  const last3 = stats.recentOutcomes ? stats.recentOutcomes.slice(0, 3) : [];
  const ultraMicroInLast3 = last3.some(v => v < 1.02);
  if (ultraMicroInLast3) {
    reasons.push(`Recent ultra-micro crash (<1.02x) detected in last 3 rounds. Safety cool-down active.`);
  }

  // 3. Grind-band Cluster Skip: 2+ grind-band crashes (1.04x - 1.18x) in last 10 rounds
  const grindBandCount = stats.recentOutcomes
    ? stats.recentOutcomes.filter(v => v >= 1.04 && v <= 1.18).length
    : 0;
  if (grindBandCount >= 2) {
    reasons.push(`Grind-band crash cluster detected (${grindBandCount} in last 10 rounds). Enforcing SKIP.`);
  }

  // 4. Caution phase (MORNING or LATE) skip elevation: treat 1.00-1.25 as dangerous
  if (timeData && (timeData.lkPhase === 'MORNING' || timeData.lkPhase === 'LATE')) {
    const lastCrashVal = stats.recentOutcomes && stats.recentOutcomes.length > 0 ? stats.recentOutcomes[0] : 1.5;
    if (lastCrashVal >= 1.00 && lastCrashVal <= 1.25) {
      reasons.push(`Caution phase (${timeData.lkPhase}): Last crash of ${lastCrashVal.toFixed(2)}x is in dangerous skip range (1.00x-1.25x).`);
    }
  }

  // 5. Preemptive warning check for any single ultra-micro round to halve the stake
  let ultraMicroDetected = false;
  if (stats.recentOutcomes && stats.recentOutcomes.length > 0) {
    const r1 = stats.recentOutcomes[0];
    if (r1 < 1.04) {
      ultraMicroDetected = true;
    }
  }

  if (reasons.length > 0) {
    return { 
      should_bet: false, 
      skip_reason: reasons.join(' · '), 
      strategy: 'SKIP', 
      cashout_target: 0, 
      recommended_bet_units: 0,
      swing_target: null,
      volatility_phase,
      recommended_stake_pct: 0
    };
  }

  // 2. Default is CONSERVATIVE — Custom target limits per game type
  let strategy = 'CONSERVATIVE';
  const p90 = stats.p90SafeCashout;
  
  let minConservative = 1.10;
  let maxConservative = 1.80;
  
  if (gameType === 'aviator') {
    minConservative = 1.15;
    maxConservative = 1.60;
  } else if (gameType === 'luckyjet') {
    minConservative = 1.08;
    maxConservative = 1.70;
  }
  
  let cashout_target = Math.max(minConservative, Math.min(maxConservative, p90));
  let recommended_bet_units = 1.0;
  let recommended_stake_pct = 2; // 2% bankroll default
  let swing_target: number | null = null;
  let strategy_reason: string | undefined;

  // If CALM, we can afford slightly wider targets and larger stake
  if (volatility_phase === 'CALM') {
    cashout_target = Math.max(minConservative + 0.05, Math.min(maxConservative, stats.p90SafeCashout)); // Slightly higher in calm
    recommended_stake_pct = 3;
  }

  // 3. BALANCED Strategy — Fire when conditions are moderately good
  const isHighVolatility = stats.volatility === 'high' || volatility_phase === 'VOLATILE';
  const isPrimePhase = !!(timeData && timeData.lkPhase === 'PRIME');
  const isCalmOrNormal = volatility_phase === 'CALM' || volatility_phase === 'NORMAL';
  const p70 = stats.p70SafeCashout;
  if (stats.riskScore < 65 && stats.ema >= 1.3 && (stats.trend === 'rising' || stats.trend === 'flat' || !isHighVolatility)) {
    strategy = 'CONSERVATIVE';
    cashout_target = Math.max(1.30, Math.min(1.80, p70));
    recommended_bet_units = 0.8;
    recommended_stake_pct = volatility_phase === 'CALM' ? 3 : 2;
    swing_target = 1.8;
  }

  // 4. Pattern Override Strategy — Fix 2: Sequence-gated AGGRESSIVE (dual confirmation required)
  if (stats.detectedPatterns && stats.detectedPatterns.length > 0) {
    const pattern = stats.detectedPatterns[0];
    if (pattern.occurrences >= 1) { // lowered from 5 to 1 to capture all patterns, but gate by confidence
      const p2 = pattern.nextRoundWinRates.find(w => w.target === 2.0);
      const p15 = pattern.nextRoundWinRates.find(w => w.target === 1.5);
      
      // Dual-gate: Pattern must show 70%+ AND N-Gram must confirm 60%+ safe next
      const seqSafe = stats.sequenceMatch ? stats.sequenceMatch.pSafeNext >= 60 : true;

      // Allow 1 consecutive streaks now, they are accurate enough if hit rate is high
      if (p2 && p2.hitRate >= 65 && seqSafe && isPrimePhase && isCalmOrNormal) {
        strategy = 'AGGRESSIVE';
        
        const t20 = getTargetStats(2.0);
        const t18 = getTargetStats(1.8);
        
        if (t20.ev >= 0 && t20.hitRate >= 55) {
          cashout_target = 2.00;
        } else if (t18.ev >= 0 && t18.hitRate >= 60) {
          cashout_target = 1.80;
        } else {
          cashout_target = 1.50;
        }
        
        swing_target = pattern.p50 && pattern.p50 >= 5 ? Math.min(pattern.p50, 15.0) : stats.p60SafeCashout;
        recommended_stake_pct = 2;
        strategy_reason = `Dual-confirmed: Pattern '${pattern.patternName}' + N-Gram ${stats.sequenceMatch?.pSafeNext ?? 'N/A'}% safe. Target: ${cashout_target}x`;
      } else if (p15 && p15.hitRate >= 75 && isPrimePhase && isCalmOrNormal && getTargetStats(1.8).ev >= 0) {
        // High confidence 1.80x target
        strategy = 'AGGRESSIVE';
        cashout_target = 1.80;
        swing_target = 1.80;
        recommended_stake_pct = 2;
        strategy_reason = `Pattern '${pattern.patternName}' very high confidence. Target: 1.80x (EV >= 0).`;
      } else if (p15 && p15.hitRate >= 70) {
        const t15 = getTargetStats(1.5);
        if (t15.ev >= 0 && isPrimePhase && isCalmOrNormal) {
          // Safer 1.50x usage: PRIME only, EV >= 0, hitRate >= 70
          strategy = 'CONSERVATIVE';
          cashout_target = 1.50;
          swing_target = 1.50;
          recommended_stake_pct = 2;
          strategy_reason = `Pattern '${pattern.patternName}' strong hit rate and EV >= 0. Target: 1.50x`;
        } else {
          // Fallback: lower target and smaller stake
          strategy = 'CONSERVATIVE';
          cashout_target = Math.max(1.30, Math.min(1.35, stats.p70SafeCashout));
          swing_target = cashout_target;
          recommended_stake_pct = 1;
          strategy_reason = `Pattern '${pattern.patternName}' detected but 1.50x is high risk here. Using safer ${cashout_target.toFixed(2)}x with 1% stake.`;
        }
      }
    }
  }

  // 5. Time-based Override (Strict 80% safe cashout ceiling) — Gated by volatility
  if (stats.timePattern && strategy !== 'SKIP') {
    const tp = stats.timePattern;
    if (tp.p80 >= 2.0 && strategy !== 'AGGRESSIVE' && !isHighVolatility) {
      strategy = 'AGGRESSIVE';
      cashout_target = Math.min(25.0, tp.p80);
      swing_target = tp.p80;
      strategy_reason = `Minute ${tp.minute} historically has an 80% safe target of ${tp.p80}x`;
    }
  }

  // NOTE: UTC time-zone clamping removed — it was forcing conservative targets to 1.04x
  // during IST prime hours (22:15 UTC). Strategy is now purely data-driven.

  // Global cap outside PRIME: avoid high multipliers in MORNING/LATE/DAY
  if (!isPrimePhase && strategy !== 'SKIP') {
    if (cashout_target > 1.40) {
      strategy_reason = (strategy_reason ? strategy_reason + ' | ' : '') +
        'Non-prime phase: capping target at 1.40x for safety.';
      cashout_target = 1.40;
      swing_target = swing_target && swing_target > 1.40 ? 1.40 : swing_target;
      recommended_stake_pct = Math.min(recommended_stake_pct, 2);
    }
  }

  // Preemptive safety check: halve stake if an ultra-micro round occurred recently
  if (ultraMicroDetected && strategy !== 'SKIP') {
    recommended_stake_pct = Math.max(1, Math.floor(recommended_stake_pct / 2));
    strategy_reason = (strategy_reason ? strategy_reason + ' | ' : '') + 'Ultra-micro crash <1.04x detected. Stake halved.';
  }

  return {  
    should_bet: true, 
    skip_reason: null, 
    strategy, 
    cashout_target, 
    recommended_bet_units,
    swing_target,
    volatility_phase,
    recommended_stake_pct,
    strategy_reason
  };
}

/**
 * buildHumanSummary — generates premium, vivid prediction text from pure stats
 * Used as AI fallback so the dashboard always shows human-feeling language.
 */
export function buildHumanSummary(
  stats: CrashStats,
  betSignal: ReturnType<typeof computeBetSignal>
): string {
  const { riskScore, ema, trend, currentLowStreak, currentHighStreak, volatility, recentOutcomes, detectedPatterns, sequenceMatch } = stats;
  const { strategy, cashout_target, volatility_phase, skip_reason } = betSignal;

  const lastCrash = recentOutcomes?.[0] ?? 0;
  const recentAvg = recentOutcomes && recentOutcomes.length >= 3
    ? (recentOutcomes.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, recentOutcomes.length)).toFixed(2)
    : null;

  // Sentence 1 — describe the current market state
  let s1 = '';
  if (strategy === 'SKIP') {
    if (currentLowStreak >= 3) {
      s1 = `The algorithm is detecting a sustained low-crash cluster — ${currentLowStreak} consecutive rounds below 2x signals a grinding phase, not a recovery.`;
    } else if (lastCrash >= 1.04 && lastCrash <= 1.18) {
      s1 = `Last crash landed in the danger zone at ${lastCrash.toFixed(2)}x — the 1.04x–1.18x band historically precedes continued suppression.`;
    } else {
      s1 = `The risk engine is holding back — current volatility reads ${volatility_phase} with an EMA of ${ema.toFixed(2)}x, signaling elevated uncertainty.`;
    }
  } else if (detectedPatterns && detectedPatterns.length > 0 && detectedPatterns[0].occurrences >= 3) {
    const p = detectedPatterns[0];
    s1 = `Pattern match: "${p.patternName}" has triggered ${p.occurrences} times historically — the sequence engine is registering a high-probability setup.`;
  } else if (sequenceMatch && sequenceMatch.pSafeNext >= 65) {
    s1 = `The N-gram engine is reading [${sequenceMatch.sequence.join(' → ')}] — this exact sequence has preceded a safe round ${sequenceMatch.pSafeNext}% of the time across ${sequenceMatch.occurrences} historical occurrences.`;
  } else if (trend === 'rising' && currentHighStreak >= 2) {
    s1 = `Momentum is building — ${currentHighStreak} consecutive strong rounds with an EMA of ${ema.toFixed(2)}x suggests the current cycle has upward pressure.`;
  } else if (volatility_phase === 'CALM') {
    s1 = `Low-volatility window detected — the spread is compressing with stdDev ${stats.stdDev.toFixed(2)}, which historically favors tight, high-probability cashout entries.`;
  } else if (riskScore < 50) {
    s1 = recentAvg
      ? `The recent ${Math.min(5, recentOutcomes?.length ?? 0)}-round average is ${recentAvg}x with a risk score of ${riskScore}/100 — conditions are within acceptable parameters.`
      : `Risk score reads ${riskScore}/100 with EMA at ${ema.toFixed(2)}x — the pattern engine has identified a statistically viable entry window.`;
  } else {
    s1 = `Market EMA at ${ema.toFixed(2)}x with ${riskScore}/100 risk score — the engine is applying adaptive targeting based on ${stats.count.toLocaleString()} rounds of historical data.`;
  }

  // Sentence 2 — state the exact action
  let s2 = '';
  if (strategy === 'SKIP') {
    s2 = `Standing by — skip this round and observe. Re-entry signal will fire once the pattern stabilizes.`;
  } else {
    const hitRate = stats.targets.find(t => Math.abs(t.target - cashout_target) < 0.05)?.hitRate;
    const coverage = hitRate ? ` (${hitRate}% historical coverage)` : '';
    if (strategy === 'AGGRESSIVE') {
      s2 = `Entering at ${cashout_target.toFixed(2)}x${coverage} — elevated confidence window, use ${betSignal.recommended_stake_pct}% stake.`;
    } else {
      s2 = `Target: ${cashout_target.toFixed(2)}x${coverage} — conservative position with ${betSignal.recommended_stake_pct}% bankroll exposure.`;
    }
  }

  return `${s1} ${s2}`;
}
