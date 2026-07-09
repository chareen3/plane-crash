/**
 * Crash Probability and Expected Value (EV) calculator
 * based on standard provably fair crash distribution math.
 */

/**
 * Calculates the theoretical probability of reaching a target multiplier.
 * Formula: P(reach M) = RTP / M
 * 
 * @param multiplier The target multiplier (e.g. 1.5, 2.0)
 * @param rtp Percentage RTP value (e.g. 97.0 for 97% RTP)
 * @returns Probability as a fraction between 0 and 1
 */
export function calculateProbability(multiplier: number, rtp: number): number {
  if (multiplier < 1.0) return 1.0; // At 1.0x, it's always reached unless it's a 1.00x instant crash (which is covered by house edge)
  const rtpFraction = rtp / 100;
  const prob = rtpFraction / multiplier;
  return Math.min(1.0, Math.max(0.0, prob));
}

/**
 * Calculates the expected value (EV) per 1 unit bet at a target multiplier.
 * Formula: EV = (P_win * (M - 1)) + ((1 - P_win) * -1)
 * 
 * @param multiplier The target multiplier (e.g. 1.5)
 * @param rtp Percentage RTP value (e.g. 97.0)
 * @returns EV per 1 unit bet (e.g. -0.03 for 97% RTP)
 */
export function calculateEV(multiplier: number, rtp: number): number {
  const pWin = calculateProbability(multiplier, rtp);
  const pLoss = 1 - pWin;
  const ev = (pWin * (multiplier - 1)) + (pLoss * -1);
  return Math.round(ev * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Resolves standard target multiplier from strategy presets
 */
export function getPresetTarget(preset: string, rtp: number): number {
  const rtpFraction = rtp / 100;
  switch (preset) {
    case 'safe':
      // M so crash probability before M ≈ 28% -> P_win ≈ 72% -> M = RTP / 0.72
      return Math.round((rtpFraction / 0.72) * 100) / 100; // e.g. 1.35
    case 'balanced':
      return 2.00;
    case 'high_risk':
      return 5.00;
    default:
      return 1.50;
  }
}
