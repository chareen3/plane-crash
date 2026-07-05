"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { computeStats, type CrashStats } from "../lib/stats";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { realtime: { params: { eventsPerSecond: 20 } } }
);

type Round = { id?: string; round_number: number; crash_point: number; created_at: string; _optimistic?: boolean };
type Prediction = {
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  summary: string;
  predicted_multiplier?: number;
  long_targets?: { x5: number; x10: number; x20: number };
  stats?: CrashStats;
};
type WinRate = { total: number; correct: number; winRate: number; byRisk: Record<string, { total: number; correct: number }> };

const RISK_COLOR: Record<string, string> = { LOW: 'green', MEDIUM: 'yellow', HIGH: 'red' };
const RISK_EMOJI: Record<string, string> = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🔴' };

function classifyRisk(v: number) { return v < 2 ? 'red' : v < 5 ? 'yellow' : 'green'; }
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export default function Dashboard() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [lastCrash, setLastCrash] = useState<Round | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [winRate, setWinRate] = useState<WinRate>({ total: 0, correct: 0, winRate: 0, byRisk: {} });
  const [localStats, setLocalStats] = useState<CrashStats | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predStatus, setPredStatus] = useState<'idle' | 'predicting' | 'done'>('idle');
  const [betAmount, setBetAmount] = useState<string>('');
  const [ticker, setTicker] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const predRef = useRef<HTMLDivElement>(null);

  const fetchWinRate = useCallback(async () => {
    const res = await fetch('/api/grade');
    if (res.ok) { const d = await res.json(); setWinRate(d); }
  }, []);

  const runPrediction = useCallback(async () => {
    setPredStatus('predicting');
    setIsPredicting(true);
    try {
      const res = await fetch('/api/predict');
      if (res.ok) {
        const d = await res.json();
        if (d.risk) { setPrediction(d); setPredStatus('done'); }
        else setPredStatus('idle');
      }
    } catch { setPredStatus('idle'); }
    finally { setIsPredicting(false); }
  }, []);



  useEffect(() => {
    // Initial data load
    supabase.from('crash_rounds').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => {
        if (data?.length) {
          setRounds(data);
          setLastCrash(data[0]);
          setLocalStats(computeStats(data.map(r => Number(r.crash_point))));
        }
      });

    fetchWinRate();
    runPrediction();

    // Zero-latency bridge from Extension content script
    const handleMessage = (evt: MessageEvent) => {
      if (evt.data?.type === 'EXTENSION_CRASH_LIVE') {
        const { round, prediction, stats } = evt.data;
        
        if (round) {
          const roundObj: Round = { ...round, _optimistic: true };
          setLastCrash(roundObj);
          setRounds(prev => {
            if (prev.some(r => r.round_number === roundObj.round_number)) return prev;
            const updated = [roundObj, ...prev].slice(0, 50);
            if (!stats) {
              setLocalStats(computeStats(updated.map(r => Number(r.crash_point))));
            }
            return updated;
          });
        }

        if (stats) {
          setLocalStats(stats);
        }

        if (prediction) {
          setPrediction(prediction);
          setPredStatus('done');
        }

        heroRef.current?.classList.remove('flash');
        void heroRef.current?.offsetWidth;
        heroRef.current?.classList.add('flash');

        fetchWinRate(); // Refresh the trust strip stats
      } else if (evt.data?.type === 'EXTENSION_BET_CHANGE') {
        setBetAmount(evt.data.amount);
      }
    };
    window.addEventListener('message', handleMessage);

    // Supabase Realtime backup
    const channel = supabase.channel('crash-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_rounds' }, (payload) => {
        const round = payload.new as Round;
        setRounds(prev => {
          const exists = prev.findIndex(r => r.round_number === round.round_number);
          if (exists !== -1) { const u = [...prev]; u[exists] = round; return u; }
          const updated = [round, ...prev].slice(0, 50);
          setLocalStats(computeStats(updated.map(r => Number(r.crash_point))));
          return updated;
        });
        setLastCrash(round);
      }).subscribe();

    const tick = setInterval(() => setTicker(t => t + 1), 5000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('message', handleMessage);
      clearInterval(tick);
    };
  }, []);

  const stats = localStats;
  const avg = stats ? stats.mean.toFixed(2) : '—';
  const median = stats ? stats.median.toFixed(2) : '—';
  const highest = rounds.length > 0 ? Math.max(...rounds.map(r => Number(r.crash_point))).toFixed(2) : '—';

  return (
    <div className="app">

      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-icon">✈</span>
          <div>
            <h1 className="topbar-title">Crash Tracker</h1>
            <span className="topbar-sub">AI-Powered · Real-time · Supabase</span>
          </div>
        </div>
        <div className="topbar-right">
          {betAmount && (
            <span className="bet-badge">💰 Bet Amount: {betAmount} USD</span>
          )}
          <span className="live-badge"><span className="live-dot" />LIVE</span>
          <button className="ai-btn" onClick={runPrediction} disabled={isPredicting || rounds.length === 0}>
            {isPredicting ? '⏳ Analyzing...' : '🧠 Refresh AI'}
          </button>
        </div>
      </header>

      {/* ── TRUST STRIP ── */}
      <div className="trust-strip">
        <div className="trust-item">
          <span className="trust-icon">🎯</span>
          <div>
            <div className="trust-label">Total Predictions</div>
            <div className="trust-value">{winRate.total}</div>
          </div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <span className="trust-icon">✅</span>
          <div>
            <div className="trust-label">Correct Calls</div>
            <div className="trust-value green">{winRate.correct}</div>
          </div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <span className="trust-icon">📊</span>
          <div>
            <div className="trust-label">Platform Accuracy</div>
            <div className={`trust-value ${winRate.winRate >= 60 ? 'green' : winRate.winRate >= 40 ? 'yellow' : 'red'}`}>
              {winRate.winRate}%
            </div>
          </div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <span className="trust-icon">📈</span>
          <div>
            <div className="trust-label">Rounds Tracked</div>
            <div className="trust-value">{rounds.length}</div>
          </div>
        </div>
        {winRate.byRisk && Object.keys(winRate.byRisk).length > 0 && (<>
          <div className="trust-divider" />
          {(['LOW', 'MEDIUM', 'HIGH'] as const).map(r => {
            const d = winRate.byRisk[r];
            if (!d || d.total === 0) return null;
            const acc = Math.round((d.correct / d.total) * 100);
            return (
              <div key={r} className="trust-item">
                <span className="trust-icon">{RISK_EMOJI[r]}</span>
                <div>
                  <div className="trust-label">{r} accuracy</div>
                  <div className={`trust-value ${RISK_COLOR[r]}`}>{acc}%</div>
                </div>
              </div>
            );
          })}
        </>)}
      </div>

      {/* ── MAIN GRID ── */}
      <div className="main-grid">

        {/* LEFT COLUMN */}
        <div className="left-col">

          {/* Prediction Panel */}
          <div className={`pred-panel ${prediction ? `pred-${RISK_COLOR[prediction.risk]}` : ''}`} ref={predRef}>
            <div className="pred-header">
              <span className="pred-title">⚡ NEXT ROUND — CASHOUT TARGETS</span>
              <span className={`pred-status ${predStatus}`}>
                {predStatus === 'predicting' ? '🔄 Analyzing...' : predStatus === 'done' ? '✅ Ready' : '⏸ Waiting'}
              </span>
            </div>

            {prediction && stats ? (
              <>
                {/* Big cashout recommendation */}
                <div className="cashout-hero">
                  <div className="cashout-main">
                    <div className="cashout-label">🎯 Recommended Cashout</div>
                    <div className={`cashout-value color-${RISK_COLOR[prediction.risk]}`}>
                      {stats.suggestedCashout.toFixed(2)}x
                    </div>
                    <div className="cashout-sub">
                      {stats.suggestedCashoutWinRate}% of past rounds reached this — {prediction.risk} RISK
                    </div>
                    
                    {/* RECOMMENDED STAKE */}
                    <div className="stake-recommendation">
                      💰 Recommended Bet: <span className="stake-val">{
                        prediction.risk === 'HIGH' ? '❌ SKIP (0x)' :
                        prediction.risk === 'MEDIUM' ? '💵 1.0x Base Stake' :
                        '🔥 2.0x Base Stake (Calm)'
                      }</span>
                    </div>
                  </div>
                </div>

                {/* Three target options */}
                <div className="cashout-targets">
                  <div className="cashout-target safe">
                    <div className="ct-label">🛡 Conservative</div>
                    <div className="ct-mult">{stats.conservativeCashout.toFixed(2)}x</div>
                    <div className="ct-pct">{stats.p90SafeCashout >= stats.conservativeCashout ? '~90%' : '~85%'} win rate</div>
                  </div>
                  <div className="cashout-target balanced">
                    <div className="ct-label">⚖️ Balanced</div>
                    <div className="ct-mult">{stats.p70SafeCashout.toFixed(2)}x</div>
                    <div className="ct-pct">~70% win rate</div>
                  </div>
                  <div className="cashout-target risk">
                    <div className="ct-label">🚀 Aggressive</div>
                    <div className="ct-mult">{stats.aggressiveCashout.toFixed(2)}x</div>
                    <div className="ct-pct">~50% win rate</div>
                  </div>
                </div>

                {/* AI summary */}
                <div className="pred-summary">{prediction.summary}</div>

                {/* AI Expected Ceiling & Long Targets Forecast */}
                {prediction.predicted_multiplier !== undefined && (
                  <div className="ai-ceiling-forecast">
                    <span className="ceiling-label">🔮 AI EXPECTED CEILING</span>
                    <span className="ceiling-val">{Number(prediction.predicted_multiplier).toFixed(2)}x</span>
                  </div>
                )}

                {prediction.long_targets && (
                  <div className="ai-long-forecast">
                    <div className="long-targets-row">
                      <div className="long-target-col">
                        <span className="lt-val">{prediction.long_targets.x5}%</span>
                        <span className="lt-lbl">5x Target</span>
                      </div>
                      <div className="long-target-col">
                        <span className="lt-val">{prediction.long_targets.x10}%</span>
                        <span className="lt-lbl">10x Target</span>
                      </div>
                      <div className="long-target-col">
                        <span className="lt-val">{prediction.long_targets.x20}%</span>
                        <span className="lt-lbl">20x Target</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Probability bars */}
                <div className="pred-bars">
                  <div className="pred-bar-row">
                    <span className="pred-bar-label">Under 2x</span>
                    <div className="pred-bar-track">
                      <div className="pred-bar-fill red" style={{ width: `${stats.pUnder2}%` }} />
                    </div>
                    <span className="pred-bar-pct red">{stats.pUnder2}%</span>
                  </div>
                  <div className="pred-bar-row">
                    <span className="pred-bar-label">2x – 5x</span>
                    <div className="pred-bar-track">
                      <div className="pred-bar-fill yellow" style={{ width: `${stats.p2to5}%` }} />
                    </div>
                    <span className="pred-bar-pct yellow">{stats.p2to5}%</span>
                  </div>
                  <div className="pred-bar-row">
                    <span className="pred-bar-label">Over 5x</span>
                    <div className="pred-bar-track">
                      <div className="pred-bar-fill green" style={{ width: `${stats.pOver5}%` }} />
                    </div>
                    <span className="pred-bar-pct green">{stats.pOver5}%</span>
                  </div>
                </div>

                <div className="pred-meta">
                  <span>EMA: {stats.ema}x</span>
                  <span>Streak: {stats.currentLowStreak > 0 ? `🔴 ${stats.currentLowStreak} low` : `🟢 ${stats.currentHighStreak} high`}</span>
                  <span>Trend: {stats.trend === 'rising' ? '↑ Rising' : stats.trend === 'falling' ? '↓ Falling' : '→ Flat'}</span>
                  <span>Volatility: {stats.volatility}</span>
                </div>
              </>
            ) : (
              <div className="pred-empty">
                {isPredicting ? '⏳ Running statistical analysis on last 50 rounds...' : '📡 Start capture to enable predictions'}
              </div>
            )}
          </div>


          {/* Hero */}
          <div className="hero" ref={heroRef}>
            <div className="hero-label">LAST CRASH</div>
            <div className={`hero-value color-${classifyRisk(lastCrash?.crash_point ?? 0)}`}>
              {lastCrash ? `${Number(lastCrash.crash_point).toFixed(2)}x` : '—'}
            </div>
            {lastCrash && <div className="hero-time">{timeAgo(lastCrash.created_at)}</div>}
          </div>

          {/* Stats Strip */}
          <div className="stat-row">
            {[
              { icon: '📊', label: 'Avg', value: `${avg}x` },
              { icon: '📉', label: 'Median', value: `${median}x` },
              { icon: '🚀', label: 'Highest', value: `${highest}x` },
              { icon: '⚠️', label: 'Under 2x', value: `${stats?.pUnder2 ?? 0}%`, cls: 'red' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${s.cls ?? ''}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN — Chart + Feed */}
        <div className="right-col">

          {/* Mini Chart */}
          <div className="panel">
            <div className="panel-title">📈 Crash History</div>
            <div className="chart-wrap">
              {rounds.length > 1 && (() => {
                const pts = [...rounds].reverse().slice(0, 40);
                const max = Math.max(...pts.map(r => r.crash_point), 5);
                const W = 400; const H = 140; const PAD = 10;
                const xStep = (W - PAD * 2) / (pts.length - 1);
                const points = pts.map((r, i) => {
                  const x = PAD + i * xStep;
                  const y = H - PAD - ((r.crash_point / max) * (H - PAD * 2));
                  return { x, y, v: r.crash_point };
                });
                const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
                return (
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6c63ff" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6c63ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={`${points[0].x},${H} ${polyline} ${points[points.length - 1].x},${H}`}
                      fill="url(#lineGrad)" />
                    <polyline points={polyline} fill="none" stroke="#6c63ff" strokeWidth="2" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3"
                        fill={p.v < 2 ? '#ff4d6d' : p.v < 5 ? '#ffc84a' : '#00e5a0'} />
                    ))}
                  </svg>
                );
              })()}
            </div>
            <div className="chart-legend">
              <span className="dot green" /> ≥5x
              <span className="dot yellow" /> 2–5x
              <span className="dot red" /> &lt;2x
            </div>
          </div>

          {/* Target Hit Table */}
          <div className="panel">
            <div className="panel-title">🎯 Target Hit Rates (Based on {rounds.length} rounds)</div>
            {stats && stats.count > 0 ? (
              <div className="target-table">
                <div className="target-table-head">
                  <span>Target</span>
                  <span>Hit Rate</span>
                  <span>Recent 20</span>
                  <span>Last Hit</span>
                  <span>Signal</span>
                </div>
                {stats.targets.map(t => (
                  <div key={t.target} className={`target-row signal-${t.signal.toLowerCase()}`}>
                    <span className="target-mult">{t.target.toFixed(1)}x</span>
                    <div className="target-bar-wrap">
                      <div className="target-bar-bg">
                        <div className="target-bar-fill" style={{ width: `${t.hitRate}%` }} />
                      </div>
                      <span className="target-pct">{t.hitRate}%</span>
                    </div>
                    <span className={`target-recent ${t.recentHitRate >= t.hitRate ? 'up' : 'down'}`}>
                      {t.recentHitRate}%
                      {t.recentHitRate >= t.hitRate ? ' ↑' : ' ↓'}
                    </span>
                    <span className="target-last">
                      {t.lastHitAgo === 0 ? 'Now' : t.lastHitAgo === -1 ? 'Never' : `${t.lastHitAgo}r ago`}
                    </span>
                    <span className={`target-signal ${t.signal.toLowerCase()}`}>{t.signal}</span>
                  </div>
                ))}
                <div className="target-footer">
                  * Based on your captured historical data. Not a prediction of future outcomes.
                </div>
              </div>
            ) : (
              <div className="feed-empty">Capture rounds to see target analysis</div>
            )}
          </div>

          {/* Live Feed */}
          <div className="panel feed-panel">
            <div className="panel-title">⚡ Live Feed</div>
            <div className="feed-list">
              {rounds.length === 0
                ? <div className="feed-empty">Waiting for crash data...</div>
                : rounds.slice(0, 40).map((round, i) => (
                  <div key={round.id ?? `${round.round_number}-${i}`}
                    className={`feed-row ${round._optimistic ? 'optimistic' : ''}`}>
                    <div className="feed-meta">
                      <span className="feed-num">#{round.round_number}</span>
                      <span className="feed-time">{timeAgo(round.created_at)}</span>
                    </div>
                    <span className={`feed-mult color-${classifyRisk(round.crash_point)}`}>
                      {Number(round.crash_point).toFixed(2)}x
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
