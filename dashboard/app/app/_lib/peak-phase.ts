/**
 * Shared Peak Hours phase colors — desktop TimeSyncCard + mobile coach must match.
 * Phase is always Colombo (market) time, independent of user profile timezone.
 */

export type PeakPhase = "SLEEP" | "MORNING" | "DAY" | "EVENING" | "PRIME" | "LATE";

export interface PeakPhaseMeta {
  phase: PeakPhase;
  label: string;
  color: string;
  glow: string;
  bg: string;
  border: string;
}

export const PEAK_PHASE_META: Record<PeakPhase, PeakPhaseMeta> = {
  SLEEP: {
    phase: "SLEEP",
    label: "SLEEP",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.3)",
    bg: "linear-gradient(135deg, rgba(99,102,241,0.14), rgba(12,14,28,0.96) 55%)",
    border: "rgba(99,102,241,0.4)",
  },
  MORNING: {
    phase: "MORNING",
    label: "MORNING",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.3)",
    bg: "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(18,14,10,0.96) 55%)",
    border: "rgba(245,158,11,0.38)",
  },
  DAY: {
    phase: "DAY",
    label: "DAY",
    color: "#38bdf8",
    glow: "rgba(56,189,248,0.3)",
    bg: "linear-gradient(135deg, rgba(56,189,248,0.14), rgba(10,16,24,0.96) 55%)",
    border: "rgba(56,189,248,0.38)",
  },
  EVENING: {
    phase: "EVENING",
    label: "EVENING",
    color: "#f97316",
    glow: "rgba(249,115,22,0.3)",
    bg: "linear-gradient(135deg, rgba(249,115,22,0.14), rgba(20,12,8,0.96) 55%)",
    border: "rgba(249,115,22,0.38)",
  },
  PRIME: {
    phase: "PRIME",
    label: "PRIME",
    color: "#00e5a0",
    glow: "rgba(0,229,160,0.4)",
    bg: "linear-gradient(135deg, rgba(0,229,160,0.16), rgba(8,16,14,0.96) 55%)",
    border: "rgba(0,229,160,0.4)",
  },
  LATE: {
    phase: "LATE",
    label: "LATE",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.3)",
    bg: "linear-gradient(135deg, rgba(167,139,250,0.14), rgba(14,12,24,0.96) 55%)",
    border: "rgba(167,139,250,0.38)",
  },
};

export function resolvePeakPhase(raw: unknown): PeakPhase {
  const s = String(raw ?? "DAY").toUpperCase();
  if (s in PEAK_PHASE_META) return s as PeakPhase;
  return "DAY";
}

export function getPeakPhaseMeta(raw: unknown): PeakPhaseMeta {
  return PEAK_PHASE_META[resolvePeakPhase(raw)];
}

export const PEAK_TAG_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  PEAK: { color: "#00e5a0", bg: "rgba(0,229,160,0.14)", border: "rgba(0,229,160,0.28)" },
  HOT: { color: "#ffd000", bg: "rgba(255,208,0,0.12)", border: "rgba(255,208,0,0.25)" },
  WARM: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)" },
  NORM: { color: "#94a3b8", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)" },
};

export function getPeakTagStyle(tag: unknown) {
  const t = String(tag ?? "NORM").toUpperCase();
  return PEAK_TAG_COLORS[t] || PEAK_TAG_COLORS.NORM;
}
