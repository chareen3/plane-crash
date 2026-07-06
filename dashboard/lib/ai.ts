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

export function buildPrompt(stats: any, betSignal: any, timeData: {
  currentUTCHour: number;
  currentLocalHour: number;
  currentAMPM: string;
  peakHours: any[];
}) {
  const t = (mult: number) =>
    stats.targets?.find((x: any) => Math.abs(x.target - mult) < 0.01);

  const t105 = t(1.05);
  const t110 = t(1.10);
  const t118 = t(1.18);
  const t120 = t(1.20);
  const t150 = t(1.50);
  const t200 = t(2.0);
  const t300 = t(3.0);
  const t500 = t(5.0);
  const t1000 = t(10.0);

  const nowPeak =
    timeData.peakHours.find((h: any) => h.hour === timeData.currentUTCHour) ??
    { label: 'Unknown', tag: 'NORM', score: 50, note: 'No data' };

  // Calculate session volatility phase
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
    timeStr = `Current Minute: ${tp.minute} (historically occurred ${tp.occurrences} times in the DB).\n`;
    timeStr += `90% Safe Target: ${tp.p90}x | 50% Median: ${tp.p50}x\n`;
    timeStr += `Hit Rates during this minute: ` + tp.hitRates.map((w: any) => `${w.target}x: ${w.hitRate}%`).join(' | ');
  }

  let seqStr = 'None available.';
  if (stats.sequenceMatch) {
    const sq = stats.sequenceMatch;
    seqStr = `Current Shape Sequence: [${sq.sequence.join(', ')}]\n`;
    seqStr += `This exact sequence occurred ${sq.occurrences} times historically.\n`;
    seqStr += `Next Round Probabilities -> INSTANT Crash: ${sq.pInstantNext}% | Safe (>=1.15): ${sq.pSafeNext}% | High (>=5.0): ${sq.pHighNext}%\n`;
  }

  return `You are an Advanced Pattern Recognition & Strategy Engine for crash games. Your goal is to maximize predictive accuracy by analyzing streaks, momentum, cycles, and volatility. You actively look for patterns and recovery cycles in the historical data to formulate high-accuracy predictions, rather than dismissing the sequence as pure randomness.

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

=== TIME-ZONE & HOUR PROFILE ===
Current UTC Hour: ${timeData.currentUTCHour} (${nowPeak.label})
Peak Hour Tag: ${nowPeak.tag} | Hour Traffic Score: ${nowPeak.score}/100 | Volume Note: ${nowPeak.note}

=== GENERAL TARGET HIT RATES (Overall Dataset) ===
1.05x: ${t105?.hitRate?.toFixed(1) ?? '?'}%
1.10x: ${t110?.hitRate?.toFixed(1) ?? '?'}%
1.18x: ${t118?.hitRate?.toFixed(1) ?? '?'}%
1.20x: ${t120?.hitRate?.toFixed(1) ?? '?'}%
1.50x: ${t150?.hitRate?.toFixed(1) ?? '?'}%
2.00x: ${t200?.hitRate?.toFixed(1) ?? '?'}%
3.00x: ${t300?.hitRate?.toFixed(1) ?? '?'}%
5.00x: ${t500?.hitRate?.toFixed(1) ?? '?'}%

=== BACKEND STATS RECOMMENDATION ===
Suggested Strategy: ${betSignal.strategy} | Suggested Target: ${betSignal.cashout_target}x | Skip Reason: ${betSignal.skip_reason ?? 'None'}
Suggested Swing: ${betSignal.swing_target ? betSignal.swing_target + 'x' : 'None'} | Recommended Stake: ${betSignal.recommended_stake_pct}% bankroll | Strategy Reason: ${betSignal.strategy_reason ?? 'None'}

=== STRATEGY DECISION RULES ===
1. FIND PATTERNS: Actively look for cycles. If there's a long gap of low crashes, look for an upcoming recovery. If a DETECTED HISTORICAL PATTERN shows a high win rate (>70%) for a specific target, strongly consider overriding other rules to follow the historical pattern.
2. WARMUP PHASE: If the recommendation is SKIP due to recent losses, tell the user the system is in a "Warmup Phase" analyzing patterns to guarantee 90% accuracy. Recommend observing without betting.
3. CONSERVATIVE BETTING: If the strategy is CONSERVATIVE, recommend a safe cashout target dynamically chosen between 1.05x and 1.19x depending on volatility.
4. ADAPTIVE MICRO-TARGETS: Output highly specific decimal targets (e.g., 1.48, 2.12, 10.45, 15.22). There is NO ceiling. If the DETECTED HISTORICAL PATTERNS percentiles justify a massive 10x or 20x target, you must output it! Otherwise, keep it mathematically safe.
5. RNG REALITY CHECK & VOLATILITY GATES: Crash games use provably fair SHA-256 hashes with a strict 3% house edge. Do NOT fall for the "illusion of patterns". Never recommend AGGRESSIVE targets if Volatility is HIGH. Automatically skip or downgrade to CONSERVATIVE (1.04x - 1.10x) in high volatility. Also, reject patterns based on weak streak lengths of 1 round (e.g., 'Exactly 1 consecutive high crashes') as they are not statistical trends. Only trust patterns with streak length >= 2 and when the N-Gram Sequence Engine provides a verified safety net.
6. SUMMARY FORMAT: Provide clear predictive and strategic insight in 2 concise sentences (e.g. "Pattern dictates an extreme 15x multiplier. Recommending a high-risk 15.22x swing target based on historical data.").

Return EXACTLY this JSON format (no markdown code blocks, no other text):
{
  "risk": "LOW|MEDIUM|HIGH",
  "confidence": 0-100,
  "should_bet": true|false,
  "strategy": "CONSERVATIVE|AGGRESSIVE|SKIP",
  "cashout_target": 1.19,
  "swing_target": 1.80,
  "recommended_stake_pct": 1-5,
  "volatility_phase": "CALM|NORMAL|VOLATILE",
  "summary": "<2-sentence predictive strategy based on patterns>"
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
