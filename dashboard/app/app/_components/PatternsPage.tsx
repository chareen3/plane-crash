"use client";

import { useMemo } from "react";
import {
  Layers, Activity, Flame, Snowflake, Zap, TrendingUp, TrendingDown,
  AlertTriangle, Shield, BarChart3, GitBranch, Info, Sparkles,
} from "lucide-react";
import { type Translations, type LanguageCode } from "@/lib/locales";
import { type CrashStats } from "@/lib/stats";
import { type Round, type Prediction } from "../_lib/dashboard-types";

interface PatternsPageProps {
  rounds: Round[];
  stats: CrashStats | null;
  prediction: Prediction | null;
  lang: LanguageCode;
  t: Translations;
}

type LivePattern = {
  id: string;
  name: string;
  desc: string;
  active: boolean;
  severity: "high" | "medium" | "low" | "info";
  metric?: string;
  color: string;
};

function tierOf(v: number): "INSTANT" | "LOW" | "MED" | "HIGH" {
  if (v < 1.15) return "INSTANT";
  if (v < 2) return "LOW";
  if (v < 5) return "MED";
  return "HIGH";
}

function tierColor(t: string) {
  if (t === "INSTANT") return "#ff3366";
  if (t === "LOW") return "#ffd000";
  if (t === "MED") return "#00e5a0";
  return "#a78bfa";
}

