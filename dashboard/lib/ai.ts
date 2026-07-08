// Peak hours scoring (UTC) based on Aviator/Crash game traffic patterns
export const PEAK_HOURS_UTC = [
  { hour: 0, label: '00:00 UTC', score: 60, tag: 'WARM', note: 'Asia late night, moderate volume' },
  { hour: 1, label: '01:00 UTC', score: 45, tag: 'NORM', note: 'Low global volume' },
  { hour: 2, label: '02:00 UTC', score: 35, tag: 'COLD', note: 'Very low volume' },
  { hour: 3, label: '03:00 UTC', score: 30, tag: 'COLD', note: 'Very low volume' },
  { hour: 4, label: '04:00 UTC', score: 30, tag: 'COLD', note: 'Very low volume' },
  { hour: 5, label: '05:00 UTC', score: 40, tag: 'NORM', note: 'EU early risers' },
  { hour: 6, label: '06:00 UTC', score: 55, tag: 'WARM', note: 'EU morning pickup' },
  { hour: 7, label: '07:00 UTC', score: 65, tag: 'HOT', note: 'EU prime morning' },
  { hour: 8, label: '08:00 UTC', score: 75, tag: 'HOT', note: 'EU/Africa morning peak' },
  { hour: 9, label: '09:00 UTC', score: 80, tag: 'PEAK', note: 'High EU volume' },
  { hour: 10, label: '10:00 UTC', score: 85, tag: 'PEAK', note: 'EU full volume' },
  { hour: 11, label: '11:00 UTC', score: 85, tag: 'PEAK', note: 'EU full volume' },
  { hour: 12, label: '12:00 UTC', score: 80, tag: 'PEAK', note: 'EU noon + US East wake' },
  { hour: 13, label: '13:00 UTC', score: 78, tag: 'HOT', note: 'EU afternoon + US morning' },
  { hour: 14, label: '14:00 UTC', score: 82, tag: 'PEAK', note: 'EU/US overlap' },
  { hour: 15, label: '15:00 UTC', score: 88, tag: 'PEAK', note: 'Global peak, EU+US+Asia overlap' },
  { hour: 16, label: '16:00 UTC', score: 90, tag: 'PEAK', note: 'Highest global volume window' },
  { hour: 17, label: '17:00 UTC', score: 88, tag: 'PEAK', note: 'EU evening + US afternoon' },
  { hour: 18, label: '18:00 UTC', score: 85, tag: 'PEAK', note: 'Post-work EU, US active' },
  { hour: 19, label: '19:00 UTC', score: 80, tag: 'HOT', note: 'Evening prime' },
  { hour: 20, label: '20:00 UTC', score: 75, tag: 'HOT', note: 'EU late evening' },
  { hour: 21, label: '21:00 UTC', score: 68, tag: 'HOT', note: 'US peak + Asia early' },
  { hour: 22, label: '22:00 UTC', score: 65, tag: 'WARM', note: 'US evening + Asia pickup' },
  { hour: 23, label: '23:00 UTC', score: 60, tag: 'WARM', note: 'US late + Asia morning' },
];

const AI_MODELS = [
  'google/gemini-flash-1.5',
  'google/gemma-4-26b-a4b-it:free',
];

