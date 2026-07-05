// Peak hours scoring (UTC) based on Aviator/Crash game traffic patterns
export const PEAK_HOURS_UTC = [
  { hour: 0,  label: '00:00 UTC', score: 60, tag: 'WARM', note: 'Asia late night, moderate volume' },
  { hour: 1,  label: '01:00 UTC', score: 45, tag: 'NORM', note: 'Low global volume' },
  { hour: 2,  label: '02:00 UTC', score: 35, tag: 'COLD', note: 'Very low volume' },
  { hour: 3,  label: '03:00 UTC', score: 30, tag: 'COLD', note: 'Very low volume' },
  { hour: 4,  label: '04:00 UTC', score: 30, tag: 'COLD', note: 'Very low volume' },
  { hour: 5,  label: '05:00 UTC', score: 40, tag: 'NORM', note: 'EU early risers' },
  { hour: 6,  label: '06:00 UTC', score: 55, tag: 'WARM', note: 'EU morning pickup' },
  { hour: 7,  label: '07:00 UTC', score: 65, tag: 'HOT',  note: 'EU prime morning' },
  { hour: 8,  label: '08:00 UTC', score: 75, tag: 'HOT',  note: 'EU/Africa morning peak' },
  { hour: 9,  label: '09:00 UTC', score: 80, tag: 'PEAK', note: 'High EU volume' },
  { hour: 10, label: '10:00 UTC', score: 85, tag: 'PEAK', note: 'EU full volume' },
  { hour: 11, label: '11:00 UTC', score: 85, tag: 'PEAK', note: 'EU full volume' },
  { hour: 12, label: '12:00 UTC', score: 80, tag: 'PEAK', note: 'EU noon + US East wake' },
  { hour: 13, label: '13:00 UTC', score: 78, tag: 'HOT',  note: 'EU afternoon + US morning' },
  { hour: 14, label: '14:00 UTC', score: 82, tag: 'PEAK', note: 'EU/US overlap' },
  { hour: 15, label: '15:00 UTC', score: 88, tag: 'PEAK', note: 'Global peak, EU+US+Asia overlap' },
  { hour: 16, label: '16:00 UTC', score: 90, tag: 'PEAK', note: 'Highest global volume window' },
  { hour: 17, label: '17:00 UTC', score: 88, tag: 'PEAK', note: 'EU evening + US afternoon' },
  { hour: 18, label: '18:00 UTC', score: 85, tag: 'PEAK', note: 'Post-work EU, US active' },
  { hour: 19, label: '19:00 UTC', score: 80, tag: 'HOT',  note: 'Evening prime' },
  { hour: 20, label: '20:00 UTC', score: 75, tag: 'HOT',  note: 'EU late evening' },
  { hour: 21, label: '21:00 UTC', score: 68, tag: 'HOT',  note: 'US peak + Asia early' },
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
    timeData.peakHours.find((h: any) => h.hour === timeData.currentUTCHour) ??
    { label: 'Unknown', tag: 'NORM', score: 50, note: 'No data' };

  return `You are an expert crash game AI analyst for a 1xBet Aviator-style game.
Analyze using BOTH time-based data AND statistical history, then decide:
- Whether to bet or skip.
- Whether to stay in the low cash-out zone (1.05-1.20x) or go higher (>=1.50x).
- How much stake to use (very small, small, medium; never large).

=== ROUND STATS (${stats.count} total rounds in DB) ===
mean: ${stats.mean?.toFixed(3)}x | median: ${stats.median?.toFixed(3)}x | stdDev: ${stats.stdDev?.toFixed(3)}
riskScore: ${stats.riskScore}/100 | riskLabel: ${stats.riskLabel}
lowStreak: ${stats.currentLowStreak} | highStreak: ${stats.currentHighStreak ?? 0}
trend: ${stats.trend} | EMA: ${stats.ema?.toFixed(3)}x
p99SafeCashout: ${stats.p99SafeCashout?.toFixed(2)}x | p90SafeCashout: ${stats.p90SafeCashout?.toFixed(2)}x

=== LOW ZONE (1.05-1.20x) ===
1.05x: ${t105?.hitRate?.toFixed(1) ?? '?'}% hit (last ${t105?.lastHitAgo ?? '?'} rounds ago) | longestGap: ${t105?.longestGap ?? '?'}
1.10x: ${t110?.hitRate?.toFixed(1) ?? '?'}% hit (last ${t110?.lastHitAgo ?? '?'} rounds ago) | longestGap: ${t110?.longestGap ?? '?'}
1.18x: ${t118?.hitRate?.toFixed(1) ?? '?'}% hit (last ${t118?.lastHitAgo ?? '?'} rounds ago)
1.20x: ${t120?.hitRate?.toFixed(1) ?? '?'}% hit (last ${t120?.lastHitAgo ?? '?'} rounds ago)

=== HIGHER TARGETS ===
1.50x: ${t150?.hitRate?.toFixed(1) ?? '?'}% | 2.00x: ${t200?.hitRate?.toFixed(1) ?? '?'}% | 3.00x: ${t300?.hitRate?.toFixed(1) ?? '?'}%
5.00x: ${t500?.hitRate?.toFixed(1) ?? '?'}% (last ${t500?.lastHitAgo ?? '?'} rounds ago)
10.0x: ${t1000?.hitRate?.toFixed(1) ?? '?'}% (last ${t1000?.lastHitAgo ?? '?'} rounds ago)

=== BACKEND SIGNAL ===
baseShouldBet: ${betSignal.should_bet} | baseStrategy: ${betSignal.strategy}
baseCashoutTarget: ${betSignal.cashout_target} | skipReason: ${betSignal.skip_reason ?? 'None'}

=== TIME CONTEXT ===
UTC Hour: ${timeData.currentUTCHour} (${nowPeak.label}) | Local: ${timeData.currentLocalHour} ${timeData.currentAMPM}
peakTag: ${nowPeak.tag} | peakScore: ${nowPeak.score}/100 | note: ${nowPeak.note}

=== RULES ===
1. If riskScore >= 80 AND EMA < 1.5x -> strictly SKIP.
2. If riskScore >= 80 BUT EMA >= 2.0x (High Volatility/Hot Streak) -> Recommend CONSERVATIVE (1.05-1.15x) instead of SKIP, as momentum exists.
3. If hitRate for 1.20x >= 75%, prioritize BALANCED strategy at 1.20x-1.49x.
4. If riskScore <= 55 AND EMA >= 1.8x -> Confidently recommend AGGRESSIVE with a minimum target of 3.00x.
5. If hitRate(3.00x) >= 20% -> Confidently recommend AGGRESSIVE with target >= 3.00x to catch the deep run.
6. 5-10x targets: allowed when EMA > 2.5x and trend is rising, justify explicitly.
7. Ensure cashout_target perfectly matches the strategy: CONSERVATIVE (<1.20x), BALANCED (1.20x-2.99x), AGGRESSIVE (>=3.00x).

Return EXACTLY this JSON (no other text):
{"risk":"LOW|MEDIUM|HIGH","confidence":0-100,"should_bet":true|false,"strategy":"CONSERVATIVE|BALANCED|AGGRESSIVE|SKIP","cashout_target":1.10,"low_zone_target":1.10,"high_zone_target":null,"recommended_stake_pct":1-5,"summary":"2-3 sentences on time+risk+why"}`;
}

export async function callAI(prompt: string): Promise<{ result: any; model: string } | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  for (const model of AI_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

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
          temperature: 0.15,
          max_tokens: 350,
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
