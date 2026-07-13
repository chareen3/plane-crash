import { type Prediction } from "./dashboard-types";

function asRisk(v: unknown): "LOW" | "MEDIUM" | "HIGH" {
  const s = String(v ?? "").toUpperCase();
  if (s === "LOW" || s === "MEDIUM" || s === "HIGH") return s;
  return "MEDIUM";
}

function asStrategy(v: unknown, shouldBet: boolean): string {
  const s = String(v ?? "").toUpperCase().trim();
  if (s === "SKIP" || (!shouldBet && !s)) return "SKIP";
  // API may return BET_NORMAL; UI strategy meta uses CONSERVATIVE
  if (s === "BET_NORMAL" || s === "BET" || s === "SAFE") return "CONSERVATIVE";
  if (s === "AGGRESSIVE" || s === "SWING" || s === "CONSERVATIVE") return s;
  return shouldBet ? "CONSERVATIVE" : "SKIP";
}

function asPhase(v: unknown): "CALM" | "NORMAL" | "VOLATILE" | undefined {
  const s = String(v ?? "").toUpperCase();
  if (s === "CALM" || s === "NORMAL" || s === "VOLATILE") return s;
  return undefined;
}

/**
 * Normalize API / extension prediction payloads so the AI coach never crashes
 * on missing aliases (risk vs predicted_risk, etc.).
 */
export function normalizePrediction(raw: any): Prediction | null {
  if (!raw || typeof raw !== "object") return null;
  // Reject pure error payloads
  if (raw.error && !raw.risk && !raw.predicted_risk && raw.strategy == null && raw.cashout_target == null) {
    return null;
  }

  const risk = asRisk(raw.risk ?? raw.predicted_risk);
  const shouldBet =
    typeof raw.should_bet === "boolean"
      ? raw.should_bet
      : String(raw.strategy ?? "").toUpperCase() !== "SKIP" &&
        raw.skip_round !== true;

  const strategy = asStrategy(raw.strategy, shouldBet);

  let cashout = Number(raw.cashout_target ?? raw.predicted_multiplier ?? 0);
  if (!Number.isFinite(cashout) || cashout < 0) cashout = 0;
  if (shouldBet && cashout < 1.05) {
    const fallback = Number(raw.predicted_multiplier ?? raw.tier_safe);
    cashout = Number.isFinite(fallback) && fallback >= 1.05 ? fallback : 1.2;
  }
  if (!shouldBet) {
    // Keep 0 for SKIP so UI shows wait/skip, not a fake target
    cashout = Number.isFinite(cashout) && cashout >= 1.05 ? cashout : 0;
  }

  let swing: number | null = null;
  if (raw.swing_target != null && Number(raw.swing_target) > 1) {
    swing = Number(raw.swing_target);
  }

  const long = raw.long_targets && typeof raw.long_targets === "object" ? raw.long_targets : {};
  const long_targets = {
    x5: Number.isFinite(Number(long.x5)) ? Number(long.x5) : 0,
    x10: Number.isFinite(Number(long.x10)) ? Number(long.x10) : 0,
    x20: Number.isFinite(Number(long.x20)) ? Number(long.x20) : 0,
  };

  const conf = Number(raw.confidence);
  const icr = Number(raw.instant_crash_risk);

  return {
    ...raw,
    risk,
    predicted_risk: risk,
    confidence: Number.isFinite(conf) ? Math.max(0, Math.min(100, conf)) : 0,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    strategy,
    should_bet: shouldBet && strategy !== "SKIP",
    cashout_target: cashout,
    predicted_multiplier: (() => {
      const pm = Number(raw.predicted_multiplier);
      return Number.isFinite(pm) && pm > 0 ? pm : cashout;
    })(),
    swing_target: swing,
    long_targets,
    skip_reason: raw.skip_reason ?? null,
    strategy_reason: typeof raw.strategy_reason === "string" ? raw.strategy_reason : "",
    recommended_stake_pct:
      raw.recommended_stake_pct != null && Number.isFinite(Number(raw.recommended_stake_pct))
        ? Number(raw.recommended_stake_pct)
        : undefined,
    recommended_bet_units: raw.recommended_bet_units,
    ai_model_used: typeof raw.ai_model_used === "string" ? raw.ai_model_used : undefined,
    volatility_phase: asPhase(raw.volatility_phase),
    instant_crash_risk: Number.isFinite(icr) ? icr : undefined,
    instant_crash_warning:
      typeof raw.instant_crash_warning === "string" ? raw.instant_crash_warning : undefined,
    stability_analysis: raw.stability_analysis,
    stats: raw.stats,
  };
}

export function riskTone(risk: unknown): "green" | "yellow" | "red" {
  const r = asRisk(risk);
  if (r === "LOW") return "green";
  if (r === "HIGH") return "red";
  return "yellow";
}

export function riskKey(risk: unknown): "LOW" | "MEDIUM" | "HIGH" {
  return asRisk(risk);
}

/** Safe cashout display value for coach cards */
export function safeCashout(
  prediction: Prediction | null | undefined,
  fallback?: number | null,
): number {
  const c = Number(prediction?.cashout_target ?? prediction?.predicted_multiplier ?? 0);
  if (Number.isFinite(c) && c >= 1.05) return c;
  const f = Number(fallback);
  if (Number.isFinite(f) && f >= 1.05) return f;
  return 1.1;
}