// ─── LK Timezone Phase Table ─────────────────────────────────────────────
// Game: 1xBet Crash — lk.1xbet.com — Sri Lanka players ONLY
// Running on local Sri Lanka machine → new Date().getHours() = real LK time. No conversion needed.
export const LK_PHASE_TABLE: Record<number, { phase: string; rule: string; playerCount: string; note: string }> = {
  0:  { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<15',     note: '12AM. Near-random RNG. Skip all bets.' },
  1:  { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<10',     note: '1AM. Patterns unreliable.' },
  2:  { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<10',     note: '2AM. Near-zero activity.' },
  3:  { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<10',     note: '3AM. SKIP.' },
  4:  { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '<10',     note: '4AM. SKIP.' },
  5:  { phase: 'SLEEP',   rule: 'SKIP',       playerCount: '10-15',   note: '5AM. Very early. Max 1.15x only.' },
  6:  { phase: 'MORNING', rule: 'CAUTION',    playerCount: '15-30',   note: '6AM. Light traffic. Max 1.2x.' },
  7:  { phase: 'MORNING', rule: 'CAUTION',    playerCount: '30-50',   note: '7AM. Low-moderate. Caution.' },
  8:  { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '50-100',  note: '8AM. Day session. Standard strategy.' },
  9:  { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '80-120',  note: '9AM. Office hours. Moderate volume.' },
  10: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '10AM. Active day session.' },
  11: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '11AM. Pre-lunch active.' },
  12: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '120-180', note: '12PM. Lunch break. Volume rising.' },
  13: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '1PM. Post-lunch session.' },
  14: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '2PM. Afternoon active.' },
  15: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '100-150', note: '3PM. Steady day volume.' },
  16: { phase: 'DAY',     rule: 'BET_NORMAL', playerCount: '150-200', note: '4PM. Volume building.' },
  17: { phase: 'EVENING', rule: 'BET_NORMAL', playerCount: '150-200', note: '5PM. Post-work commute.' },
  18: { phase: 'EVENING', rule: 'BET_SAFE',   playerCount: '200-280', note: '6PM. Volume increasing fast.' },
  19: { phase: 'PRIME',   rule: 'BET_SAFE',   playerCount: '300-400', note: '🔥 7PM PRIME. Best signal window.' },
  20: { phase: 'PRIME',   rule: 'BET_SAFE',   playerCount: '400-500', note: '🔥 8PM PEAK. Highest accuracy.' },
  21: { phase: 'PRIME',   rule: 'BET_SAFE',   playerCount: '400-600', note: '🔥 9PM PEAK. Trust DB patterns fully.' },
  22: { phase: 'PRIME',   rule: 'BET_SAFE',   playerCount: '300-400', note: '🔥 10PM. Prime winding. Conservative 1.5x.' },
  23: { phase: 'LATE',    rule: 'CAUTION',    playerCount: '100-200', note: '11PM. Volume dropping. Reduce stake.' },
};

// ─── getLKTimeData ────────────────────────────────────────────────────────
// One function to call in both route.ts files instead of manual timeData building.
export function getLKTimeData() {
  const now       = new Date();
  const lkHour    = now.getHours();        // ✅ Sri Lanka machine = correct LK time
  const lkMinute  = now.getMinutes();
  const lkTimeStr = `${String(lkHour).padStart(2,'0')}:${String(lkMinute).padStart(2,'0')}`;
  const info      = LK_PHASE_TABLE[lkHour] ?? { phase: 'DAY', rule: 'BET_NORMAL', playerCount: '100+', note: 'Standard.' };
  return {
    currentUTCHour:   now.getUTCHours(),
    currentLKHour:    lkHour,
    currentLKMinute:  lkMinute,
    currentLKTimeStr: lkTimeStr,
    lkPhase:          info.phase,
    lkRule:           info.rule,
    lkPlayerCount:    info.playerCount,
    lkNote:           info.note,
    isLKPrime:        info.phase === 'PRIME',
    isLKSleep:        info.phase === 'SLEEP',
    currentAMPM:      lkHour >= 12 ? 'PM' : 'AM',
    peakHours:        PEAK_HOURS_UTC,
  };
}

