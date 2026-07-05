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
  should_bet?: boolean;
  skip_reason?: string | null;
  strategy?: string;
  cashout_target?: number;
  strategy_reason?: string;
  recommended_bet_units?: number;
  ai_model_used?: string;
  stats?: CrashStats;
};
type WinRate = { total: number; correct: number; winRate: number; byRisk: Record<string, { total: number; correct: number }> };

const RISK_COLOR: Record<string, string> = { LOW: 'green', MEDIUM: 'yellow', HIGH: 'red' };
const RISK_EMOJI: Record<string, string> = { LOW: '\uD83D\uDFE2', MEDIUM: '\uD83D\uDFE1', HIGH: '\uD83D\uDD34' };
const STRATEGY_META: Record<string, { color: string; icon: string; label: string }> = {
  SKIP: { color: '#ff4d6d', icon: '\uD83D\uDEAB', label: 'SKIP THIS ROUND' },
  CONSERVATIVE: { color: '#00e5a0', icon: '\uD83D\uDEE1\uFE0F', label: 'CONSERVATIVE BET' },
  BALANCED: { color: '#ffc84a', icon: '\u2696\uFE0F', label: 'BALANCED BET' },
  AGGRESSIVE: { color: '#a78bfa', icon: '\uD83D\uDE80', label: 'AGGRESSIVE BET' },
};