export function PatternsPage({ rounds, stats, prediction, lang, t }: PatternsPageProps) {
  const values = useMemo(
    () => rounds.map(r => Number(r.crash_point)).filter(v => Number.isFinite(v)),
    [rounds],
  );

  const L = {
    title: lang === "si" ? "රටා මධ්‍යස්ථානය" : lang === "ta" ? "வடிவ மையம்" : "Patterns Hub",
    desc: lang === "si"
      ? "සජීවී ධාරා, අනුක්‍රම සහ Markov සම්භාවිතා — ඔබ ක්‍රීඩා කරන තත්ත්වය තේරුම් ගන්න."
      : lang === "ta"
      ? "நேரடி தொடர்கள், வரிசைகள் மற்றும் Markov — நீங்கள் விளையாடும் சூழலைப் புரிந்துகொள்ளுங்கள்."
      : "Live streaks, sequences, and Markov odds — understand the conditions you are playing in.",
    activeNow: lang === "si" ? "දැන් සක්‍රිය" : lang === "ta" ? "இப்போது செயலில்" : "Active Now",
    inactive: lang === "si" ? "නිශ්චල" : lang === "ta" ? "செயலற்றது" : "Quiet",
    sequence: lang === "si" ? "ජීව අනුක්‍රම ගැලපුම" : lang === "ta" ? "நேரடி வரிசை பொருத்தம்" : "Live Sequence Match",
    markov: lang === "si" ? "Markov ඊළඟ තත්ත්වය" : lang === "ta" ? "Markov அடுத்த நிலை" : "Markov Next State",
    streaks: lang === "si" ? "ධාරා මණ්ඩලය" : lang === "ta" ? "ஸ்ட்ரீக் பலகை" : "Streak Board",
    distribution: lang === "si" ? "මෑත තීරු ව්‍යාප්තිය" : lang === "ta" ? "சமீப அடுக்கு விநியோகம்" : "Recent Tier Distribution",
    detected: lang === "si" ? "හඳුනාගත් ධාරා රටා" : lang === "ta" ? "கண்டறியப்பட்ட தொடர் வடிவங்கள்" : "Detected Streak Patterns",
    engine: lang === "si" ? "එන්ජින් තත්ත්වය" : lang === "ta" ? "இயந்திர நிலை" : "Engine State",
    disclaimer: lang === "si"
      ? "රටා ඓතිහාසික සාරාංශයකි — ඊළඟ වටය නිශ්චිතව අනාවැකි නොකරයි. RNG ස්වාධීනයි."
      : lang === "ta"
      ? "வடிவங்கள் வரலாற்று சுருக்கம் — அடுத்த சுற்றை உறுதியாக கணிக்காது. RNG சுயாதீனம்."
      : "Patterns summarize history — they do not guarantee the next round. Outcomes are independent.",
    noData: lang === "si" ? "රටා සඳහා වට ග්‍රහණය කරන්න" : lang === "ta" ? "வடிவங்களுக்கு சுற்றுகளைப் பிடிக்கவும்" : "Capture rounds to unlock live patterns",
    occurrences: lang === "si" ? "සිදුවීම්" : lang === "ta" ? "நிகழ்வுகள்" : "occurrences",
    nextWin: lang === "si" ? "ඊළඟ වට හිට්" : lang === "ta" ? "அடுத்த ஹிட்" : "Next-round hit rates",
    lastN: lang === "si" ? "අවසන්" : lang === "ta" ? "கடைசி" : "Last",
    lowStreak: lang === "si" ? "අඩු ධාරාව (<2x)" : lang === "ta" ? "குறைவு தொடர் (<2x)" : "Low streak (<2x)",
    highStreak: lang === "si" ? "ඉහළ ධාරාව (≥2x)" : lang === "ta" ? "உயர் தொடர் (≥2x)" : "High streak (≥2x)",
    high250: lang === "si" ? "උණුසුම් ධාරාව (≥2.5x)" : lang === "ta" ? "சூடான தொடர் (≥2.5x)" : "Hot streak (≥2.5x)",
    form: lang === "si" ? "මෑත ආකෘතිය" : lang === "ta" ? "சமீப வடிவம்" : "Recent form",
    recovery: lang === "si" ? "ප්‍රතිසාධන මාදිලිය" : lang === "ta" ? "மீட்பு முறை" : "Recovery mode",
    regime: lang === "si" ? "වාෂ්පශීලී තත්ත්වය" : lang === "ta" ? "ஏற்ற இறக்கம்" : "Volatility regime",
    ensemble: lang === "si" ? "සමූහ ලකුණු" : lang === "ta" ? "என்செம்பிள்" : "Ensemble score",
    risk: lang === "si" ? "අවදානම" : lang === "ta" ? "ஆபத்து" : "Risk",
    master: lang === "si" ? "ප්‍රධාන සංඥාව" : lang === "ta" ? "முதன்மை சிக்னல்" : "Master signal",
    instantRisk: lang === "si" ? "ක්ෂණික අවදානම" : lang === "ta" ? "உடனடி ஆபத்து" : "Instant next",
    safeNext: lang === "si" ? "ආරක්ෂිත (≥1.15)" : lang === "ta" ? "பாதுகாப்பு (≥1.15)" : "Safe next (≥1.15)",
    medNext: lang === "si" ? "MED+ (≥2x)" : lang === "ta" ? "MED+ (≥2x)" : "MED+ (≥2x)",
    highNext: lang === "si" ? "HIGH (≥5x)" : lang === "ta" ? "HIGH (≥5x)" : "HIGH (≥5x)",
    noSeq: lang === "si" ? "තවම ගැලපුමක් නැත — තව වට අවශ්‍යයි" : lang === "ta" ? "பொருத்தம் இல்லை — மேலும் சுற்றுகள் தேவை" : "No sequence match yet — need more rounds",
    noPattern: lang === "si" ? "සක්‍රිය ධාරා රටා නැත" : lang === "ta" ? "செயலில் தொடர் இல்லை" : "No active streak patterns",
  };

  const last20 = values.slice(0, 20);
  const last50 = values.slice(0, 50);

  const dist = (arr: number[]) => {
    const n = arr.length || 1;
    const c = { INSTANT: 0, LOW: 0, MED: 0, HIGH: 0 };
    for (const v of arr) c[tierOf(v)]++;
    return (Object.keys(c) as (keyof typeof c)[]).map(k => ({
      tier: k,
      count: c[k],
      pct: Math.round((c[k] / n) * 100),
    }));
  };

  const dist20 = dist(last20);
  const dist50 = dist(last50);

  // Alternation score: consecutive flips between <2 and >=2
  let flips = 0;
  for (let i = 1; i < Math.min(15, values.length); i++) {
    const a = values[i - 1] < 2;
    const b = values[i] < 2;
    if (a !== b) flips++;
  }
  const oscScore = Math.min(15, values.length) > 1
    ? Math.round((flips / (Math.min(15, values.length) - 1)) * 100)
    : 0;

  const plateauCount = last20.filter(v => v >= 2 && v < 4).length;
  const megaRecent = values.slice(0, 10).filter(v => v >= 10).length;
  const instantRecent = values.slice(0, 5).filter(v => v < 1.15).length;

  const livePatterns: LivePattern[] = [
    {
      id: "instant_cluster",
      name: lang === "si" ? "ක්ෂණික ක්‍රෑෂ් ධාරාව" : lang === "ta" ? "உடனடி கிராஷ் தொடர்" : "Instant Crash Pressure",
      desc: lang === "si" ? "අවසන් 5 තුළ බහු ක්ෂණික (<1.15x)" : lang === "ta" ? "கடைசி 5 இல் பல உடனடி (<1.15x)" : "Multiple instants (<1.15x) in the last 5 rounds",
      active: instantRecent >= 2 || (stats?.instantClusterRisk ?? 0) > 55,
      severity: "high",
      metric: instantRecent >= 2 ? `${instantRecent}/5 instants` : `cluster ${stats?.instantClusterRisk ?? 0}%`,
      color: "#ff3366",
    },
    {
      id: "cold_lock",
      name: lang === "si" ? "සීතල ධාරාව" : lang === "ta" ? "குளிர் தொடர்" : "Cold Lock",
      desc: lang === "si" ? "අනුක්‍රමික <2x වට — ප්‍රවේශම් වන්න" : lang === "ta" ? "தொடர் <2x — கவனம்" : "Consecutive rounds below 2x — play tighter",
      active: (stats?.currentLowStreak ?? 0) >= 3,
      severity: "high",
      metric: `${stats?.currentLowStreak ?? 0} low`,
      color: "#ff3366",
    },
    {
      id: "hot_run",
      name: lang === "si" ? "උණුසුම් ධාරාව" : lang === "ta" ? "சூடான ஓட்டம்" : "Hot Run",
      desc: lang === "si" ? "අනුක්‍රමික ≥2x — ස්විං අවස්ථා" : lang === "ta" ? "தொடர் ≥2x — ஸ்விங் வாய்ப்பு" : "Consecutive ≥2x — swing windows more viable",
      active: (stats?.currentHighStreak ?? 0) >= 3,
      severity: "low",
      metric: `${stats?.currentHighStreak ?? 0} high`,
      color: "#00e5a0",
    },
    {
      id: "oscillation",
      name: lang === "si" ? "උච්චාවචනය" : lang === "ta" ? "ஏற்ற இறக்கம்" : "Volatile Oscillation",
      desc: lang === "si" ? "අඩු/ඉහළ මාරුව ඉහළයි" : lang === "ta" ? "குறைவு/உயர் மாற்றம் அதிகம்" : "High flip rate between low and high rounds",
      active: oscScore >= 55,
      severity: "medium",
      metric: `${oscScore}% flips`,
      color: "#ffd000",
    },
    {
      id: "plateau",
      name: lang === "si" ? "ස්ථාවර තලාව" : lang === "ta" ? "நிலையான சமவெளி" : "Stable Plateau",
      desc: lang === "si" ? "අවසන් 20 තුළ බොහෝ 2–4x" : lang === "ta" ? "கடைசி 20 இல் பல 2–4x" : "Many 2–4x outcomes in the last 20",
      active: plateauCount >= 10 && oscScore < 50,
      severity: "low",
      metric: `${plateauCount}/20 in 2–4x`,
      color: "#00e5a0",
    },
    {
      id: "mega",
      name: lang === "si" ? "මෙගා පොකුර" : lang === "ta" ? "மெகா கிளஸ்டர்" : "Mega Hit Cluster",
      desc: lang === "si" ? "අවසන් 10 තුළ 10x+" : lang === "ta" ? "கடைசி 10 இல் 10x+" : "10x+ rounds in the last 10",
      active: megaRecent >= 1 || stats?.recoveryMode === "POST_MEGA" || stats?.recoveryMode === "POST_SPIKE",
      severity: "info",
      metric: `${megaRecent} megas /10`,
      color: "#a78bfa",
    },
    {
      id: "recovery",
      name: lang === "si" ? "ප්‍රතිසාධන අගුල" : lang === "ta" ? "மீட்பு பூட்டு" : "Recovery Cool-down",
      desc: lang === "si" ? "මෙගා/සීතල පසු එන්ජින් ප්‍රවේශම්" : lang === "ta" ? "மெகா/குளிருக்குப் பிறகு எச்சரிக்கை" : "Engine in recovery after mega or cold lock",
      active: !!stats?.recoveryMode && stats.recoveryMode !== "NONE",
      severity: "medium",
      metric: stats?.recoveryMode ?? "NONE",
      color: "#ffd000",
    },
    {
      id: "extreme_regime",
      name: lang === "si" ? "අන්ත වාෂ්පශීලතාව" : lang === "ta" ? "தீவிர ஏற்ற இறக்கம்" : "Extreme Regime",
      desc: lang === "si" ? "HIGH/EXTREME වාෂ්පශීලතා තත්ත්වය" : lang === "ta" ? "HIGH/EXTREME நிலை" : "HIGH or EXTREME volatility regime active",
      active: stats?.volatilityRegime === "HIGH" || stats?.volatilityRegime === "EXTREME",
      severity: stats?.volatilityRegime === "EXTREME" ? "high" : "medium",
      metric: stats?.volatilityRegime ?? "—",
      color: "#ff3366",
    },
  ];

  const activeCount = livePatterns.filter(p => p.active).length;
  const seq = stats?.sequenceMatch;
  const markov = stats?.markovNext;
  const detected = stats?.detectedPatterns ?? [];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <Layers size={26} color="#a78bfa" /> {L.title}
        </h2>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, maxWidth: 680 }}>{L.desc}</p>
        <div style={{ marginTop: 10, fontSize: 11, color: "#555", display: "flex", gap: 6, alignItems: "flex-start" }}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {L.disclaimer}
        </div>
      </div>

      {rounds.length < 5 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: "center", color: "#888" }}>
          <Layers size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>{L.noData}</div>
        </div>
      ) : (
        <>
          {/* Engine state strip */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={12} color="#00e5a0" /> {L.engine}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 22 }}>
            {[
              { label: L.master, value: stats?.masterSignal ?? "—", color: stats?.masterSignal === "BUY" || stats?.masterSignal === "STRONG_BUY" ? "#00e5a0" : stats?.masterSignal === "DANGER" || stats?.masterSignal === "ABORT" ? "#ff3366" : "#ffd000" },
              { label: L.risk, value: `${stats?.riskScore ?? "—"}/100`, color: (stats?.riskScore ?? 0) > 60 ? "#ff3366" : "#00e5a0" },
              { label: L.regime, value: stats?.volatilityRegime ?? "—", color: "#a78bfa" },
              { label: L.form, value: stats?.recentMomentumLabel ?? stats?.sessionMomentum ?? "—", color: "#00d4ff" },
              { label: L.recovery, value: stats?.recoveryMode ?? "NONE", color: stats?.recoveryMode && stats.recoveryMode !== "NONE" ? "#ffd000" : "#666" },
              { label: L.ensemble, value: stats?.ensembleScore ?? "—", color: "#fff" },
            ].map(cell => (
              <div key={cell.label} className="glass-card" style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 9, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>{cell.label}</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: cell.color, marginTop: 4 }}>{cell.value}</div>
              </div>
            ))}
          </div>

          {/* Active patterns */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={12} color="#ffd000" /> {L.activeNow}
            <span style={{ color: activeCount > 0 ? "#ffd000" : "#555", marginLeft: 6 }}>({activeCount})</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 24 }}>
            {livePatterns.map(p => (
              <div
                key={p.id}
                className="glass-card"
                style={{
                  padding: 14,
                  border: p.active ? `1px solid ${p.color}55` : "1px solid rgba(255,255,255,0.05)",
                  opacity: p.active ? 1 : 0.55,
                  background: p.active ? `linear-gradient(145deg, ${p.color}14, transparent)` : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: p.active ? p.color : "#555", letterSpacing: 0.5 }}>
                    {p.active ? L.activeNow.toUpperCase() : L.inactive.toUpperCase()}
                  </span>
                  {p.metric && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.active ? "#fff" : "#666" }}>{p.metric}</span>
                  )}
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4, lineHeight: 1.45 }}>{p.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 20 }}>
            {/* Sequence */}
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <GitBranch size={14} color="#00d4ff" /> {L.sequence}
              </div>
              {seq ? (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {seq.sequence.map((s, i) => (
                      <span key={i} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: `${tierColor(s)}22`, color: tierColor(s), border: `1px solid ${tierColor(s)}40` }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>
                    {seq.occurrences} {L.occurrences}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>{L.instantRisk}</span><strong style={{ color: seq.pInstantNext > 25 ? "#ff3366" : "#fff" }}>{seq.pInstantNext}%</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>{L.safeNext}</span><strong style={{ color: "#00e5a0" }}>{seq.pSafeNext}%</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>{L.medNext}</span><strong style={{ color: "#ffd000" }}>{seq.pMedNext}%</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>{L.highNext}</span><strong style={{ color: "#a78bfa" }}>{seq.pHighNext}%</strong></div>
                  </div>
                </>
              ) : (
                <div style={{ color: "#555", fontSize: 12 }}>{L.noSeq}</div>
              )}
            </div>

            {/* Markov */}
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={14} color="#a78bfa" /> {L.markov}
              </div>
              {markov ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(["INSTANT", "LOW", "MED", "HIGH"] as const).map(k => {
                    const pct = markov[k] ?? 0;
                    return (
                      <div key={k}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: tierColor(k), fontWeight: 700 }}>{k}</span>
                          <span style={{ color: "#fff", fontWeight: 700 }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: tierColor(k), borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                    MED+HIGH = {((markov.MED ?? 0) + (markov.HIGH ?? 0)).toFixed(0)}% · suggest {stats?.markovSuggestedCashout?.toFixed(2) ?? "—"}x
                  </div>
                </div>
              ) : (
                <div style={{ color: "#555", fontSize: 12 }}>—</div>
              )}
            </div>

            {/* Streak board */}
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Flame size={14} color="#ffd000" /> {L.streaks}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Snowflake size={16} color="#ff3366" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#888" }}>{L.lowStreak}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 800, color: "#ff3366" }}>{stats?.currentLowStreak ?? 0}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TrendingUp size={16} color="#00e5a0" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#888" }}>{L.highStreak}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 800, color: "#00e5a0" }}>{stats?.currentHighStreak ?? 0}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Zap size={16} color="#ffd000" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#888" }}>{L.high250}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 800, color: "#ffd000" }}>{stats?.currentHighStreak250 ?? 0}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#666", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 10 }}>
                  Longest low streak (sample): <strong style={{ color: "#fff" }}>{stats?.longestLowStreak ?? 0}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Distribution */}
          <div className="glass-card" style={{ padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={14} color="#00e5a0" /> {L.distribution}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { title: `${L.lastN} 20`, data: dist20 },
                { title: `${L.lastN} 50`, data: dist50 },
              ].map(block => (
                <div key={block.title}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 8, fontWeight: 700 }}>{block.title}</div>
                  {block.data.map(row => (
                    <div key={row.tier} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: tierColor(row.tier), fontWeight: 700 }}>{row.tier}</span>
                        <span style={{ color: "#aaa" }}>{row.count} · {row.pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
                        <div style={{ width: `${row.pct}%`, height: "100%", background: tierColor(row.tier), borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Detected streak patterns from stats engine */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>
            {L.detected}
          </div>
          {detected.length === 0 ? (
            <div className="glass-card" style={{ padding: 20, color: "#555", fontSize: 12, marginBottom: 20 }}>{L.noPattern}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {detected.map((pat, i) => (
                <div key={i} className="glass-card" style={{ padding: 16, border: "1px solid rgba(167,139,250,0.25)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff" }}>{pat.patternName}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{pat.occurrences} {L.occurrences}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: "#a78bfa", fontWeight: 700 }}>p50 / p80 / p90</div>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: "#a78bfa" }}>
                        {pat.p50?.toFixed(2) ?? "—"} / {pat.p80?.toFixed(2) ?? "—"} / {pat.p90?.toFixed(2) ?? "—"}
                      </div>
                    </div>
                  </div>
                  {pat.nextRoundWinRates?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 6 }}>{L.nextWin}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {pat.nextRoundWinRates.map(r => (
                          <span key={r.target} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#ccc" }}>
                            {r.target}x → <strong style={{ color: r.hitRate >= 55 ? "#00e5a0" : "#ffd000" }}>{r.hitRate}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stability from prediction if present */}
          {prediction?.stability_analysis && (
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={14} color="#00e5a0" /> {t.stabilityTitle}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#666" }}>{t.stabilityMatchScore}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{prediction.stability_analysis.similarity_score}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#666" }}>{t.stabilityIndexScore}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#00e5a0" }}>{prediction.stability_analysis.stability_index}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#666" }}>Status</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffd000" }}>{prediction.stability_analysis.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#666" }}>Hist ≥1.5x</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa" }}>{prediction.stability_analysis.historical_win_rate_1_5x}%</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
