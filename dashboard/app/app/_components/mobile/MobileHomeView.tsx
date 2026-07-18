"use client";

import { useRef, useState } from "react";
import {
  Activity, AlertOctagon, CheckCircle2, Flame, Shield,
  Target, TrendingUp, Gift, Loader2,
} from "lucide-react";
import { useDashboard } from "../../_context/DashboardContext";
import { MobileAICoach } from "./MobileAICoach";

/**
 * Mobile-native home — signal, AI coach, chips, last 5 crashes.
 */
export function MobileHomeView() {
  const d = useDashboard();
  const {
    prediction, stats, rounds, lang, t, winRate, statsWindow, setStatsWindow,
    avg, heroRef, isPredicting, predStatus, timeData, getTargetStats,
    subscription, claimTrial,
  } = d;

  const [claiming, setClaiming] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const w = statsWindow === "24h" ? winRate.last24h : statsWindow === "7d" ? winRate.last7d : winRate.allTime;
  const hasBets = !!(w && w.total > 0);

  const cashout = prediction?.should_bet && prediction.cashout_target
    ? prediction.cashout_target
    : stats?.suggestedCashout ?? 0;
  const strategy = prediction?.strategy ?? "—";
  const isSkip = prediction?.strategy === "SKIP" || prediction?.should_bet === false;
  const conf = prediction?.confidence ?? stats?.signalConfidence ?? 0;
  const risk = stats?.riskScore ?? 0;
  const regime = stats?.volatilityRegime ?? "—";
  const form = stats?.recentMomentumLabel ?? stats?.sessionMomentum ?? "—";

  const strategyColor = isSkip
    ? "#ff3366"
    : strategy === "AGGRESSIVE"
      ? "#ffd000"
      : "#00e5a0";

  const recent = rounds.slice(0, 5);

  const isTrialActive = subscription && subscription.status === "trial" && subscription.current_period_end && new Date(subscription.current_period_end) > new Date();
  const isSubActive = subscription && subscription.status === "active" && subscription.current_period_end && new Date(subscription.current_period_end) > new Date();
  const hasAccess = isTrialActive || isSubActive || d.isAdmin;

  if (!hasAccess) {
    return (
      <div className="m-home" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div 
          className="glass-card" 
          style={{ 
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            padding: "32px 24px",
            borderRadius: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            boxShadow: "0 8px 32px 0 rgba(6, 182, 212, 0.05)",
            position: "relative",
            overflow: "hidden",
            textAlign: "center"
          }}
        >
          <div className="absolute -right-16 -top-16 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div 
            style={{ 
              width: 64, 
              height: 64, 
              borderRadius: 16, 
              background: "rgba(6, 182, 212, 0.2)", 
              border: "1px solid rgba(6, 182, 212, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00ffd5",
              boxShadow: "0 0 30px rgba(6, 182, 212, 0.2)"
            }}
          >
            <Gift size={32} />
          </div>
          
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Unlock Full Access
            </h3>
            <p style={{ fontSize: 14, color: "#a0aec0", lineHeight: 1.5, margin: 0 }}>
              Activate your <strong style={{ color: "#00ffd5" }}>7-Day Free Trial</strong> for instant access to real-time AI signals, risk telemetry & stats. No card required.
            </p>
          </div>

          <button
            onClick={async () => {
              setClaiming(true);
              await claimTrial();
              setClaiming(false);
            }}
            disabled={claiming}
            style={{
              padding: "16px",
              background: "linear-gradient(135deg, #00ffd5 0%, #00b8ff 100%)",
              color: "#080c18",
              fontWeight: 800,
              fontSize: 15,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.2s ease-in-out",
              boxShadow: "0 4px 16px rgba(0, 255, 213, 0.3)",
              width: "100%",
              marginTop: 10
            }}
          >
            {claiming ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Activating...
              </>
            ) : (
              <>
                Claim Trial Now
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="m-home">

      {/* Hero signal */}
      <section
        ref={heroRef as React.RefObject<HTMLDivElement>}
        className={`m-signal-card ${isSkip ? "skip" : "bet"}`}
      >
        <div className="m-signal-glow" aria-hidden />
        <div className="m-signal-top">
          <span
            className="m-signal-badge"
            style={{
              color: strategyColor,
              borderColor: `${strategyColor}55`,
              background: `${strategyColor}18`,
            }}
          >
            {isSkip ? "SKIP" : strategy}
          </span>
          <span className="m-signal-conf">{conf}%</span>
        </div>

        {isSkip ? (
          <>
            <div className="m-signal-skip-title">
              <Shield size={22} />
              {t.skipSignalActive || "SKIP SIGNAL"}
            </div>
            <p className="m-signal-reason">
              {prediction?.skip_reason || prediction?.strategy_reason || t.holdDoNotEnter}
            </p>
          </>
        ) : (
          <>
            <div className="m-signal-target">
              {cashout > 0 ? cashout.toFixed(2) : "—"}
              <span>x</span>
            </div>
            <div className="m-signal-sub">
              {lang === "si" ? "ආරක්ෂිත කෑෂ්අවුට්" : lang === "ta" ? "பாதுகாப்பு கேஷ்அவுட்" : "Safe cashout"}
              {stats?.suggestedCashoutWinRate != null && (
                <span className="m-signal-hit"> · ~{stats.suggestedCashoutWinRate}% hist</span>
              )}
            </div>
            <div className="m-signal-chips">
              {prediction?.swing_target != null && prediction.swing_target > 0 && (
                <span className="swing">Swing {prediction.swing_target.toFixed(2)}x</span>
              )}
              <span className="regime">{regime}</span>
              <span className="form">{String(form)}</span>
              <span className="risk">Risk {risk}</span>
            </div>
          </>
        )}
      </section>

      {/* AI Risk Coach — mobile native */}
      <MobileAICoach
        prediction={prediction}
        stats={stats}
        isPredicting={isPredicting}
        predStatus={predStatus}
        timeData={timeData}
        getTargetStats={getTargetStats}
        lang={lang}
        t={t}
      />

      {/* Stat chips */}
      <section className="m-chip-scroll" aria-label="Session stats">
        {[
          { icon: <Activity size={14} />, l: t.sessionAvg, v: `${avg}x`, c: "#00e5a0" },
          { icon: <CheckCircle2 size={14} />, l: "Hit", v: hasBets ? `${w!.winRate}%` : "—", c: "#00e5a0" },
          { icon: <Target size={14} />, l: "Target", v: cashout > 0 ? `${cashout.toFixed(2)}x` : "—", c: "#00ffd5" },
          { icon: <AlertOctagon size={14} />, l: "Instant", v: stats?.pInstantCrash != null ? `${Number(stats.pInstantCrash).toFixed(1)}%` : "—", c: "#ff3366" },
          { icon: <Flame size={14} />, l: "Risk", v: `${risk}`, c: risk > 60 ? "#ff3366" : risk < 40 ? "#00e5a0" : "#ffd000" },
          { icon: <TrendingUp size={14} />, l: t.trendTitle, v: stats?.trend === "rising" ? "↑" : stats?.trend === "falling" ? "↓" : "→", c: "#a78bfa" },
        ].map((c, i) => (
          <div key={i} className="m-stat-chip">
            <div className="m-stat-chip-ic" style={{ color: c.c }}>{c.icon}</div>
            <div className="m-stat-chip-l">{c.l}</div>
            <div className="m-stat-chip-v" style={{ color: c.c }}>{c.v}</div>
          </div>
        ))}
      </section>

      <div className="m-seg">
        {(["24h", "7d", "all"] as const).map(wKey => (
          <button
            key={wKey}
            type="button"
            className={statsWindow === wKey ? "on" : ""}
            onClick={() => setStatsWindow(wKey)}
          >
            {wKey === "24h" ? "24H" : wKey === "7d" ? "7D" : "ALL"}
          </button>
        ))}
      </div>

      <section className="m-card">
        <div className="m-card-h">
          {lang === "si" ? "සංඥා කාර්යසාධනය" : lang === "ta" ? "சிக்னல்" : "Signal performance"}
        </div>
        <div className="m-kv-grid">
          <div>
            <s>Cashout hit</s>
            <b>{hasBets ? `${w!.winRate}%` : "—"}</b>
            <em>{hasBets ? `${w!.correct}/${w!.total}` : "No BETs yet"}</em>
          </div>
          <div>
            <s>Skip saves</s>
            <b>{w?.skipSaveRate != null ? `${w.skipSaveRate}%` : "—"}</b>
            <em>{w?.skipTotal != null ? `${w.skipTotal} skips` : "—"}</em>
          </div>
          <div>
            <s>BET rate</s>
            <b>{w?.betRate != null ? `${w.betRate}%` : "—"}</b>
            <em>{w?.skipRate != null ? `${w.skipRate}% skip` : "—"}</em>
          </div>
          <div>
            <s>EV / bet</s>
            <b className={(w?.realizedEv ?? 0) >= 0 ? "g" : "r"}>
              {hasBets && w?.realizedEv != null
                ? `${w.realizedEv >= 0 ? "+" : ""}${w.realizedEv.toFixed(2)}`
                : "—"}
            </b>
            <em>{hasBets ? "per unit" : "—"}</em>
          </div>
        </div>
      </section>

      {/* Last 5 crashes only */}
      <section className="m-card m-crash-feed-card" ref={feedRef}>
        <div className="m-card-h">
          <Flame size={14} color="#ffd000" />
          {lang === "si" ? "මෑත ක්‍රෑෂ්" : lang === "ta" ? "சமீப கிராஷ்" : "Recent crashes"}
          <span className="m-card-h-meta">5</span>
        </div>
        {recent.length === 0 ? (
          <div className="m-empty">{t.waitingForCrashData}</div>
        ) : (
          <div className="m-crash-list">
            {recent.map((r, i) => {
              const v = Number(r.crash_point);
              const cls = v < 1.15 ? "bad" : v >= 5 ? "moon" : v >= 2 ? "good" : "mid";
              return (
                <div key={r.id ?? `${r.round_number}-${i}`} className={`m-crash-row ${cls}`}>
                  <div className={`m-crash-pip ${cls}`} />
                  <div className="m-crash-row-mid">
                    <div className="m-crash-row-top">
                      <span className="m-crash-rn">#{r.round_number}</span>
                      <span className="m-crash-time">
                        {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <div className={`m-crash-row-mult ${cls}`}>
                    {v.toFixed(2)}
                    <span>x</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