function classifyRisk(v: number) { return v < 2 ? 'red' : v < 5 ? 'yellow' : 'green'; }
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function LingerMultipliers({ rounds }: { rounds: Round[] }) {
  const top = [...rounds]
    .slice(0, 30)
    .filter(r => r.crash_point >= 5)
    .sort((a, b) => b.crash_point - a.crash_point)
    .slice(0, 6);
  if (top.length === 0) return null;
  return (
    <div className="linger-row">
      <span className="linger-label">\uD83D\uDD25 Big Hits (last 30)</span>
      <div className="linger-chips">
        {top.map((r, i) => (
          <span key={i} className={`linger-chip ${r.crash_point >= 10 ? 'mega' : ''}`}>
            {Number(r.crash_point).toFixed(2)}x
          </span>
        ))}
      </div>
    </div>
  );
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
  const heroRef = useRef<HTMLDivElement>(null);

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

    const handleMessage = (evt: MessageEvent) => {
      if (evt.data?.type === 'EXTENSION_CRASH_LIVE') {
        const { round, prediction, stats } = evt.data;
        if (round) {
          const roundObj: Round = { ...round, _optimistic: true };
          setLastCrash(roundObj);
          setRounds(prev => {
            if (prev.some(r => r.round_number === roundObj.round_number)) return prev;
            const updated = [roundObj, ...prev].slice(0, 50);
            if (!stats) setLocalStats(computeStats(updated.map(r => Number(r.crash_point))));
            return updated;
          });
        }
        if (stats) setLocalStats(stats);
        if (prediction) { setPrediction(prediction); setPredStatus('done'); }
        heroRef.current?.classList.remove('flash');
        void heroRef.current?.offsetWidth;
        heroRef.current?.classList.add('flash');
        fetchWinRate();
      } else if (evt.data?.type === 'EXTENSION_BET_CHANGE') {
        setBetAmount(evt.data.amount);
      }
    };
    window.addEventListener('message', handleMessage);

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
        
        // Trigger prediction & winrate refresh to keep 100% synced across devices
        fetchWinRate();
        runPrediction();
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const stats = localStats;
  const avg = stats ? stats.mean.toFixed(2) : '\u2014';
  const median = stats ? stats.median.toFixed(2) : '\u2014';
  const highest = rounds.length > 0 ? Math.max(...rounds.map(r => Number(r.crash_point))).toFixed(2) : '\u2014';
  const stratMeta = prediction?.strategy ? STRATEGY_META[prediction.strategy] ?? STRATEGY_META['SKIP'] : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-icon">\u2708</span>
          <div>
            <h1 className="topbar-title">Crash Tracker</h1>
            <span className="topbar-sub">AI-Powered \u00b7 Real-time \u00b7 Supabase</span>
          </div>
        </div>
        <div className="topbar-right">
          {betAmount && <span className="bet-badge">\uD83D\uDCB0 Bet: {betAmount} USD</span>}
          <span className="live-badge"><span className="live-dot" />LIVE</span>
          <button className="ai-btn" onClick={async () => {
            if (confirm('Are you sure you want to clear all data?')) {
              await fetch('/api/reset', { method: 'POST' });
              window.location.reload();
            }
          }}>
            🗑️ Reset
          </button>
          <button className="ai-btn" onClick={runPrediction} disabled={isPredicting || rounds.length === 0}>
            {isPredicting ? 'Analyzing...' : 'Refresh AI'}
          </button>
        </div>
      </header>

      <div className="trust-strip">
        <div className="trust-item">
          <span className="trust-icon">🎯</span>
          <div><div className="trust-label">24h Predictions</div><div className="trust-value">{winRate.total}</div></div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <span className="trust-icon">✅</span>
          <div><div className="trust-label">Correct Calls</div><div className="trust-value green">{winRate.correct}</div></div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <span className="trust-icon">📊</span>
          <div>
            <div className="trust-label">24h Accuracy</div>
            <div className={`trust-value ${winRate.winRate >= 60 ? 'green' : winRate.winRate >= 40 ? 'yellow' : 'red'}`}>
              {winRate.winRate}%
            </div>
          </div>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <span className="trust-icon">📈</span>
          <div><div className="trust-label">Rounds Tracked</div><div className="trust-value">{rounds.length}</div></div>
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

      {prediction && stratMeta && (
        <div className="bet-signal-banner" style={{ background: stratMeta.color + '18', borderColor: stratMeta.color }}>
          <div className="bsb-left">
            <span className="bsb-icon">{stratMeta.icon}</span>
            <div>
              <div className="bsb-action" style={{ color: stratMeta.color }}>{stratMeta.label}</div>
              <div className="bsb-reason">{prediction.skip_reason || prediction.strategy_reason || 'Highly confident statistical target.'}</div>
            </div>
          </div>
          {prediction.should_bet && prediction.cashout_target ? (
            <div className="bsb-right" style={{ display: 'flex', gap: '20px' }}>
              <div>
                <div className="bsb-cashout-label">TARGET</div>
                <div className="bsb-cashout-val" style={{ color: stratMeta.color }}>
                  {Number(prediction.cashout_target).toFixed(2)}x
                </div>
              </div>
              {prediction.recommended_bet_units !== undefined && (
                <div>
                  <div className="bsb-cashout-label">REC. BET</div>
                  <div className="bsb-cashout-val" style={{ color: prediction.recommended_bet_units > 0 ? '#00e5a0' : '#ff4d6d' }}>
                    {prediction.recommended_bet_units} Unit
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      <LingerMultipliers rounds={rounds} />

      <div className="main-grid">
        <div className="left-col">
          <div className={`pred-panel ${prediction ? `pred-${RISK_COLOR[prediction.risk]}` : ''}`}>
            <div className="pred-header">
              <span className="pred-title">NEXT ROUND — AI + STATISTICAL ANALYSIS</span>
              <span className={`pred-status ${predStatus}`}>
                {predStatus === 'predicting' ? '🔄 Analyzing...' : predStatus === 'done' ? 'Ready' : 'Waiting'}
              </span>
              {prediction?.ai_model_used && predStatus === 'done' && (
                <span style={{ fontSize: '10px', color: prediction.ai_model_used === 'stats-only' ? '#888' : '#a78bfa', fontWeight: '600', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {prediction.ai_model_used === 'stats-only' ? '📊 Stats Engine' : '🤖 AI + Stats'}
                </span>
              )}
            </div>
            {prediction && stats ? (
              <>
                <div className="risk-conf-row">
                  <div className={`risk-badge risk-${RISK_COLOR[prediction.risk]}`}>
                    {RISK_EMOJI[prediction.risk]} {prediction.risk} RISK
                  </div>
                  <div className="conf-bar-wrap">
                    <div className="conf-bar-track">
                      <div className="conf-bar-fill" style={{ width: `${prediction.confidence}%` }} />
                    </div>
                    <span className="conf-label">{prediction.confidence}% confidence</span>
                  </div>
                </div>
                <div className="pred-summary">{prediction.summary}</div>
                <div className="cashout-targets">
                  <div className="cashout-target safe">
                    <div className="ct-label">\uD83D\uDEE1 Conservative</div>
                    <div className="ct-mult">{stats.conservativeCashout.toFixed(2)}x</div>
                    <div className="ct-pct">~90% hit rate</div>
                  </div>
                  <div className="cashout-target balanced">
                    <div className="ct-label">\u2696\uFE0F Balanced</div>
                    <div className="ct-mult">{stats.p70SafeCashout.toFixed(2)}x</div>
                    <div className="ct-pct">~70% hit rate</div>
                  </div>
                  <div className="cashout-target risk">
                    <div className="ct-label">\uD83D\uDE80 Aggressive</div>
                    <div className="ct-mult">{stats.aggressiveCashout.toFixed(2)}x</div>
                    <div className="ct-pct">~50% hit rate</div>
                  </div>
                </div>
                {stats.p90SafeCashout !== undefined && (
                  <div className="ai-ceiling-forecast" style={{ background: 'rgba(0, 229, 160, 0.15)', borderColor: '#00e5a0', marginTop: '16px' }}>
                    <span className="ceiling-label" style={{ color: '#00e5a0', fontWeight: 'bold' }}>⭐ HIGHLY CONFIDENT NEXT CASHOUT (90% ACCURACY)</span>
                    <span className="ceiling-val" style={{ color: '#00e5a0' }}>{Number(stats.p90SafeCashout).toFixed(2)}x</span>
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
                <div className="pred-bars">
                  {[
                    { label: 'Under 2x', pct: stats.pUnder2, cls: 'red' },
                    { label: '2x \u2013 5x', pct: stats.p2to5, cls: 'yellow' },
                    { label: 'Over 5x', pct: stats.pOver5, cls: 'green' },
                  ].map(b => (
                    <div className="pred-bar-row" key={b.label}>
                      <span className="pred-bar-label">{b.label}</span>
                      <div className="pred-bar-track">
                        <div className={`pred-bar-fill ${b.cls}`} style={{ width: `${b.pct}%` }} />
                      </div>
                      <span className={`pred-bar-pct ${b.cls}`}>{b.pct}%</span>
                    </div>
                  ))}
                </div>
                <div className="pred-meta">
                  <span>EMA: {stats.ema}x</span>
                  <span>Streak: {stats.currentLowStreak > 0 ? `\uD83D\uDD34 ${stats.currentLowStreak} low` : `\uD83D\uDFE2 ${stats.currentHighStreak} high`}</span>
                  <span>Trend: {stats.trend === 'rising' ? '\u2191 Rising' : stats.trend === 'falling' ? '\u2193 Falling' : '\u2192 Flat'}</span>
                  <span>Volatility: {stats.volatility}</span>
                </div>
              </>
            ) : (
              <div className="pred-empty">
                {isPredicting ? '\u23F3 Running AI analysis...' : '\uD83D\uDCE1 Start capture to enable predictions'}
              </div>
            )}
          </div>

          <div className="hero" ref={heroRef}>
            <div className="hero-label">LAST CRASH</div>
            <div className={`hero-value color-${classifyRisk(lastCrash?.crash_point ?? 0)}`}>
              {lastCrash ? `${Number(lastCrash.crash_point).toFixed(2)}x` : '\u2014'}
            </div>
            {lastCrash && <div className="hero-time">{timeAgo(lastCrash.created_at)}</div>}
          </div>

          <div className="stat-row">
            {[
              { icon: '\uD83D\uDCCA', label: 'Avg', value: `${avg}x` },
              { icon: '\uD83D\uDCC9', label: 'Median', value: `${median}x` },
              { icon: '\uD83D\uDE80', label: 'Highest', value: `${highest}x` },
              { icon: '\u26A0\uFE0F', label: 'Under 2x', value: `${stats?.pUnder2 ?? 0}%`, cls: 'red' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${s.cls ?? ''}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="right-col">
          <div className="panel">
            <div className="panel-title">Crash History</div>
            <div className="chart-wrap">
              {rounds.length > 1 && (() => {
                const pts = [...rounds].reverse().slice(0, 40);
                const max = Math.max(...pts.map(r => r.crash_point), 5);
                const W = 400; const H = 140; const PAD = 10;
                const xStep = (W - PAD * 2) / (pts.length - 1);
                const points = pts.map((r, i) => ({
                  x: PAD + i * xStep,
                  y: H - PAD - ((r.crash_point / max) * (H - PAD * 2)),
                  v: r.crash_point,
                }));
                const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
                return (
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6c63ff" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6c63ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={`${points[0].x},${H} ${polyline} ${points[points.length - 1].x},${H}`} fill="url(#lineGrad)" />
                    <polyline points={polyline} fill="none" stroke="#6c63ff" strokeWidth="2" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3"
                        fill={p.v < 2 ? '#ff4d6d' : p.v < 5 ? '#ffc84a' : '#00e5a0'} />
                    ))}
                    {points.filter(p => p.v >= 10).map((p, i) => (
                      <text key={i} x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fill="#a78bfa">\u2605</text>
                    ))}
                  </svg>
                );
              })()}
            </div>
            <div className="chart-legend">
              <span className="dot green" /> \u22655x
              <span className="dot yellow" /> 2\u20135x
              <span className="dot red" /> &lt;2x
              <span style={{ color: '#a78bfa' }}>\u2605</span> \u226510x
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Target Hit Rates ({rounds.length} rounds)</div>
            {stats && stats.count > 0 ? (
              <div className="target-table">
                <div className="target-table-head">
                  <span>Target</span><span>Hit Rate</span><span>Recent 20</span><span>Last Hit</span><span>Signal</span>
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
                      {t.recentHitRate}%{t.recentHitRate >= t.hitRate ? ' \u2191' : ' \u2193'}
                    </span>
                    <span className="target-last">
                      {t.lastHitAgo === 0 ? 'Now' : t.lastHitAgo === -1 ? 'Never' : `${t.lastHitAgo}r ago`}
                    </span>
                    <span className={`target-signal ${t.signal.toLowerCase()}`}>{t.signal}</span>
                  </div>
                ))}
                <div className="target-footer">* Based on captured historical data.</div>
              </div>
            ) : (
              <div className="feed-empty">Capture rounds to see target analysis</div>
            )}
          </div>

          <div className="panel feed-panel">
            <div className="panel-title">Live Feed</div>
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
                    {round.crash_point >= 10 && <span className="feed-mega">\uD83D\uDD25</span>}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
