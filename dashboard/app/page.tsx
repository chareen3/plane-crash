"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { params: { eventsPerSecond: 20 } }, // increase realtime rate
});

type Round = {
  id?: string;
  round_number: number;
  crash_point: number;
  created_at: string;
  _optimistic?: boolean; // instantly shown before DB confirms
};

function classifyRisk(val: number) {
  if (val < 1.5) return "red";
  if (val < 3.0) return "yellow";
  return "green";
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export default function Dashboard() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [lastCrash, setLastCrash] = useState<Round | null>(null);
  const [prediction, setPrediction] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ticker, setTicker] = useState(0); // forces time labels to refresh
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ── 1. Initial fetch from Supabase ──
    supabase
      .from("crash_rounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRounds(data);
          setLastCrash(data[0]);
        }
      });

    // ── 2. BroadcastChannel — INSTANT update from extension ──
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("crash_live");
      bc.onmessage = (evt) => {
        if (evt.data?.type === "NEW_CRASH") {
          const round: Round = { ...evt.data.round, _optimistic: true };
          setLastCrash(round);
          setRounds((prev) => [round, ...prev].slice(0, 50));
          // Flash hero
          heroRef.current?.classList.remove("flash");
          void heroRef.current?.offsetWidth; // reflow
          heroRef.current?.classList.add("flash");
        }
      };
    } catch (_) {}

    // ── 3. Supabase Realtime — backup / confirmation ──
    const channel = supabase
      .channel("crash-realtime", { config: { broadcast: { self: true } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crash_rounds" },
        (payload) => {
          const round = payload.new as Round;
          setRounds((prev) => {
            // Replace optimistic entry if same round_number, otherwise prepend
            const exists = prev.findIndex((r) => r.round_number === round.round_number);
            if (exists !== -1) {
              const updated = [...prev];
              updated[exists] = round; // upgrade optimistic → confirmed
              return updated;
            }
            return [round, ...prev].slice(0, 50);
          });
          setLastCrash(round);
        }
      )
      .subscribe();

    // ── 4. Refresh time labels every 5s ──
    const tickTimer = setInterval(() => setTicker((t) => t + 1), 5000);

    return () => {
      bc?.close();
      supabase.removeChannel(channel);
      clearInterval(tickTimer);
    };
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/predict");
      const data = await res.json();
      setPrediction(data.prediction || "Error generating prediction.");
    } catch {
      setPrediction("Failed to connect to AI service.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const avg = rounds.length > 0
    ? (rounds.reduce((a, r) => a + Number(r.crash_point), 0) / rounds.length).toFixed(2)
    : "—";

  const highest = rounds.length > 0
    ? Math.max(...rounds.map((r) => Number(r.crash_point))).toFixed(2)
    : "—";

  const under2 = rounds.length > 0
    ? Math.round((rounds.filter((r) => r.crash_point < 2).length / rounds.length) * 100)
    : 0;

  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-icon">✈</span>
          <div>
            <h1 className="topbar-title">Crash Tracker</h1>
            <span className="topbar-sub">Live · Supabase · AI</span>
          </div>
        </div>
        <div className="topbar-right">
          <span className="live-badge">
            <span className="live-dot" />
            LIVE
          </span>
          <button className="ai-btn" onClick={handleAnalyze} disabled={isAnalyzing || rounds.length === 0}>
            {isAnalyzing ? "⏳ Analyzing..." : "🧠 AI Analysis"}
          </button>
        </div>
      </header>

      {/* ── HERO — last crash ── */}
      <div className="hero" ref={heroRef}>
        <div className="hero-label">LAST CRASH</div>
        <div className={`hero-value color-${classifyRisk(lastCrash?.crash_point ?? 0)}`}>
          {lastCrash ? `${Number(lastCrash.crash_point).toFixed(2)}x` : "—"}
        </div>
        {lastCrash && (
          <div className="hero-time">{timeAgo(lastCrash.created_at)}</div>
        )}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-label">Avg (last {rounds.length})</div>
          <div className="stat-value">{avg}x</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-label">Highest</div>
          <div className="stat-value green">{highest}x</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-label">Under 2x</div>
          <div className="stat-value red">{under2}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-label">Rounds Saved</div>
          <div className="stat-value">{rounds.length}</div>
        </div>
      </div>

      {/* ── AI PREDICTION ── */}
      {prediction && (
        <div className="ai-card">
          <div className="ai-card-title">🧠 AI Risk Analysis</div>
          <div className="ai-body">{prediction}</div>
          <div className="ai-disclaimer">
            ⚠ AI cannot predict crash game outcomes. This is statistical pattern analysis only.
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="content-grid">
        {/* Chart */}
        <div className="panel">
          <div className="panel-title">📈 Crash History</div>
          <div className="chart-wrap">
            {rounds.length > 0 && (
              <svg viewBox={`0 0 ${Math.min(rounds.length, 30) * 20} 120`} preserveAspectRatio="none" className="chart-svg">
                {(() => {
                  const pts = [...rounds].reverse().slice(0, 30);
                  const max = Math.max(...pts.map((r) => r.crash_point), 5);
                  const w = pts.length * 20;
                  const points = pts.map((r, i) => {
                    const x = i * 20 + 10;
                    const y = 110 - (r.crash_point / max) * 100;
                    return `${x},${y}`;
                  }).join(" ");
                  return (
                    <>
                      <polyline points={points} fill="none" stroke="#6c63ff" strokeWidth="2.5" strokeLinejoin="round" />
                      {pts.map((r, i) => {
                        const x = i * 20 + 10;
                        const y = 110 - (r.crash_point / max) * 100;
                        const c = classifyRisk(r.crash_point);
                        return (
                          <circle key={i} cx={x} cy={y} r="4"
                            fill={c === "green" ? "#00e5a0" : c === "yellow" ? "#ffc84a" : "#ff4d6d"}
                          />
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            )}
          </div>
          <div className="chart-legend">
            <span className="dot green" /> ≥3x
            <span className="dot yellow" /> 1.5–3x
            <span className="dot red" /> &lt;1.5x
          </div>
        </div>

        {/* Live Feed */}
        <div className="panel feed-panel">
          <div className="panel-title">⚡ Live Feed</div>
          <div className="feed-list">
            {rounds.length === 0 ? (
              <div className="feed-empty">Waiting for crash data...</div>
            ) : (
              rounds.slice(0, 30).map((round, i) => (
                <div key={round.id ?? `${round.round_number}-${i}`}
                  className={`feed-row ${round._optimistic ? "optimistic" : ""}`}>
                  <div className="feed-meta">
                    <span className="feed-num">#{round.round_number}</span>
                    <span className="feed-time">{timeAgo(round.created_at)}</span>
                  </div>
                  <span className={`feed-mult color-${classifyRisk(round.crash_point)}`}>
                    {Number(round.crash_point).toFixed(2)}x
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
