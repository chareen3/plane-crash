"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ShieldAlert, ShieldCheck, Scale, Zap, Info, CheckCircle2, AlertTriangle, Rocket, RefreshCw, Trash2, TrendingDown, TrendingUp, Minus, BarChart3, AlertOctagon, Orbit, Bot, Calculator } from "lucide-react";
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
  swing_target?: number | null;
  volatility_phase?: 'CALM' | 'NORMAL' | 'VOLATILE';
  recommended_stake_pct?: number;
};
type WinRate = {
  total: number;
  correct: number;
  winRate: number;
  byRisk: Record<string, { total: number; correct: number }>;
  totalProfitUnits?: number;
  totalLosses?: number;
  totalWins?: number;
};

const CURRENCIES = {
  USD: { symbol: '$', rate: 1, minBet: 1, name: '🇺🇸 USA ($1)' },
  LKR: { symbol: 'Rs. ', rate: 300, minBet: 300, name: '🇱🇰 Sri Lanka (₨300)' },
  INR: { symbol: '₹', rate: 85, minBet: 100, name: '🇮🇳 India (₹100)' },
  BRL: { symbol: 'R$', rate: 5, minBet: 5, name: '🇧🇷 Brazil (R$5)' },
};


const RISK_COLOR: Record<string, string> = { LOW: 'green', MEDIUM: 'yellow', HIGH: 'red' };
const RISK_EMOJI: Record<string, any> = { 
  LOW: <CheckCircle2 size={16} strokeWidth={2.5} />, 
  MEDIUM: <Info size={16} strokeWidth={2.5} />, 
  HIGH: <AlertTriangle size={16} strokeWidth={2.5} /> 
};
const STRATEGY_META: Record<string, { color: string; icon: any; label: string }> = {
  SKIP: { color: '#ff4d6d', icon: <ShieldAlert size={32} strokeWidth={2} />, label: 'SKIP THIS ROUND' },
  CONSERVATIVE: { color: '#00e5a0', icon: <ShieldCheck size={32} strokeWidth={2} />, label: 'CONSERVATIVE BET' },
  BALANCED: { color: '#ffc84a', icon: <Scale size={32} strokeWidth={2} />, label: 'BALANCED BET' },
  AGGRESSIVE: { color: '#a78bfa', icon: <Zap size={32} strokeWidth={2} />, label: 'AGGRESSIVE BET' },
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
  const lastPredictedRoundRef = useRef<number>(-1);

  const [currency, setCurrency] = useState<'USD' | 'LKR' | 'INR' | 'BRL'>('USD');
  const [mathExplainerOpen, setMathExplainerOpen] = useState(true); // default open to educate the user
  const [activeGame, setActiveGame] = useState<'1xbet' | 'aviator' | 'luckyjet'>('1xbet');

  const handleCurrencyChange = (curr: 'USD' | 'LKR' | 'INR' | 'BRL') => {
    setCurrency(curr);
    localStorage.setItem('dashboard_currency', curr);
  };

  const handleGameChange = (game: '1xbet' | 'aviator' | 'luckyjet') => {
    setActiveGame(game);
    setPredStatus('predicting');
    setIsPredicting(true);
    fetch(`/api/predict?game=${game}`)
      .then(res => res.ok ? res.json() : null)
      .then(d => {
        if (d && d.risk) { setPrediction(d); setPredStatus('done'); }
        else setPredStatus('idle');
      })
      .catch(() => setPredStatus('idle'))
      .finally(() => setIsPredicting(false));
  };

  const fetchWinRate = useCallback(async () => {
    const res = await fetch('/api/grade');
    if (res.ok) { const d = await res.json(); setWinRate(d); }
  }, []);

  const isPredictingRef = useRef(false);

  const runPrediction = useCallback(async () => {
    if (isPredictingRef.current) return; // prevent double-fire
    isPredictingRef.current = true;
    setPredStatus('predicting');
    setIsPredicting(true);
    try {
      const res = await fetch(`/api/predict?game=${activeGame}`);
      if (res.ok) {
        const d = await res.json();
        if (d.risk) { setPrediction(d); setPredStatus('done'); }
        else setPredStatus('idle');
      }
    } catch { setPredStatus('idle'); }
    finally { setIsPredicting(false); isPredictingRef.current = false; }
  }, [activeGame]);

  useEffect(() => {
    const savedCurr = localStorage.getItem('dashboard_currency');
    if (savedCurr && savedCurr in CURRENCIES) {
      setCurrency(savedCurr as any);
    }

    supabase.from('crash_rounds').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => {
        if (data?.length) {
          setRounds(data);
          setLastCrash(data[0]);
          setLocalStats(computeStats(data));
        }
      });
    fetchWinRate();
    runPrediction();

    const handleMessage = (evt: MessageEvent) => {
      if (evt.data?.type === 'EXTENSION_CRASH_LIVE') {
        const { round, prediction, stats } = evt.data;
        if (round) {
          lastPredictedRoundRef.current = round.round_number;
          const roundObj: Round = { ...round, _optimistic: true };
          setLastCrash(roundObj);
          setRounds(prev => {
            if (prev.some(r => r.round_number === roundObj.round_number)) return prev;
            const updated = [roundObj, ...prev].slice(0, 50);
            if (!stats) setLocalStats(computeStats(updated as any[]));
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
          setLocalStats(computeStats(updated as any[]));
          return updated;
        });
        setLastCrash(round);
        
        // Trigger prediction & winrate refresh only if not already handled optimistically
        if (round.round_number !== lastPredictedRoundRef.current) {
          fetchWinRate();
          runPrediction();
          lastPredictedRoundRef.current = round.round_number;
        }
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
          <Orbit className="topbar-icon" size={28} color="#FFD700" />
          <div>
            <h1 className="topbar-title">Crash Tracker</h1>
            <span className="topbar-sub">AI-Powered · Real-time · Supabase</span>
          </div>
        </div>
        <div className="topbar-right">

          <div className="currency-selector-wrap" style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginRight: '6px', fontWeight: 'bold' }}>📍 REGION:</span>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as any)}
              className="currency-select"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: '#fff',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              {Object.entries(CURRENCIES).map(([k, v]) => (
                <option key={k} value={k} style={{ background: '#13131a', color: '#fff' }}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {betAmount && <span className="bet-badge">💰 Bet: {betAmount} USD</span>}
          <span className="live-badge"><span className="live-dot" />LIVE</span>
          <button className="ai-btn" onClick={async () => {
            if (confirm('Are you sure you want to clear all data?')) {
              await fetch('/api/reset', { method: 'POST' });
              window.location.reload();
            }
          }}>
            <Trash2 size={16} /> Reset
          </button>
          <button className="ai-btn" onClick={() => runPrediction()} disabled={isPredicting || rounds.length === 0}>
            {isPredicting ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
            {isPredicting ? 'Analyzing...' : 'Refresh AI'}
          </button>
        </div>
      </header>

      <div className="game-selector-container" style={{
        display: 'flex',
        gap: '12px',
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.01)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '11px', color: '#666', fontWeight: '800', textTransform: 'uppercase', marginRight: '8px', letterSpacing: '0.5px' }}>GAME MODE:</span>
        {[
          { id: '1xbet', label: '1xBet Crash', desc: 'Target: 1.10x - 1.80x' },
          { id: 'aviator', label: 'Aviator', desc: 'Target: 1.15x - 1.60x' },
          { id: 'luckyjet', label: 'Lucky Jet', desc: 'Target: 1.08x - 1.70x' }
        ].map(g => (
          <button
            key={g.id}
            onClick={() => handleGameChange(g.id as any)}
            style={{
              background: activeGame === g.id ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: activeGame === g.id ? '#a78bfa' : 'rgba(255,255,255,0.08)',
              color: activeGame === g.id ? '#fff' : '#888',
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <span>{g.label}</span>
            <span style={{ fontSize: '9px', opacity: 0.7, fontWeight: 'normal' }}>{g.desc}</span>
          </button>
        ))}
      </div>


      {prediction && stratMeta && (
        <div className={`bet-signal-banner ${prediction.strategy}`} style={{ background: stratMeta.color + '18', borderColor: stratMeta.color }}>
          <div className="bsb-left">
            <span className="bsb-icon">{stratMeta.icon}</span>
            <div>
              <div className="bsb-action" style={{ color: stratMeta.color }}>{stratMeta.label}</div>
              <div className="bsb-reason">{prediction.skip_reason || prediction.strategy_reason || 'Highly confident statistical target.'}</div>
            </div>
          </div>
          <div className="bsb-right" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {prediction.should_bet && prediction.cashout_target && prediction.cashout_target > 0 ? (
              <>
                <div>
                  <div className="bsb-cashout-label">TARGET</div>
                  <div className="bsb-cashout-val" style={{ color: stratMeta.color }}>
                    {Number(prediction.cashout_target).toFixed(2)}x
                  </div>
                </div>
                <div>
                  <div className="bsb-cashout-label">REC. STAKE</div>
                  <div className="bsb-cashout-val" style={{ color: '#00e5a0' }}>
                    {prediction.recommended_stake_pct ?? ((prediction.recommended_bet_units ?? 1) * 2)}%
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div className="blink" style={{ background: 'rgba(255, 77, 109, 0.15)', border: '1px solid #ff4d6d', borderRadius: '8px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#ff4d6d" />
                  <span style={{ color: '#ff4d6d', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>DANGER ZONE: DO NOT BET</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <LingerMultipliers rounds={rounds} />

      <div className="main-grid">
        <div className="left-col">
          <div className={`pred-panel ${prediction ? `pred-${RISK_COLOR[prediction.risk]}` : ''}`}>
            <div className="pred-header">
              <span className="pred-title">AI RISK COACH & PROBABILITY ESTIMATOR</span>
              <span className={`pred-status ${predStatus}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {predStatus === 'predicting' ? <><RefreshCw size={12} className="spin" /> Analyzing...</> : predStatus === 'done' ? <><CheckCircle2 size={12} /> Ready</> : 'Waiting'}
              </span>
            </div>
            {prediction?.ai_model_used && predStatus === 'done' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span className={`risk-badge risk-${RISK_COLOR[prediction.risk]}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', fontSize: '11px' }}>
                  {RISK_EMOJI[prediction.risk]} {prediction.risk} RISK
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#a78bfa', fontWeight: '700', background: 'rgba(167,139,250,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                  <Bot size={11} /> AI Coach
                </span>
                {prediction.volatility_phase && (
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '10px', 
                    color: prediction.volatility_phase === 'CALM' ? '#00e5a0' : prediction.volatility_phase === 'VOLATILE' ? '#ff4d6d' : '#ffc84a', 
                    fontWeight: '700', 
                    background: prediction.volatility_phase === 'CALM' ? 'rgba(0, 229, 160, 0.1)' : prediction.volatility_phase === 'VOLATILE' ? 'rgba(255, 77, 109, 0.1)' : 'rgba(255, 200, 74, 0.1)', 
                    padding: '4px 10px', 
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    📊 Session: {prediction.volatility_phase}
                  </span>
                )}
                {prediction.should_bet && prediction.recommended_stake_pct && (
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '10px', 
                    color: '#a78bfa', 
                    fontWeight: '700', 
                    background: 'rgba(167, 139, 250, 0.1)', 
                    padding: '4px 10px', 
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    💰 Stake: {prediction.recommended_stake_pct}% bankroll
                  </span>
                )}
              </div>
            )}
            {prediction && stats ? (
              <>
                <div className="risk-conf-row">
                  <div className="conf-bar-wrap">
                    <div className="conf-bar-track">
                      <div className="conf-bar-fill" style={{ width: `${prediction.confidence}%` }} />
                    </div>
                    <span className="conf-label">{prediction.confidence}% confidence score</span>
                  </div>
                </div>
                <div className="pred-summary" style={{ fontStyle: 'italic', color: '#ccc', borderLeft: '3px solid #a78bfa', paddingLeft: '10px', margin: '12px 0 16px', fontSize: '13px', lineHeight: '1.4' }}>
                  {prediction.summary}
                </div>
                
                {prediction.strategy === 'SKIP' || !prediction.should_bet ? (
                  <div style={{ background: 'rgba(255, 77, 109, 0.08)', border: '1px solid rgba(255, 77, 109, 0.2)', borderRadius: '10px', padding: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={20} color="#ff4d6d" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ color: '#ff4d6d', fontWeight: '800', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>SKIP SIGNAL ACTIVE</div>
                      <div style={{ color: '#aaa', fontSize: '11px', marginTop: '2px' }}>
                        {prediction.skip_reason || prediction.strategy_reason || 'Session is exhibiting high-risk patterns. Wait for volatility to drop.'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="cashout-targets" style={{ display: 'grid', gridTemplateColumns: prediction.swing_target ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '16px' }}>
                    <div className="cashout-target safe" style={{ borderLeftColor: '#00e5a0', background: 'rgba(0, 229, 160, 0.03)', padding: '10px', borderLeftWidth: '3px', borderRadius: '4px' }}>
                      <div className="ct-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888' }}><ShieldCheck size={13} color="#00e5a0" /> Safe Auto-Cashout</div>
                      <div className="ct-mult" style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', color: '#00e5a0', margin: '4px 0' }}>
                        {prediction.cashout_target ? prediction.cashout_target.toFixed(2) : stats.conservativeCashout.toFixed(2)}x
                      </div>
                      <div className="ct-pct" style={{ fontSize: '10px', color: '#aaa' }}>
                        ~{prediction.cashout_target ? Math.round((0.97 / prediction.cashout_target) * 100) : 90}% mathematical probability
                      </div>
                    </div>
                    {prediction.swing_target && (
                      <div className="cashout-target risk" style={{ borderLeftColor: '#ffc84a', background: 'rgba(255, 200, 74, 0.03)', padding: '10px', borderLeftWidth: '3px', borderRadius: '4px' }}>
                        <div className="ct-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888' }}><Scale size={13} color="#ffc84a" /> Optional Swing (Split Bet)</div>
                        <div className="ct-mult" style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'monospace', color: '#ffc84a', margin: '4px 0' }}>
                          {prediction.swing_target.toFixed(2)}x
                        </div>
                        <div className="ct-pct" style={{ fontSize: '10px', color: '#aaa' }}>
                          ~{Math.round((0.97 / prediction.swing_target) * 100)}% mathematical probability
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {stats.p90SafeCashout !== undefined && !prediction.swing_target && prediction.strategy !== 'SKIP' && (
                  <div className="ai-ceiling-forecast" style={{ background: 'rgba(0, 229, 160, 0.15)', borderColor: '#00e5a0', marginTop: '16px' }}>
                    <span className="ceiling-label" style={{ color: '#00e5a0', fontWeight: 'bold' }}>⭐ STATISTICAL CEILING (90% HIT RATE)</span>
                    <span className="ceiling-val" style={{ color: '#00e5a0' }}>{Number(stats.p90SafeCashout).toFixed(2)}x</span>
                  </div>
                )}
                {prediction.long_targets && (
                  <div className="ai-long-forecast" style={{ marginBottom: '16px' }}>
                    <div className="long-targets-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <div className="long-target-col" style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                        <span className="lt-val" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold' }}>{prediction.long_targets.x5}%</span>
                        <span className="lt-lbl" style={{ display: 'block', fontSize: '9px', color: '#888' }}>5x (Math: 19.4%)</span>
                      </div>
                      <div className="long-target-col" style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                        <span className="lt-val" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold' }}>{prediction.long_targets.x10}%</span>
                        <span className="lt-lbl" style={{ display: 'block', fontSize: '9px', color: '#888' }}>10x (Math: 9.7%)</span>
                      </div>
                      <div className="long-target-col" style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                        <span className="lt-val" style={{ display: 'block', fontSize: '14px', fontWeight: 'bold' }}>{prediction.long_targets.x20}%</span>
                        <span className="lt-lbl" style={{ display: 'block', fontSize: '9px', color: '#888' }}>20x (Math: 4.8%)</span>
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Streak: {stats.currentLowStreak > 0 ? <><AlertTriangle size={14} color="var(--red)" /> {stats.currentLowStreak} low</> : <><CheckCircle2 size={14} color="var(--green)" /> {stats.currentHighStreak} high</>}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Trend: {stats.trend === 'rising' ? <><TrendingUp size={14} /> Rising</> : stats.trend === 'falling' ? <><TrendingDown size={14} /> Falling</> : <><Minus size={14} /> Flat</>}</span>
                  <span>Volatility: {stats.volatility}</span>
                </div>
              </>
            ) : (
              <div className="pred-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '30px 0' }}>
                {isPredicting ? <RefreshCw className="spin" size={24} /> : <Orbit size={24} />}
                {isPredicting ? 'Running AI analysis...' : 'Start capture to enable predictions'}
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
              { icon: <BarChart3 size={20} />, label: 'Avg', value: `${avg}x` },
              { icon: <TrendingDown size={20} />, label: 'Median', value: `${median}x` },
              { icon: <Rocket size={20} />, label: 'Highest', value: `${highest}x` },
              { icon: <AlertOctagon size={20} />, label: 'Under 2x', value: `${stats?.pUnder2 ?? 0}%`, cls: 'red' },
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
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#a78bfa" />
              AI Data Stream
            </div>
            
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Risk & Trend */}
              <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Live Engine State</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px' }}>Trend: <strong style={{ color: stats?.trend === 'rising' ? '#00e5a0' : stats?.trend === 'falling' ? '#ff4d6d' : '#fff' }}>{stats?.trend.toUpperCase() || 'FLAT'}</strong></div>
                  <div style={{ fontSize: '13px' }}>Volatility: <strong>{stats?.volatility.toUpperCase() || 'NORMAL'}</strong></div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Risk Score:</span>
                  <strong style={{ color: (stats?.riskScore ?? 0) > 60 ? '#ff4d6d' : (stats?.riskScore ?? 0) < 40 ? '#00e5a0' : '#ffc84a' }}>{stats?.riskScore ?? 0}/100</strong>
                </div>
              </div>

              {/* Minute Timing */}
              {stats?.timePattern && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Time Pattern Engine</div>
                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>Minute: <strong>{stats.timePattern.minute}</strong> (Occurred {stats.timePattern.occurrences}x)</div>
                  <div style={{ fontSize: '12px', color: '#aaa', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <div>80% Safe: <strong style={{ color: '#00e5a0' }}>{stats.timePattern.p80}x</strong></div>
                    <div>Median: <strong>{stats.timePattern.p50}x</strong></div>
                  </div>
                </div>
              )}

              {/* Sequence Engine */}
              {stats?.sequenceMatch && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Sequence Engine</div>
                  <div style={{ fontSize: '13px', marginBottom: '4px', display: 'flex', gap: '4px' }}>
                    {stats.sequenceMatch.sequence.map((sq, i) => (
                      <span key={i} style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '10px', 
                        background: sq === 'INSTANT' ? '#ff4d6d' : sq === 'LOW' ? '#ffc84a' : sq === 'MED' ? '#00e5a0' : '#a78bfa',
                        color: '#000',
                        fontWeight: 'bold'
                      }}>
                        {sq}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' }}>
                    <div>Instant Risk: <strong style={{ color: stats.sequenceMatch.pInstantNext > 20 ? '#ff4d6d' : '#fff' }}>{stats.sequenceMatch.pInstantNext}%</strong></div>
                    <div>Safe Hit Rate: <strong>{stats.sequenceMatch.pSafeNext}%</strong></div>
                  </div>
                </div>
              )}

              {/* Streak Patterns */}
              {stats?.detectedPatterns && stats.detectedPatterns.length > 0 && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Streak Pattern Engine</div>
                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>{stats.detectedPatterns[0].patternName}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    Historically occurred <strong>{stats.detectedPatterns[0].occurrences}</strong> times
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Crash History</div>
            <div className="chart-wrap" style={{ width: '100%', height: '220px', marginTop: '16px' }}>
              {rounds.length > 1 && (() => {
                const pts = [...rounds].reverse().slice(0, 50).map(r => ({
                  name: r.round_number,
                  crash: Number(r.crash_point),
                  color: r.crash_point < 2 ? '#ff4d6d' : r.crash_point < 5 ? '#ffc84a' : '#00e5a0'
                }));
                
                const CustomDot = (props: any) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy) return null;
                  return (
                    <circle cx={cx} cy={cy} r={4} fill={payload.color} stroke="var(--surface)" strokeWidth={1.5} />
                  );
                };

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pts} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCrash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6c63ff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(20, 20, 28, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        labelStyle={{ color: 'var(--text-dim)', marginBottom: '4px' }}
                        formatter={(value: any) => [`${value}x`, 'Crash']}
                        labelFormatter={(label) => `Round ${label}`}
                      />
                      <Area type="monotone" dataKey="crash" stroke="#6c63ff" strokeWidth={3} fillOpacity={1} fill="url(#colorCrash)" activeDot={{ r: 6, fill: '#6c63ff', stroke: '#fff', strokeWidth: 2 }} dot={<CustomDot />} />
                    </AreaChart>
                  </ResponsiveContainer>
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
                  <span>Target</span><span>RTP Math</span><span>Hit Rate</span><span>Recent 20</span><span>Last Hit</span><span>Signal</span>
                </div>
                {stats.targets.map(t => (
                  <div key={t.target} className={`target-row signal-${t.signal.toLowerCase()}`}>
                    <span className="target-mult">{t.target.toFixed(1)}x</span>
                    <span className="target-math">{(t.mathProb ?? 0).toFixed(1)}%</span>
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
