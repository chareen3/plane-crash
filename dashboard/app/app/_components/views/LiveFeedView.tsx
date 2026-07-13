"use client";

import { Activity, Bot } from "lucide-react";
import { useDashboard } from "../../_context/DashboardContext";
import { LiveFeedTable } from "../CrashHistoryTable";

export function LiveFeedView() {
  const d = useDashboard();
  const { rounds, prediction, latency, t, formatStr } = d;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: 1 }}>
            {t.realTimeFeed}
          </h2>
          <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6 }}>{t.liveFeedDesc}</p>
        </div>
        <div style={{ background: "rgba(0,229,160,0.1)", border: "1px solid rgba(0,229,160,0.2)", padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div className="live-dot" style={{ background: "#00e5a0", boxShadow: "0 0 6px #00e5a0" }} />
          <span style={{ fontSize: 12, color: "#00e5a0", fontWeight: "bold" }}>{t.websocketActive}</span>
        </div>
      </div>

      <div className="live-feed-grid">
        <LiveFeedTable rounds={rounds} prediction={prediction} latency={latency} t={t} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={14} color="#00ffd5" /> {t.systemStatus}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#888" }}>{t.pingLatency}</span>
                <strong style={{ fontSize: 14, color: "#00e5a0", fontFamily: "monospace" }}>{latency}ms</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#888" }}>{t.totalHandled}</span>
                <strong style={{ fontSize: 14, color: "#a78bfa", fontFamily: "monospace" }}>{rounds.length}</strong>
              </div>
            </div>
          </div>
          <div className="glass-card" style={{ padding: 20, background: "linear-gradient(145deg, rgba(167,139,250,0.05), transparent)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Bot size={14} /> {t.aiProcessingEngine}
            </div>
            <p style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
              {formatStr(t.aiProcessingEngineDesc, { delay: latency + 12 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
