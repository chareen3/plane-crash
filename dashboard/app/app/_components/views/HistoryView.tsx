"use client";

import { useDashboard } from "../../_context/DashboardContext";
import { CrashHistoryGrid } from "../CrashHistoryTable";

export function HistoryView() {
  const d = useDashboard();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: 1 }}>
          {d.t.historyTitle}
        </h2>
        <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6 }}>{d.t.historyDesc}</p>
      </div>

      <CrashHistoryGrid
        rounds={d.rounds}
        processedRounds={d.processedRounds}
        displayedRounds={d.displayedRounds}
        stats={d.stats}
        avg={d.avg}
        highest={d.highest}
        displayCount={d.displayCount}
        setDisplayCount={d.setDisplayCount}
        showRoundModal={d.showRoundModal}
        setShowRoundModal={d.setShowRoundModal}
        selectedRound={d.selectedRound}
        setSelectedRound={d.setSelectedRound}
        chartType={d.chartType}
        setChartType={d.setChartType}
        timeRange={d.timeRange}
        setTimeRange={d.setTimeRange}
        chartData={d.chartData}
        lang={d.lang}
        t={d.t}
      />
    </div>
  );
}
