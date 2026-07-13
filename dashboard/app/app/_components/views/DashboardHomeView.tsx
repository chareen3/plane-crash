"use client";

import { Activity, Layers, Zap } from "lucide-react";
import { useDashboard } from "../../_context/DashboardContext";
import { useMobileUI } from "../DashboardRoot";
import { MobileHomeView } from "../mobile/MobileHomeView";
import { PerformancePanel } from "../PerformancePanel";
import { BetSignalHeroCard, AIPredictionPanel } from "../PredictionCard";
import { TargetHitRatesTable, MiniLiveFeedPanel, CrashHistoryChart } from "../CrashHistoryTable";

export function DashboardHomeView() {
  const isMobile = useMobileUI();
  const d = useDashboard();
  const {
    winRate, statsWindow, setStatsWindow, showMobileStatsPanel, setShowMobileStatsPanel,
    avg, stats, lang, t, dashTab, setDashTab, prediction, rounds, heroRef,
    isPredicting, predStatus, timeData, getTargetStats, displayedRounds,
    chartType, setChartType, timeRange, setTimeRange, chartData,
  } = d;

  if (isMobile) {
    return <MobileHomeView />;
  }

  return (
    <>
      <PerformancePanel
        winRate={winRate}
        statsWindow={statsWindow}
        setStatsWindow={setStatsWindow}
        showMobileStatsPanel={showMobileStatsPanel}
        setShowMobileStatsPanel={setShowMobileStatsPanel}
        avg={avg}
        stats={stats}
        lang={lang}
        t={t}
      />

      <div className="mobile-dash-tabs hide-on-desktop">
        <button
          className={`mobile-dash-tab-btn ${dashTab === "signals" ? "active" : ""}`}
          onClick={() => setDashTab("signals")}
        >
          {lang === "si" ? "AI සංඥා" : lang === "ta" ? "AI சமிக்ஞைகள்" : "AI Signals"}
        </button>
        <button
          className={`mobile-dash-tab-btn ${dashTab === "stats" ? "active" : ""}`}
          onClick={() => setDashTab("stats")}
        >
          {lang === "si" ? "වෙළඳපල විශ්ලේෂණ" : lang === "ta" ? "சந்தை பகுப்பாய்வு" : "Market Analytics"}
        </button>
      </div>

      <div className="main-grid2">
        <div className={`left-col2 ${dashTab === "signals" ? "mobile-visible" : "mobile-hidden"}`}>
          <BetSignalHeroCard
            prediction={prediction}
            stats={stats}
            roundsCount={rounds.length}
            heroRef={heroRef}
            lang={lang}
            t={t}
          />
          <AIPredictionPanel
            prediction={prediction}
            stats={stats}
            isPredicting={isPredicting}
            predStatus={predStatus}
            timeData={timeData}
            getTargetStats={getTargetStats}
            lang={lang}
            t={t}
          />
          <TargetHitRatesTable rounds={rounds} stats={stats} t={t} />
        </div>

        <div className={`right-col2 ${dashTab === "stats" ? "mobile-visible" : "mobile-hidden"}`}>
          <CrashHistoryChart
            displayedRounds={displayedRounds}
            chartType={chartType}
            setChartType={setChartType}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            chartData={chartData}
            lang={lang}
            t={t}
            showFilters={false}
          />

          <div className="glass-card">
            <div className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Zap size={14} color="#a78bfa" />{" "}
              {lang === "si" ? "AI දත්ත විකාශය" : lang === "ta" ? "AI தரவு ஊட்டம்" : "AI Data Stream"}
            </div>
            <div className="ai-stream-grid">
              <div style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, textTransform: "uppercase", color: "#888", marginBottom: 8, letterSpacing: 1 }}>
                  <Activity size={12} color="#00e5a0" />{" "}
                  {lang === "si" ? "සජීවී එන්ජින් තත්ත්වය" : lang === "ta" ? "நேரடி இயந்திர நிலை" : "Live Engine State"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#aaa" }}>{t.trendTitle}</span>
                    <strong style={{ color: stats?.trend === "rising" ? "#00e5a0" : stats?.trend === "falling" ? "#ff3366" : "#fff" }}>
                      {stats?.trend === "rising" ? t.trendRising.toUpperCase() : stats?.trend === "falling" ? t.trendFalling.toUpperCase() : t.trendFlat.toUpperCase()}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#aaa" }}>{lang === "si" ? "අස්ථාවරතාවය" : lang === "ta" ? "ஏற்ற இறக்கம்" : "Volatility"}</span>
                    <strong style={{ color: "#ffd000" }}>{stats?.volatility?.toUpperCase() || "NORMAL"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 8 }}>
                    <span style={{ color: "#aaa" }}>{lang === "si" ? "අවදානම් ලකුණු" : lang === "ta" ? "அபாய மதிப்பெண்" : "Risk Score"}</span>
                    <strong style={{ color: (stats?.riskScore ?? 0) > 60 ? "#ff3366" : (stats?.riskScore ?? 0) < 40 ? "#00e5a0" : "#ffd000", fontSize: 14 }}>
                      {stats?.riskScore ?? 0}/100
                    </strong>
                  </div>
                </div>
              </div>

              {stats?.sequenceMatch ? (
                <div style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, textTransform: "uppercase", color: "#888", marginBottom: 8, letterSpacing: 1 }}>
                    <Layers size={12} color="#00d4ff" />{" "}
                    {lang === "si" ? "අනුක්‍රමික එන්ජිම" : lang === "ta" ? "வரிசை இயந்திரம்" : "Sequence Engine"}
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {stats.sequenceMatch.sequence.map((sq: string, i: number) => (
                      <span
                        key={i}
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 9,
                          background:
                            sq === "INSTANT" ? "rgba(255,51,102,0.15)" :
                            sq === "LOW" ? "rgba(255,208,0,0.15)" :
                            sq === "MED" ? "rgba(0,229,160,0.15)" : "rgba(167,139,250,0.15)",
                          color:
                            sq === "INSTANT" ? "#ff3366" :
                            sq === "LOW" ? "#ffd000" :
                            sq === "MED" ? "#00e5a0" : "#a78bfa",
                          fontWeight: "bold",
                        }}
                      >
                        {sq}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", display: "flex", flexDirection: "column", gap: 6, borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {lang === "si" ? "ක්ෂණික අවදානම" : lang === "ta" ? "உடனடி ஆபத்து" : "Instant Risk"}{" "}
                      <strong style={{ color: stats.sequenceMatch.pInstantNext > 20 ? "#ff3366" : "#fff" }}>{stats.sequenceMatch.pInstantNext}%</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {lang === "si" ? "ආරක්ෂිත පහර" : lang === "ta" ? "பாதுகாப்பான வெற்றி" : "Safe Hit"}{" "}
                      <strong style={{ color: "#00e5a0" }}>{stats.sequenceMatch.pSafeNext}%</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 12, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.08)", color: "#666", fontSize: 11, textAlign: "center" }}>
                  {lang === "si" ? "අනුක්‍රමය ජනනය වෙමින්..." : lang === "ta" ? "வரிசை உருவாகிறது..." : "Sequence generating..."}
                </div>
              )}
            </div>
          </div>

          <MiniLiveFeedPanel rounds={rounds} t={t} />
        </div>
      </div>
    </>
  );
}