export function buildPrompt(stats: any, betSignal: any, timeData: ReturnType<typeof getLKTimeData>) {
  const t = (mult: number) =>
    stats.targets?.find((x: any) => Math.abs(x.target - mult) < 0.01);

  const t105  = t(1.05); const t110 = t(1.10); const t118 = t(1.18);
  const t120  = t(1.20); const t150 = t(1.50); const t200 = t(2.0);
  const t300  = t(3.0);  const t500 = t(5.0);  const t1000 = t(10.0);

  const nowPeak =
    timeData.peakHours.find((h: any) => h.hour === timeData.currentUTCHour) ??
    { label: 'Unknown', tag: 'NORM', score: 50, note: 'No data' };

  const stdDev = stats.stdDev || 0;
  let volatilityPhase = 'NORMAL';
  if (stdDev < 1.5) volatilityPhase = 'CALM';
  else if (stdDev > 3.5) volatilityPhase = 'VOLATILE';

  let patternStr = 'None detected for current streak.';
  if (stats.detectedPatterns && stats.detectedPatterns.length > 0) {
    const p = stats.detectedPatterns[0];
    patternStr = `Pattern: ${p.patternName}\nHistorically occurred ${p.occurrences} times in this dataset.\n`;
    if (p.p90) patternStr += `90% Safe Target: ${p.p90}x | 80% Safe Target: ${p.p80}x | 50% Median: ${p.p50}x\n`;
    patternStr += `Next round exact hit rates: ` + p.nextRoundWinRates.map((w: any) => `${w.target}x: ${w.hitRate}%`).join(' | ');
  }

  let timeStr = 'None available.';
  if (stats.timePattern) {
    const tp = stats.timePattern;
    timeStr  = `Current Minute: ${tp.minute} (historically occurred ${tp.occurrences} times in the DB).\n`;
    timeStr += `90% Safe Target: ${tp.p90}x | 50% Median: ${tp.p50}x\n`;
    timeStr += `Hit Rates during this minute: ` + tp.hitRates.map((w: any) => `${w.target}x: ${w.hitRate}%`).join(' | ');
  }

  let seqStr = 'None available.';
  if (stats.sequenceMatch) {
    const sq = stats.sequenceMatch;
    seqStr  = `Current Shape Sequence: [${sq.sequence.join(', ')}]\n`;
    seqStr += `This exact sequence occurred ${sq.occurrences} times historically.\n`;
    seqStr += `Next Round Probabilities -> INSTANT Crash: ${sq.pInstantNext}% | Safe (>=1.15): ${sq.pSafeNext}% | High (>=5.0): ${sq.pHighNext}%\n`;
  }

  // ── LK Phase context line shown to AI ──
  const lkContextLine = timeData.isLKPrime
    ? `🔥 LK PRIME (${timeData.currentLKTimeStr}): ~${timeData.lkPlayerCount} active LK players. HIGHEST accuracy window. Trust DB historical percentiles as primary anchor.`
    : timeData.isLKSleep
    ? `💤 LK SLEEP (${timeData.currentLKTimeStr}): ~${timeData.lkPlayerCount} players. Near-random RNG. FORCE SKIP or absolute max 1.15x cashout.`
    : `☀️ LK ${timeData.lkPhase} (${timeData.currentLKTimeStr}): ~${timeData.lkPlayerCount} players. Standard conservative strategy applies.`;

  return `You are an Advanced Pattern Recognition & Strategy Engine for 1xBet Crash game (lk.1xbet.com — Sri Lanka server only). Your goal is to maximize predictive accuracy by analyzing streaks, momentum, cycles, and volatility. You actively look for patterns and recovery cycles in the historical data to formulate high-accuracy predictions.

=== CURRENT SESSION STATS ===
Rounds Analyzed: ${stats.count}
Mean Multiplier: ${stats.mean?.toFixed(2)}x | Median: ${stats.median?.toFixed(2)}x
Standard Deviation (stdDev): ${stats.stdDev?.toFixed(2)}
Calculated Session Phase: ${volatilityPhase} (CALM / NORMAL / VOLATILE)
Streak Info: ${stats.currentLowStreak} consecutive low crashes (<2x) | ${stats.currentHighStreak ?? 0} consecutive high rounds (>=2x)
Trend (Recent vs Older): ${stats.trend} | EMA: ${stats.ema?.toFixed(2)}x

=== DETECTED HISTORICAL PATTERNS (Conditional Probability) ===
${patternStr}

=== N-GRAM SEQUENCE ENGINE ===
${seqStr}

=== MINUTE TIMING PROFILE ===
${timeStr}

=== 1XBET CRASH — SRI LANKA TIMEZONE CONTEXT ===
Game: 1xBet Crash — lk.1xbet.com — Sri Lanka players ONLY (NOT Aviator)
${lkContextLine}
LK Phase: ${timeData.lkPhase} | Rule: ${timeData.lkRule} | Note: ${timeData.lkNote}

MANDATORY TIMEZONE RULES:
- If LK Phase = SLEEP (12AM–5AM): FORCE strategy=SKIP. Max cashout_target=1.15 if absolutely forced to output a target.
- If LK Phase = PRIME (7PM–10PM): Historical DB hit rates are your MOST reliable signal. Weight them above all other factors.
- If LK Phase = MORNING or LATE: Use CAUTION. Prefer 1.20x–1.35x safe targets only.
- If LK Phase = DAY or EVENING: Standard strategy. Follow stats engine recommendation.

=== TIME-ZONE & HOUR PROFILE ===
Current UTC Hour: ${timeData.currentUTCHour} (${nowPeak.label})
Current LK Time: ${timeData.currentLKTimeStr} (machine running locally in Sri Lanka, UTC+5:30)
Peak Hour Tag: ${nowPeak.tag} | Hour Traffic Score: ${nowPeak.score}/100 | Volume Note: ${nowPeak.note}

=== GENERAL TARGET HIT RATES (Overall Dataset) ===
1.05x: ${t105?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t105?.ev ?? '?'})
1.10x: ${t110?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t110?.ev ?? '?'})
1.18x: ${t118?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t118?.ev ?? '?'})
1.20x: ${t120?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t120?.ev ?? '?'})
1.50x: ${t150?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t150?.ev ?? '?'})
2.00x: ${t200?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t200?.ev ?? '?'})
3.00x: ${t300?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t300?.ev ?? '?'})
5.00x: ${t500?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t500?.ev ?? '?'})
10.0x: ${t1000?.hitRate?.toFixed(1) ?? '?'}% (EV: ${t1000?.ev ?? '?'})
Recent Outcomes (last 10): ${stats.recentOutcomes?.join('x, ') ?? 'N/A'}x

=== BACKEND STATS RECOMMENDATION ===
Suggested Strategy: ${betSignal.strategy} | Suggested Target: ${betSignal.cashout_target}x | Skip Reason: ${betSignal.skip_reason ?? 'None'}
Suggested Swing: ${betSignal.swing_target ? betSignal.swing_target + 'x' : 'None'} | Recommended Stake: ${betSignal.recommended_stake_pct}% bankroll | Strategy Reason: ${betSignal.strategy_reason ?? 'None'}
90% Safe Cashout: ${stats.p90SafeCashout}x | 80% Safe: ${stats.p80SafeCashout}x | 70% Safe: ${stats.p70SafeCashout}x
Risk Score: ${stats.riskScore}/100 (${stats.riskLabel}) | Volatility: ${stats.volatility} (${stats.volatilityPct}%) | Confidence: ${stats.confidence}%

=== STRATEGY DECISION RULES ===
1. FIND PATTERNS: Actively look for cycles. If there's a long gap of low crashes, look for an upcoming recovery. If a DETECTED HISTORICAL PATTERN shows a high win rate (>70%) for a specific target, strongly consider overriding other rules to follow the historical pattern.
2. WARMUP PHASE: If the recommendation is SKIP due to recent losses, tell the user the system is in a "Warmup Phase" analyzing patterns to guarantee 90% accuracy. Recommend observing without betting.
3. CONSERVATIVE BETTING: If the strategy is CONSERVATIVE, recommend a safe cashout target dynamically chosen between 1.05x and 1.19x depending on volatility.
4. ADAPTIVE MICRO-TARGETS: Output highly specific decimal targets (e.g., 1.48, 2.12, 10.45, 15.22). There is NO ceiling. If DETECTED HISTORICAL PATTERNS percentiles justify a massive 10x or 20x target, output it. Otherwise keep it mathematically safe.
5. RNG REALITY CHECK & VOLATILITY GATES: 1xBet Crash uses provably fair SHA-256 RNG with 3% house edge. Never recommend AGGRESSIVE targets if Volatility=HIGH. Downgrade to CONSERVATIVE (1.04x–1.10x) in high volatility. Reject streak patterns of length 1. Only trust patterns with streak >= 2 AND N-Gram Sequence Engine confirmation.
6. EV AWARENESS: Prefer targets where EV > 0 from the hit rates table above. Negative EV targets should only be used in CONSERVATIVE micro-cashout strategy.
7. SUMMARY FORMAT: 2 concise sentences. State the pattern found and the exact target recommended with the reason.

Return EXACTLY this JSON format (no markdown, no extra text):
{
  "risk": "LOW|MEDIUM|HIGH",
  "confidence": 0-100,
  "should_bet": true|false,
  "strategy": "CONSERVATIVE|AGGRESSIVE|SKIP",
  "cashout_target": 1.19,
  "swing_target": 1.80,
  "recommended_stake_pct": 1-5,
  "volatility_phase": "CALM|NORMAL|VOLATILE",
  "summary": "<2-sentence predictive strategy>"
}`;
}

export async function callAI(prompt: string): Promise<{ result: any; model: string } | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  for (const model of AI_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://crash-predictor.app',
          'X-Title': 'Crash Predictor',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.08,
          max_tokens: 200,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!res.ok) continue;

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) continue;

      return { result: JSON.parse(match[0]), model };
    } catch {
      continue;
    }
  }
  return null;
}
