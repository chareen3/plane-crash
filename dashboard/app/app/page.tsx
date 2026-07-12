"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ShieldAlert, ShieldCheck, Scale, Zap, Info, CheckCircle2, AlertTriangle, Rocket, RefreshCw, Trash2, TrendingDown, TrendingUp, Minus, BarChart3, AlertOctagon, Orbit, Bot, Activity, Target, Clock, Layers, Home, Wifi, WifiOff, Flame, Coins, Menu, X, ChevronUp, ChevronDown, Skull, Settings, User, LogOut, Moon, Sun, Sunset, Star as StarIcon, Gauge, Sparkles } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import { computeStats, type CrashStats } from "@/lib/stats";
import { translations, type LanguageCode, LANGUAGE_NAMES, type Translations } from "@/lib/locales";
import SafePlayModal from './SafePlayModal';

const JetPlaneIcon = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    style={{ transform: 'rotate(-45deg)' }}
  >
    <path d="M12 2L9 9H2L7 13L5 21L12 17L19 21L17 13L22 9H15L12 2Z" />
  </svg>
);

type ChartType = 'area' | 'line' | 'bar';
type TimeRange = '1h' | '6h' | '24h' | '7d' | 'all';
type SortBy = 'newest' | 'oldest' | 'highest' | 'lowest';
type FilterBy = 'all' | 'safe' | 'risk' | 'high';

const supabase = createClient({
  realtime: { params: { eventsPerSecond: 20 } }
});

type Round = {
  id?: string;
  round_number: number;
  crash_point: number;
  created_at: string;
  _optimistic?: boolean;
  player_count?: number | null;
  total_bet_volume?: number | null;
};
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
  instant_crash_risk?: number;
  instant_crash_warning?: string;
  stability_analysis?: {
    status: 'STABLE' | 'CAUTION' | 'VOLATILE' | 'INSUFFICIENT_DATA';
    similarity_score: number;
    stability_index: number;
    matched_patterns_count: number;
    historical_win_rate_1_5x: number;
    holdScore?: number;
    holdReasons?: string[];
    holdSignal?: boolean;
  };
};
type WinRateWindow = {
  total: number;
  correct: number;
  winRate: number;
  totalProfitUnits: number;
  totalWins: number;
  totalLosses: number;
  avgTarget: number;
  realizedEv: number;
};
type WinRate = {
  total: number;
  correct: number;
  winRate: number;
  byRisk: Record<string, { total: number; correct: number }>;
  totalProfitUnits?: number;
  totalLosses?: number;
  totalWins?: number;
  avgTarget?: number;
  realizedEv?: number;
  last24h?: WinRateWindow;
  last7d?: WinRateWindow;
  allTime?: WinRateWindow;
  signalQuality?: 'STRONG' | 'MODERATE' | 'CAUTION' | 'INSUFFICIENT';
  signalBasisWindow?: string;
};

const RISK_COLOR: Record<string, string> = { LOW: 'green', MEDIUM: 'yellow', HIGH: 'red' };
const RISK_EMOJI: Record<string, any> = {
  LOW: <CheckCircle2 size={14} strokeWidth={2.5} />,
  MEDIUM: <Info size={14} strokeWidth={2.5} />,
  HIGH: <AlertTriangle size={14} strokeWidth={2.5} />
};

const STRATEGY_META: Record<string, { color: string; glow: string; icon: any; label: string; tag: string }> = {
  SKIP: { color: '#ff3366', glow: 'rgba(255,51,102,0.3)', icon: <ShieldAlert size={28} strokeWidth={2} />, label: 'HOLD — DO NOT ENTER', tag: 'DANGER' },
  CONSERVATIVE: { color: '#00e5a0', glow: 'rgba(0,229,160,0.3)', icon: <ShieldCheck size={28} strokeWidth={2} />, label: 'SAFE ENTRY SIGNAL', tag: 'SAFE' },
  AGGRESSIVE: { color: '#ffd000', glow: 'rgba(255,208,0,0.3)', icon: <Scale size={28} strokeWidth={2} />, label: 'HIGH-RISK PLAY', tag: 'RISK' },
  SWING: { color: '#a78bfa', glow: 'rgba(167,139,250,0.3)', icon: <Rocket size={28} strokeWidth={2} />, label: 'SWING TRADE', tag: 'SWING' },
};

interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
}

function classifyRisk(v: number) { return v < 2 ? 'red' : v < 5 ? 'yellow' : 'green'; }
function timeAgo(iso: string, t: Translations) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t.agoSeconds.replace('{val}', String(s));
  return t.agoMinutes.replace('{val}', String(Math.floor(s / 60)));
}

function filterRounds(rounds: Round[], filter: FilterBy): Round[] {
  switch (filter) {
    case 'safe': return rounds.filter(r => r.crash_point >= 2 && r.crash_point < 5);
    case 'risk': return rounds.filter(r => r.crash_point >= 5);
    case 'high': return rounds.filter(r => r.crash_point < 2);
    default: return rounds;
  }
}

function sortRounds(rounds: Round[], sort: SortBy): Round[] {
  const sorted = [...rounds];
  switch (sort) {
    case 'oldest': return sorted.reverse();
    case 'highest': return sorted.sort((a, b) => b.crash_point - a.crash_point);
    case 'lowest': return sorted.sort((a, b) => a.crash_point - b.crash_point);
    default: return sorted;
  }
}

function filterByTimeRange(rounds: Round[], range: TimeRange): Round[] {
  if (range === 'all') return rounds;
  const now = Date.now();
  const ranges: Record<string, number> = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
  const cutoff = now - (ranges[range] || 0);
  return rounds.filter(r => new Date(r.created_at).getTime() >= cutoff);
}

const PHASE_ICONS: Record<string, { icon: any; color: string; glow: string; label: string; bg: string }> = {
  SLEEP: {
    icon: <Moon size={18} />,
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.3)',
    label: 'SLEEP',
    bg: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.03))'
  },
  MORNING: {
    icon: <Sun size={18} />,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.3)',
    label: 'MORNING',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))'
  },
  DAY: {
    icon: <Sun size={18} />,
    color: '#38bdf8',
    glow: 'rgba(56,189,248,0.3)',
    label: 'DAY',
    bg: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.03))'
  },
  EVENING: {
    icon: <Sunset size={18} />,
    color: '#f97316',
    glow: 'rgba(249,115,22,0.3)',
    label: 'EVENING',
    bg: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.03))'
  },
  PRIME: {
    icon: <Sparkles size={18} />,
    color: '#00e5a0',
    glow: 'rgba(0,229,160,0.4)',
    label: 'PRIME',
    bg: 'linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,229,160,0.04))'
  },
  LATE: {
    icon: <StarIcon size={18} />,
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.3)',
    label: 'LATE',
    bg: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(167,139,250,0.03))'
  }
};

function TimeSyncCard({ timeData, lang }: { timeData: any; lang: LanguageCode }) {
  const phase = timeData?.lkPhase ?? 'DAY';
  const meta = PHASE_ICONS[phase] || PHASE_ICONS.DAY;
  const isPrime = phase === 'PRIME';
  const isSleep = phase === 'SLEEP';

  return (
    <div className={`time-sync-card ${phase.toLowerCase()}`} style={{
      background: meta.bg,
      border: `1px solid ${meta.color}25`,
      borderRadius: '14px',
      padding: '14px 16px',
      marginTop: '12px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated gradient glow */}
      <div className="ts-glow" style={{
        position: 'absolute',
        top: '-50%',
        left: '-25%',
        width: '150%',
        height: '200%',
        background: `radial-gradient(circle at 30% 40%, ${meta.glow}, transparent 60%)`,
        pointerEvents: 'none',
        animation: 'ts-glow-drift 6s ease-in-out infinite',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
        {/* Animated icon container */}
        <div className={`ts-icon-wrap ${phase.toLowerCase()}`} style={{
          background: `${meta.color}15`,
          border: `1px solid ${meta.color}30`,
          borderRadius: '12px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: meta.color,
          flexShrink: 0,
          position: 'relative'
        }}>
          <div className="ts-icon" style={{ position: 'relative', zIndex: 1 }}>{meta.icon}</div>
          <div className="ts-icon-ring" style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '14px',
            border: `2px solid ${meta.color}20`,
            animation: 'ts-ring-pulse 3s ease-in-out infinite',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ts-title" style={{
              fontSize: '11px',
              fontWeight: '800',
              color: '#f8fafc',
              letterSpacing: '1px',
              fontFamily: "'Rajdhani', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Gauge size={11} color={meta.color} />
              PEAK HOURS
            </span>
            <span className="ts-badge" style={{
              fontSize: '9px',
              background: `${meta.color}18`,
              color: meta.color,
              padding: '3px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              fontWeight: '900',
              fontFamily: "'Rajdhani', sans-serif",
              letterSpacing: '0.5px',
              border: `1px solid ${meta.color}25`,
            }}>
              {isPrime ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={10} className="ts-sparkle" />
                  PRIME
                </span>
              ) : isSleep ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Moon size={10} /> SLEEP
                </span>
              ) : meta.label}
            </span>
          </div>
          <div style={{
            fontSize: '11px',
            color: '#94a3b8',
            marginTop: '4px',
            lineHeight: '1.4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{timeData.currentLKTimeStr}</strong>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{timeData.lkNote}</span>
          </div>
        </div>
      </div>

      {/* Activity bar */}
      {!isSleep && (
        <div className="ts-activity" style={{
          marginTop: '10px',
          height: '3px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="ts-bar" style={{
            height: '100%',
            borderRadius: '2px',
            background: `linear-gradient(90deg, ${meta.color}, ${meta.color}80)`,
            width: isPrime ? '85%' : phase === 'EVENING' ? '60%' : phase === 'MORNING' ? '35%' : phase === 'DAY' ? '50%' : '25%',
            animation: 'ts-bar-pulse 2s ease-in-out infinite',
          }} />
        </div>
      )}
    </div>
  );
}

// Function AnimatedCrashMultiplier removed per user request to drop animations

export default function Dashboard() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [lastCrash, setLastCrash] = useState<Round | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [winRate, setWinRate] = useState<WinRate>({ total: 0, correct: 0, winRate: 0, byRisk: {} });
  const [localStats, setLocalStats] = useState<CrashStats | null>(null);
  const [timeData, setTimeData] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predStatus, setPredStatus] = useState<'idle' | 'predicting' | 'done'>('idle');
  const [betAmount, setBetAmount] = useState<string>('');
  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const heroRef = useRef<HTMLDivElement>(null);
  const lastPredictedRoundRef = useRef<number>(-1);
  const [lang, setLang] = useState<LanguageCode>('en');
  const [isAdmin, setIsAdmin] = useState(false);
  const t = translations[lang] || translations.en;

  const f = (str: string, values: Record<string, string | number>) => {
    let result = str;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(val));
    }
    return result;
  };

  const getStratMeta = (strategy: string) => {
    const meta = STRATEGY_META[strategy] || STRATEGY_META['CONSERVATIVE'];
    switch (strategy) {
      case 'SKIP':
        return { ...meta, label: t.holdDoNotEnter, tag: t.danger };
      case 'CONSERVATIVE':
        return { ...meta, label: t.safeEntrySignal, tag: t.safe };
      case 'AGGRESSIVE':
        return { ...meta, label: t.highRiskPlay, tag: t.risk };
      case 'SWING':
        return { ...meta, label: t.swingTrade, tag: t.swing };
      default:
        return { ...meta, label: t.safeEntrySignal, tag: t.safe };
    }
  };

  const [activeGame] = useState<'1xbet' | 'aviator' | 'luckyjet'>('1xbet');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [dashTab, setDashTab] = useState<'signals' | 'stats'>('signals');
  const [showMobileStatsPanel, setShowMobileStatsPanel] = useState(true);
  const [statsWindow, setStatsWindow] = useState<'24h' | '7d' | 'all'>('24h');
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [latency, setLatency] = useState<number>(0);
  const lastMessageTimeRef = useRef<number>(Date.now());
  
  // New state for enhanced features
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [displayCount, setDisplayCount] = useState<number>(50);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastSyncedRound, setLastSyncedRound] = useState<number | null>(null);
  const prevStatusRef = useRef<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [liveData, setLiveData] = useState<{ multiplierText?: string; timerText?: string; state?: string } | null>(null);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleLangChange = (newLang: LanguageCode) => {
    setLang(newLang);
    localStorage.setItem('dashboard_lang', newLang);
  };

  const fetchWinRate = useCallback(async () => {
    const res = await fetch('/api/grade');
    if (res.ok) { const d = await res.json(); setWinRate(d); }
  }, []);

  const isPredictingRef = useRef(false);

  const runPrediction = useCallback(async () => {
    if (isPredictingRef.current) return;
    isPredictingRef.current = true;
    setPredStatus('predicting');
    setIsPredicting(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/predict?game=${activeGame}&tz=${encodeURIComponent(tz)}`);
      if (res.ok) {
        const d = await res.json();
        // Map the predict API response to the Prediction type expected by the dashboard
        if (d.risk || d.strategy) {
          const mapped = {
            ...d,
            predicted_risk: d.risk ?? d.predicted_risk,
            strategy: d.strategy ?? 'CONSERVATIVE',
            should_bet: d.should_bet ?? true,
            cashout_target: d.cashout_target ?? d.predicted_multiplier ?? 1.2,
          };
          setPrediction(mapped);
          if (d.timeData) setTimeData(d.timeData);
          setPredStatus('done');
        } else {
          setPredStatus('idle');
        }
      }
    } catch { setPredStatus('idle'); }
    finally { setIsPredicting(false); isPredictingRef.current = false; }
  }, [activeGame]);

  const triggerReconnect = useCallback(() => {
    setConnectionStatus('connecting');
    lastMessageTimeRef.current = Date.now();
    window.postMessage({ type: 'DASHBOARD_PING', timestamp: Date.now() }, '*');
    addToast(t.attemptConnection, "info", 3000);

    setTimeout(() => {
      setIsExtensionConnected(curr => {
        if (!curr) {
          setConnectionStatus('disconnected');
          const roundMsg = lastSyncedRound ? `${t.tableGameId} #${lastSyncedRound}` : t.waitingForCrashData;
          addToast(`${t.connectionFailed} ${roundMsg}`, "error", 5000);
        }
        return curr;
      });
    }, 4000);
  }, [lastSyncedRound, addToast, t]);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // ── Heartbeat: track user activity every 60 seconds ─────────────────────
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    };
    sendHeartbeat(); // fire immediately on mount
    const hbInterval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(hbInterval);
  }, []);

  useEffect(() => {
    // Lightweight cache cleanup on initialization
    try {
      localStorage.removeItem('oldCrashCache');
      localStorage.removeItem('debugLogs');
      localStorage.removeItem('crashHistory');
    } catch(e) {}

    const savedLang = localStorage.getItem('dashboard_lang');
    if (savedLang && (savedLang === 'en' || savedLang === 'si' || savedLang === 'ta')) {
      setLang(savedLang as LanguageCode);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(({ data }) => {
          if (data?.is_admin) setIsAdmin(true);
        })
      }
    });

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

    // ── Message handler ─────────────────────────────────────────────────────
    const handleMessage = (evt: MessageEvent) => {
      const type = evt.data?.type;
      if (!type) return;

      // Any message from extension resets the missed-pong counter
      if (
        type === 'EXTENSION_PONG' ||
        type === 'EXTENSION_CONNECTED' ||
        type === 'EXTENSION_HEARTBEAT' ||
        type === 'LIVE_TICK' ||
        type === 'TIMER_TICK' ||
        type === 'EXTENSION_CRASH_LIVE' ||
        type === 'NEW_CRASH'
      ) {
        lastMessageTimeRef.current = Date.now();
        setIsExtensionConnected(true);
      }

      if (type === 'EXTENSION_PONG' || type === 'EXTENSION_CONNECTED') {
        if (evt.data?.timestamp) {
          setLatency(Date.now() - evt.data.timestamp);
        }
      }

      if (type === 'EXTENSION_CRASH_LIVE' || type === 'NEW_CRASH') {
        const round = evt.data.round;
        if (round?.round_number) setLastSyncedRound(round.round_number);
      }

      if (type === 'EXTENSION_CRASH_LIVE') {
        const { round, prediction, stats, timeData: td } = evt.data;
        if (round) {
          lastPredictedRoundRef.current = round.round_number;
          const roundObj: Round = { ...round, _optimistic: true };
          setLastCrash(roundObj);
          setLiveData(prev => ({ ...prev, state: 'crashed' }));
          setRounds(prev => {
            if (prev.some(r => r.round_number === roundObj.round_number)) return prev;
            const updated = [roundObj, ...prev].slice(0, 50);
            if (!stats) setLocalStats(computeStats(updated as any[]));
            return updated;
          });
        }
        if (stats) setLocalStats(stats);
        if (prediction) { setPrediction(prediction); setPredStatus('done'); }
        if (td) setTimeData(td);
        heroRef.current?.classList.remove('flash');
        void heroRef.current?.offsetWidth;
        heroRef.current?.classList.add('flash');
        fetchWinRate();
      } else if (type === 'EXTENSION_BET_CHANGE') {
        setBetAmount(evt.data.amount);
      } else if (type === 'LIVE_TICK') {
        setLiveData(prev => ({ ...prev, multiplierText: evt.data.multiplierText, state: evt.data.state, timerText: undefined }));
      } else if (type === 'TIMER_TICK') {
        setLiveData(prev => ({ ...prev, timerText: evt.data.timerText, multiplierText: undefined, state: 'waiting' }));
      }
    };
    window.addEventListener('message', handleMessage);

    // ── SW keepalive ping every 10s (just to keep SW awake for tick forwarding) ──
    const pingInterval = setInterval(() => {
      window.postMessage({ type: 'DASHBOARD_PING', timestamp: Date.now() }, '*');
    }, 10000);

    // ── Disconnect watchdog ───────────────────────────────────────────────────
    // The bridge sends EXTENSION_PONG every 1 second.
    // We only call disconnected if we heard NOTHING for 30 seconds.
    // This only happens if the extension is disabled/removed/crashed.
    const watchdogInterval = setInterval(() => {
      if (Date.now() - lastMessageTimeRef.current > 30000) {
        setIsExtensionConnected(false);
      }
    }, 5000);

    // ── Supabase realtime channel ────────────────────────────────────────────
    const channel = supabase.channel('crash-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_rounds' }, (payload) => {
        lastMessageTimeRef.current = Date.now();
        setIsExtensionConnected(true);
        const round = payload.new as Round;
        setRounds(prev => {
          const exists = prev.findIndex(r => r.round_number === round.round_number);
          if (exists !== -1) { const u = [...prev]; u[exists] = round; return u; }
          const updated = [round, ...prev].slice(0, 50);
          setLocalStats(computeStats(updated as any[]));
          return updated;
        });
        setLastCrash(round);
        if (round.round_number !== lastPredictedRoundRef.current) {
          fetchWinRate();
          runPrediction();
          lastPredictedRoundRef.current = round.round_number;
        }
      }).subscribe();

    // Mark disconnected at startup only if no heartbeat in 5s
    const connTimeout = setTimeout(() => {
      setIsExtensionConnected(curr => {
        if (!curr) {
          setConnectionStatus('disconnected');
          prevStatusRef.current = 'disconnected';
        }
        return curr;
      });
    }, 5000);

    return () => {
      clearInterval(pingInterval);
      clearInterval(watchdogInterval);
      clearTimeout(connTimeout);
      supabase.removeChannel(channel);
      window.removeEventListener('message', handleMessage);
    };
  }, [fetchWinRate, runPrediction]);

  useEffect(() => {
    if (isExtensionConnected) {
      if (prevStatusRef.current !== 'connected') {
        setConnectionStatus('connected');
        addToast(t.connectionActive, "success");
        prevStatusRef.current = 'connected';
      }
    } else {
      if (prevStatusRef.current === 'connected') {
        setConnectionStatus('disconnected');
        const roundMsg = lastSyncedRound ? `${t.tableGameId} #${lastSyncedRound}` : t.waitingForCrashData;
        addToast(`${t.connectionLost} ${roundMsg}`, "error", 6000);
        prevStatusRef.current = 'disconnected';
      }
    }
  }, [isExtensionConnected, lastSyncedRound, addToast, t]);

  const stats = localStats;
  const getTargetStats = (target: number | undefined | null) => {
    if (!rounds || rounds.length === 0 || !target || target <= 0) {
      return { hitRate: 0, ev: 0 };
    }
    const hits = rounds.filter(r => Number(r.crash_point) >= target).length;
    const hitRate = Math.round((hits / rounds.length) * 100);
    const ev = (hitRate / 100) * target - 1;
    return { hitRate, ev };
  };
  const avg = stats ? stats.mean.toFixed(2) : '—';
  const median = stats ? stats.median.toFixed(2) : '—';
  const highest = rounds.length > 0 ? Math.max(...rounds.map(r => Number(r.crash_point))).toFixed(2) : '—';
  const stratMeta = prediction?.strategy
    ? getStratMeta(prediction.strategy)
    : prediction
      ? getStratMeta('CONSERVATIVE')
      : null;

  const navItems = [
    { id: 'dashboard', icon: <Home size={18} />, label: t.navDashboard },
    { id: 'live', icon: <Activity size={18} />, label: t.navLiveFeed },
    { id: 'targets', icon: <Target size={18} />, label: t.navTargets },
    { id: 'patterns', icon: <Layers size={18} />, label: t.navPatterns },
    { id: 'history', icon: <Clock size={18} />, label: t.navHistory },
  ];

  const processedRounds = sortRounds(filterByTimeRange(filterRounds(rounds, filterBy), timeRange), sortBy);
  const displayedRounds = processedRounds.slice(0, displayCount);
  
  const chartData = [...displayedRounds].reverse().map(r => ({
    name: r.round_number,
    time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    crash: Number(r.crash_point),
    color: r.crash_point < 2 ? '#ff3366' : r.crash_point < 5 ? '#ffd000' : '#00e5a0'
  }));

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    return <circle cx={cx} cy={cy} r={3} fill={payload.color} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />;
  };

  // Big hits from recent rounds
  const bigHits = [...rounds].slice(0, 30).filter(r => r.crash_point >= 5).sort((a, b) => b.crash_point - a.crash_point).slice(0, 5);

  return (
    <div className="dash-shell">
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="sidebar desktop-sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="CrashTracker" style={{ width: '22px', height: '22px', borderRadius: '5px', objectFit: 'cover' }} />
          <span className="sidebar-logo-text">CrashTracker</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          {isAdmin && (
            <Link href="/admin" className="sidebar-nav-item" style={{ color: '#a78bfa' }}>
              <ShieldCheck size={18} />
              <span>Admin Panel</span>
            </Link>
          )}
          <Link href="/app/settings" className="sidebar-nav-item" style={{ marginTop: 'auto', paddingTop: 20 }}>
            <Settings size={18} />
            <span>Profile & Settings</span>
          </Link>
        </nav>

        <div className="sidebar-bottom">
          {/* Redesigned 1xBet Crash Telemetry Card */}
          <div className={`live-crash-widget ${liveData?.state === 'active' ? 'widget-active' : 'widget-crashed'}`}>
            <div className={`widget-game-label ${liveData?.state === 'active' ? 'active' : 'crashed'}`}>
              {t.gameTitle}
            </div>

            <div className={`widget-radar-ring ${liveData?.state === 'active' ? 'active' : ''}`}>
              <img
                src="https://images.dwncdn.net/images/t_app-icon-l/p/4855e891-8e6b-48b7-b768-507340e6ac23/418101296/crash-predictor-aviator-logo"
                alt="Crash Predictor"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>

            <div className="widget-multiplier-box">
              <div className="widget-state-sub">
                {liveData?.state === 'active' ? t.liveMultiplier : t.roundCrashed}
              </div>
              <div className={`widget-mult-val ${liveData?.state === 'active' ? 'active' : 'crashed'}`}>
                {liveData?.state === 'active' ?
                  (liveData.multiplierText || '1.00x') :
                  (lastCrash ? `${Number(lastCrash.crash_point).toFixed(2)}x` : '—')
                }
              </div>
              <div className="widget-time-ago">
                {liveData?.state === 'active' ? t.flyingSupersonic :
                  liveData?.timerText ? f(t.nextFlightIn, { timer: liveData.timerText }) :
                    (lastCrash ? timeAgo(lastCrash.created_at, t) : t.telemetryStandby)}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE DRAWER (SLIDE-IN SIDEBAR) ─── */}
      <div className={`mobile-drawer-backdrop ${mobileDrawerOpen ? 'open' : ''}`} onClick={() => setMobileDrawerOpen(false)} />
      <div className={`mobile-drawer ${mobileDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="CrashTracker" style={{ width: '22px', height: '22px', borderRadius: '5px', objectFit: 'cover' }} />
            <span className="sidebar-logo-text">CrashTracker</span>
          </div>
          <button className="drawer-close" onClick={() => setMobileDrawerOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
          <div className="drawer-section">
            <h4 className="drawer-section-title">{t.connectionStatus}</h4>
            {connectionStatus === 'connected' ? (
              <div className="live-badge connected" style={{ borderColor: 'rgba(0,229,160,0.25)', color: '#00e5a0', background: 'rgba(0,229,160,0.1)' }}>
                <span className="live-dot synced" style={{ background: '#00e5a0', boxShadow: '0 0 6px #00e5a0', animation: 'pulse 1.5s infinite' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{t.synced}</span>
                  {latency > 0 && <span style={{ fontSize: '9px', opacity: 0.7, background: 'rgba(0,229,160,0.15)', padding: '2px 6px', borderRadius: '10px' }}>{latency}ms</span>}
                </div>
              </div>
            ) : connectionStatus === 'connecting' ? (
              <div className="live-badge connecting" style={{ borderColor: 'rgba(255,208,0,0.25)', color: '#ffd000', background: 'rgba(255,208,0,0.1)' }}>
                <span className="live-dot trying" style={{ background: '#ffd000', boxShadow: '0 0 6px #ffd000', animation: 'pulse 1.5s infinite' }} />
                <span>{t.connecting}</span>
              </div>
            ) : (
              <div className="live-badge disconnected" style={{ borderColor: 'rgba(255,51,102,0.25)', color: '#ff3366', background: 'rgba(255,51,102,0.1)' }}>
                <span className="live-dot off" style={{ background: '#ff3366' }} />
                <span>{t.disconnected}</span>
              </div>
            )}

            {connectionStatus !== 'connected' && (
              <button
                className="top-btn reconnect-btn"
                onClick={() => {
                  triggerReconnect();
                  setMobileDrawerOpen(false);
                }}
                style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
              >
                <RefreshCw size={14} className={connectionStatus === 'connecting' ? 'spin' : ''} />
                {t.reconnectSync}
              </button>
            )}
          </div>

          <div className="drawer-section">
            <h4 className="drawer-section-title">{t.preferences}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t.selectLanguage}</span>
                <select
                  value={lang}
                  onChange={(e) => handleLangChange(e.target.value as LanguageCode)}
                  className="currency-select"
                  style={{ width: 'auto', background: 'rgba(255,255,255,0.05)' }}
                >
                  {Object.entries(LANGUAGE_NAMES).map(([k, name]) => (
                    <option key={k} value={k} style={{ background: '#0f111a' }}>{name}</option>
                  ))}
                </select>
              </div>
              {betAmount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t.betSize}</span>
                  <span className="bet-badge">
                    <Coins size={13} color="#ffd000" style={{ marginRight: '4px' }} />
                    {betAmount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="drawer-footer" style={{ width: '100%' }}>
          {/* Redesigned 1xBet Crash Telemetry Card */}
          <div className={`live-crash-widget ${liveData?.state === 'active' ? 'widget-active' : 'widget-crashed'}`} style={{ width: '100%' }}>
            <div className={`widget-game-label ${liveData?.state === 'active' ? 'active' : 'crashed'}`}>
              {t.gameTitle}
            </div>

            <div className={`widget-radar-ring ${liveData?.state === 'active' ? 'active' : ''}`}>
              <JetPlaneIcon
                size={32}
                className={`widget-plane-icon ${liveData?.state === 'active' ? 'active' : 'crashed'}`}
              />
            </div>

            <div className="widget-multiplier-box">
              <div className="widget-state-sub">
                {liveData?.state === 'active' ? t.liveMultiplier : t.roundCrashed}
              </div>
              <div className={`widget-mult-val ${liveData?.state === 'active' ? 'active' : 'crashed'}`} style={{ fontSize: '30px' }}>
                {liveData?.state === 'active' ?
                  (liveData.multiplierText || '1.00x') :
                  (lastCrash ? `${Number(lastCrash.crash_point).toFixed(2)}x` : '—')
                }
              </div>
              <div className="widget-time-ago">
                {liveData?.state === 'active' ? t.flyingSupersonic :
                  liveData?.timerText ? f(t.nextFlightIn, { timer: liveData.timerText }) :
                    (lastCrash ? timeAgo(lastCrash.created_at, t) : t.telemetryStandby)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="dash-main">
        {/* ─── DESKTOP TOP BAR ─── */}
        <header className="dash-topbar desktop-header">
          <div className="dash-topbar-title">
            <Bot size={18} color="#00ffd5" />
            <span>{t.appName}</span>
            <span className="dash-topbar-sub">{t.appSub}</span>
          </div>

          <div className="dash-topbar-actions">
            {betAmount && (
              <span className="bet-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coins size={13} color="#ffd000" />
                <span>{betAmount}</span>
              </span>
            )}

            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value as LanguageCode)}
              className="currency-select"
            >
              {Object.entries(LANGUAGE_NAMES).map(([k, name]) => (
                <option key={k} value={k} style={{ background: '#0f111a' }}>{name}</option>
              ))}
            </select>

            {connectionStatus === 'connected' ? (
              <div className="live-badge connected" style={{ borderColor: 'rgba(0,229,160,0.25)', color: '#00e5a0', background: 'rgba(0,229,160,0.1)' }}>
                <span className="live-dot synced" style={{ background: '#00e5a0', boxShadow: '0 0 6px #00e5a0', animation: 'pulse 1.5s infinite' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{t.synced}</span>
                  {latency > 0 && <span style={{ fontSize: '9px', opacity: 0.7, background: 'rgba(0,229,160,0.15)', padding: '2px 6px', borderRadius: '10px' }}>{latency}ms</span>}
                </div>
              </div>
            ) : connectionStatus === 'connecting' ? (
              <div className="live-badge connecting" style={{ borderColor: 'rgba(255,208,0,0.25)', color: '#ffd000', background: 'rgba(255,208,0,0.1)' }}>
                <span className="live-dot trying" style={{ background: '#ffd000', boxShadow: '0 0 6px #ffd000', animation: 'pulse 1.5s infinite' }} />
                <span>{t.connecting}</span>
              </div>
            ) : (
              <div className="live-badge disconnected" style={{ borderColor: 'rgba(255,51,102,0.25)', color: '#ff3366', background: 'rgba(255,51,102,0.1)' }}>
                <span className="live-dot off" style={{ background: '#ff3366' }} />
                <span>{t.disconnected} {lastSyncedRound ? `(${t.tableGameId}: #${lastSyncedRound})` : ''}</span>
              </div>
            )}

            {connectionStatus !== 'connected' && (
              <button
                className="top-btn reconnect-btn"
                onClick={triggerReconnect}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.25)',
                  color: '#00ffd5',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={14} className={connectionStatus === 'connecting' ? 'spin' : ''} />
                {t.reconnect}
              </button>
            )}
            {/* Safe Play button rendered by SafePlayModal */}
            <SafePlayModal />
            <div style={{ position: 'relative' }}>
              <button className="top-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <User size={14} /> Profile
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '200px',
                  backgroundColor: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '12px',
                  padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                  <Link href="/app/settings" className="sidebar-nav-item" style={{ padding: '10px 12px', fontSize: '13px' }}>
                    <Settings size={14} /> Profile Settings
                  </Link>
                  <button className="sidebar-nav-item" onClick={handleLogout} style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--red)' }}>
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── MOBILE TOP BAR ─── */}
        <header className="dash-topbar mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-menu-btn" onClick={() => setMobileDrawerOpen(true)}>
              <Menu size={22} color="#fff" />
            </button>
            <div className="dash-topbar-title">
              <img src="/logo.png" alt="CrashTracker" style={{ width: '20px', height: '20px', borderRadius: '5px', objectFit: 'cover' }} />
              <span className="sidebar-logo-text">{t.appName}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {connectionStatus === 'connected' ? (
              <span className="mobile-status-dot connected" title={`${t.synced}: ${latency}ms`} />
            ) : (
              <span className="mobile-status-dot disconnected" title={t.disconnected} />
            )}

            <button className="mobile-action-btn" onClick={() => runPrediction()} disabled={isPredicting || rounds.length === 0}>
              {isPredicting ? <RefreshCw size={14} className="spin" color="#00ffd5" /> : <Zap size={14} color="#00ffd5" />}
            </button>
            <SafePlayModal />
          </div>
        </header>

        {/* ─── MOBILE LIVE STATUS BAR ─── */}
        <div className="mobile-live-status-bar">
          <div className="mlsb-container">
            <div className="mlsb-plane-wrapper">
              <JetPlaneIcon
                size={20}
                className={liveData?.state === 'active' ? 'widget-plane-icon active' : 'widget-plane-icon crashed'}
              />
            </div>
            <div className="mlsb-info">
              <span className="mlsb-label">
                {t.gameTitle}: {liveData?.state === 'active' ? t.liveMultiplier : t.roundCrashed}
              </span>
              <span className="mlsb-val" style={{
                color: liveData?.state === 'active' ? '#38bdf8' :
                  (classifyRisk(Number(lastCrash?.crash_point ?? 0)) === 'green' ? '#00e5a0' :
                    classifyRisk(Number(lastCrash?.crash_point ?? 0)) === 'yellow' ? '#ffd000' : '#ff3366')
              }}>
                {liveData?.state === 'active' ? (liveData?.multiplierText || '1.00x') : (lastCrash ? Number(lastCrash.crash_point).toFixed(2) + 'x' : '—')}
              </span>
            </div>
            {liveData?.state === 'active' && liveData?.timerText && (
              <div className="mlsb-timer">{f(t.nextFlightIn, { timer: liveData.timerText })}</div>
            )}
          </div>
        </div>

        {/* ─── BODY ─── */}
        <div className="dash-body">

          {/* ─── GAME SELECTOR CARDS ─── */}
          <div className="game-selector-section" style={{ padding: '16px 24px 0', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
              {/* Crash Predictor - Active */}
              <div
                style={{
                  flex: '0 0 auto',
                  minWidth: '180px',
                  background: 'linear-gradient(145deg, rgba(0,255,213,0.12), rgba(0,255,213,0.03))',
                  border: '2px solid rgba(0,255,213,0.4)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,255,213,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#00e5a0',
                  color: '#000',
                  fontSize: '8px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ACTIVE
                </div>
                <img
                  src="https://images.dwncdn.net/images/t_app-icon-l/p/4855e891-8e6b-48b7-b768-507340e6ac23/418101296/crash-predictor-aviator-logo"
                  alt="Crash Predictor"
                  style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(0,255,213,0.3)' }}
                />
                <div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>Crash Predictor</div>
                  <div style={{ fontSize: '10px', color: '#00e5a0', fontWeight: '600' }}>1xBet Crash</div>
                </div>
              </div>

              {/* Aviator - Coming Soon */}
              <div
                style={{
                  flex: '0 0 auto',
                  minWidth: '180px',
                  background: 'linear-gradient(145deg, rgba(167,139,250,0.08), rgba(167,139,250,0.02))',
                  border: '2px solid rgba(167,139,250,0.25)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'not-allowed',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: 0.7
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.85';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(167,139,250,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(167,139,250,0.3)',
                  color: '#a78bfa',
                  fontSize: '8px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  COMING SOON
                </div>
                <img
                  src="https://camasy-images.storage.googleapis.com/casino/spribe__theear__628f790bf3069.webp"
                  alt="Aviator"
                  style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(167,139,250,0.2)', filter: 'grayscale(50%)' }}
                />
                <div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', fontWeight: '700', color: '#aaa', marginBottom: '2px' }}>Aviator</div>
                  <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '600' }}>Spribe</div>
                </div>
              </div>

              {/* Lucky Jet - Coming Soon */}
              <div
                style={{
                  flex: '0 0 auto',
                  minWidth: '180px',
                  background: 'linear-gradient(145deg, rgba(255,208,0,0.08), rgba(255,208,0,0.02))',
                  border: '2px solid rgba(255,208,0,0.2)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'not-allowed',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: 0.5
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,208,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.5';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(255,208,0,0.2)',
                  color: '#ffd000',
                  fontSize: '8px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  COMING SOON
                </div>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(255,208,0,0.2), rgba(255,208,0,0.05))',
                  border: '2px solid rgba(255,208,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  filter: 'grayscale(50%)'
                }}>
                  🚀
                </div>
                <div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', fontWeight: '700', color: '#aaa', marginBottom: '2px' }}>Lucky Jet</div>
                  <div style={{ fontSize: '10px', color: '#ffd000', fontWeight: '600' }}>1xBet</div>
                </div>
              </div>
            </div>
          </div>

          {activeNav === 'live' ? (
            /* ─── LIVE FEED PAGE ─── */
            <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
              <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px', letterSpacing: '1px' }}>{t.realTimeFeed}</h2>
                  <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.6' }}>{t.liveFeedDesc}</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="live-dot" style={{ background: '#00e5a0', boxShadow: '0 0 6px #00e5a0' }} />
                    <span style={{ fontSize: '12px', color: '#00e5a0', fontWeight: 'bold' }}>{t.websocketActive}</span>
                  </div>
                </div>
              </div>

              <div className="live-feed-grid">
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '16px', fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>{t.tableStatus}</th>
                        <th style={{ padding: '16px', fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>{t.tableGameId}</th>
                        <th style={{ padding: '16px', fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>{t.tableMultiplier}</th>
                        <th style={{ padding: '16px', fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>{t.tableTime}</th>
                        <th style={{ padding: '16px', fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600', textAlign: 'right' }}>{t.tableAiConfidence}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.slice(0, 15).map((r, i) => {
                        const isProcessing = i === 0 && !r.crash_point;
                        return (
                          <tr key={r.id || r.round_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: isProcessing ? 'rgba(0,212,255,0.03)' : 'transparent', transition: 'background 0.2s' }}>
                            <td style={{ padding: '16px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isProcessing ? '#00ffd5' : '#888', fontWeight: '600' }}>
                                {isProcessing ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />}
                                {isProcessing ? t.statusProcessing : t.statusSettled}
                              </span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '12px', fontFamily: 'monospace', color: '#ccc' }}>#{r.round_number}</td>
                            <td style={{ padding: '16px', fontSize: '16px', fontWeight: '800', fontFamily: 'monospace', color: r.crash_point >= 5 ? '#00e5a0' : r.crash_point >= 2 ? '#ffd000' : '#ff3366' }}>{Number(r.crash_point).toFixed(2)}x</td>
                            <td style={{ padding: '16px', fontSize: '12px', color: '#888' }}>{new Date(r.created_at).toLocaleTimeString()}</td>
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              {i === 0 && prediction ? (
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '4px 10px', borderRadius: '12px' }}>{prediction.confidence}%</span>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#555' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={14} color="#00ffd5" /> {t.systemStatus}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>{t.pingLatency}</span>
                        <strong style={{ fontSize: '14px', color: '#00e5a0', fontFamily: 'monospace' }}>{latency}ms</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>{t.eventsSec}</span>
                        <strong style={{ fontSize: '14px', color: '#fff', fontFamily: 'monospace' }}>{(rounds.length > 0 ? 0.8 + Math.random() * 0.4 : 0).toFixed(1)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>{t.uptime}</span>
                        <strong style={{ fontSize: '14px', color: '#fff', fontFamily: 'monospace' }}>99.9%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>{t.totalHandled}</span>
                        <strong style={{ fontSize: '14px', color: '#a78bfa', fontFamily: 'monospace' }}>{rounds.length > 0 ? (rounds.length * 142 + Math.floor(Math.random() * 100)).toLocaleString() : 0}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(145deg, rgba(167,139,250,0.05), transparent)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={14} /> {t.aiProcessingEngine}</div>
                    <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>{f(t.aiProcessingEngineDesc, { delay: latency + 12 })}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeNav === 'history' ? (
            /* ─── CRASH HISTORY PAGE ─── */
            <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px', letterSpacing: '1px' }}>{t.historyTitle}</h2>
                <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.6' }}>{t.historyDesc}</p>
              </div>

              {/* Stats Overview */}
              <div className="history-stats-grid">
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>{t.sessionAvg}</span>
                  <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: '800', color: '#fff' }}>{avg}x</span>
                </div>
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>{t.highestMultiplier}</span>
                  <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: '800', color: '#a78bfa' }}>{highest}x</span>
                </div>
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>{t.under2xHighRisk}</span>
                  <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: '800', color: '#ff3366' }}>{stats?.pUnder2 ?? 0}%</span>
                </div>
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>{t.over5xOpportunity}</span>
                  <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: '800', color: '#00e5a0' }}>{stats?.pOver5 ?? 0}%</span>
                </div>
              </div>

              {/* Advanced Analytics Panel */}
              <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', background: 'linear-gradient(145deg, rgba(255,255,255,0.02), transparent)' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={16} /> {t.advancedAnalytics}
                </div>
                <div className="analytics-grid">
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{t.volatilityIndex}</div>
                    <div style={{ fontSize: '18px', fontFamily: 'monospace', color: stats?.volatility === 'high' ? '#ff3366' : '#fff' }}>
                      {stats?.volatilityPct ?? 0}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{t.q3Quantile}</div>
                    <div style={{ fontSize: '18px', fontFamily: 'monospace', color: '#00e5a0' }}>
                      {stats?.q3 ? stats.q3.toFixed(2) : '0.00'}x
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{t.consecutiveUnder2x}</div>
                    <div style={{ fontSize: '18px', fontFamily: 'monospace', color: (stats?.currentLowStreak ?? 0) >= 4 ? '#ff3366' : '#fff' }}>
                      {stats?.currentLowStreak ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{t.medianCrash}</div>
                    <div style={{ fontSize: '18px', fontFamily: 'monospace', color: '#ffd000' }}>
                      {stats?.median ? stats.median.toFixed(2) : '0.00'}x
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribution Analysis */}
              <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#00ffd5', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={16} /> {lang === 'si' ? 'බෙදාහැරීම් විශ්ලේෂණය' : lang === 'ta' ? 'விநியோக பகுப்பாய்வு' : 'Distribution Analysis'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,51,102,0.08)', borderRadius: '12px', border: '1px solid rgba(255,51,102,0.2)' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'monospace', color: '#ff3366' }}>{displayedRounds.filter(r => r.crash_point < 1.5).length}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginTop: '4px' }}>&lt;1.5x Instant</div>
                    <div style={{ fontSize: '10px', color: '#ff3366', marginTop: '2px' }}>{displayedRounds.length > 0 ? Math.round((displayedRounds.filter(r => r.crash_point < 1.5).length / displayedRounds.length) * 100) : 0}%</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,51,102,0.05)', borderRadius: '12px', border: '1px solid rgba(255,51,102,0.15)' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'monospace', color: '#ff3366' }}>{displayedRounds.filter(r => r.crash_point >= 1.5 && r.crash_point < 2).length}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginTop: '4px' }}>1.5x - 2x Low</div>
                    <div style={{ fontSize: '10px', color: '#ff3366', marginTop: '2px' }}>{displayedRounds.length > 0 ? Math.round((displayedRounds.filter(r => r.crash_point >= 1.5 && r.crash_point < 2).length / displayedRounds.length) * 100) : 0}%</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,208,0,0.08)', borderRadius: '12px', border: '1px solid rgba(255,208,0,0.2)' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'monospace', color: '#ffd000' }}>{displayedRounds.filter(r => r.crash_point >= 2 && r.crash_point < 5).length}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginTop: '4px' }}>2x - 5x Medium</div>
                    <div style={{ fontSize: '10px', color: '#ffd000', marginTop: '2px' }}>{displayedRounds.length > 0 ? Math.round((displayedRounds.filter(r => r.crash_point >= 2 && r.crash_point < 5).length / displayedRounds.length) * 100) : 0}%</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,229,160,0.08)', borderRadius: '12px', border: '1px solid rgba(0,229,160,0.2)' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'monospace', color: '#00e5a0' }}>{displayedRounds.filter(r => r.crash_point >= 5 && r.crash_point < 10).length}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginTop: '4px' }}>5x - 10x High</div>
                    <div style={{ fontSize: '10px', color: '#00e5a0', marginTop: '2px' }}>{displayedRounds.length > 0 ? Math.round((displayedRounds.filter(r => r.crash_point >= 5 && r.crash_point < 10).length / displayedRounds.length) * 100) : 0}%</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(167,139,250,0.08)', borderRadius: '12px', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'monospace', color: '#a78bfa' }}>{displayedRounds.filter(r => r.crash_point >= 10).length}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginTop: '4px' }}>10x+ Mega</div>
                    <div style={{ fontSize: '10px', color: '#a78bfa', marginTop: '2px' }}>{displayedRounds.length > 0 ? Math.round((displayedRounds.filter(r => r.crash_point >= 10).length / displayedRounds.length) * 100) : 0}%</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Chart with Controls */}
              <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} color="#00ffd5" /> {lang === 'si' ? 'වැඩිදියුණු කළ ප්‍රස්ථාරය' : lang === 'ta' ? 'மேம்படுத்தப்பட்ட வரைபடம்' : 'Enhanced Chart'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Chart Type Selector */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
                      {(['area', 'line', 'bar'] as ChartType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => setChartType(type)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: chartType === type ? 'rgba(0,255,213,0.2)' : 'transparent',
                            color: chartType === type ? '#00ffd5' : '#888',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textTransform: 'capitalize'
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    {/* Time Range Selector */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
                      {(['1h', '6h', '24h', '7d', 'all'] as TimeRange[]).map(range => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: timeRange === range ? 'rgba(0,255,213,0.2)' : 'transparent',
                            color: timeRange === range ? '#00ffd5' : '#888',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase'
                          }}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div style={{ width: '100%', height: '350px' }}>
                  {displayedRounds.length > 1 && (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={chartData} margin={{ top: 6, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCrashHistory" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00ffd5" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#00ffd5" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} minTickGap={20} />
                          <YAxis tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(15,17,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                            formatter={(value: any, name: any, props: any) => [`${value}x`, `Round ${props.payload.name}`]}
                            labelFormatter={(label) => `Time: ${label}`}
                          />
                          <Area type="monotone" dataKey="crash" stroke="#00ffd5" strokeWidth={2} fillOpacity={1} fill="url(#colorCrashHistory)" dot={{ r: 3, fill: '#00ffd5', strokeWidth: 1, stroke: 'rgba(255,255,255,0.2)' }} activeDot={{ r: 6, fill: '#00ffd5', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                      ) : chartType === 'line' ? (
                        <AreaChart data={chartData} margin={{ top: 6, right: 10, left: -25, bottom: 0 }}>
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} minTickGap={20} />
                          <YAxis tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(15,17,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                            formatter={(value: any, name: any, props: any) => [`${value}x`, `Round ${props.payload.name}`]}
                            labelFormatter={(label) => `Time: ${label}`}
                          />
                          <Area type="monotone" dataKey="crash" stroke="#00ffd5" strokeWidth={2} fillOpacity={0} dot={{ r: 3, fill: '#00ffd5', strokeWidth: 1, stroke: 'rgba(255,255,255,0.2)' }} activeDot={{ r: 6, fill: '#00ffd5', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                      ) : (
                        <AreaChart data={chartData} margin={{ top: 6, right: 10, left: -25, bottom: 0 }}>
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} minTickGap={20} />
                          <YAxis tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(15,17,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                            formatter={(value: any, name: any, props: any) => [`${value}x`, `Round ${props.payload.name}`]}
                            labelFormatter={(label) => `Time: ${label}`}
                          />
                          <Area type="monotone" dataKey="crash" stroke="#00ffd5" strokeWidth={0} fillOpacity={0.8} fill="#00ffd5" dot={{ r: 4, fill: '#00ffd5', strokeWidth: 1, stroke: 'rgba(255,255,255,0.2)' }} activeDot={{ r: 6, fill: '#00ffd5', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="chart-legend" style={{ marginTop: '12px' }}>
                  <span className="dot green" /> ≥5x
                  <span className="dot yellow" /> 2–5x
                  <span className="dot red" /> &lt;2x
                </div>
              </div>

              {/* Last 50 Rounds Enhanced Section */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="#00ffd5" /> {lang === 'si' ? 'අවසන් වට 50 ක්' : lang === 'ta' ? 'கடைசி 50 சுற்றுகள்' : 'Last 50 Rounds'}
                    <span style={{ fontSize: '10px', color: '#888', fontWeight: '500', textTransform: 'none' }}>
                      ({displayedRounds.length} {lang === 'si' ? 'ප්‍රතිඵල' : lang === 'ta' ? 'முடிவுகள்' : 'results'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Filter Selector */}
                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value as FilterBy)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="all" style={{ background: '#0f111a' }}>{lang === 'si' ? 'සියල්ල' : lang === 'ta' ? 'அனைத்தும்' : 'All'}</option>
                      <option value="safe" style={{ background: '#0f111a' }}>{lang === 'si' ? 'ආරක්ෂිත (2-5x)' : lang === 'ta' ? 'பாதுகாப்பான (2-5x)' : 'Safe (2-5x)'}</option>
                      <option value="risk" style={{ background: '#0f111a' }}>{lang === 'si' ? 'අවදානම් (5x+)' : lang === 'ta' ? 'ஆபத்தான (5x+)' : 'Risk (5x+)'}</option>
                      <option value="high" style={{ background: '#0f111a' }}>{lang === 'si' ? 'ඉහළ අවදානම් (&lt;2x)' : lang === 'ta' ? 'அதிக ஆபத்து (&lt;2x)' : 'High Risk (&lt;2x)'}</option>
                    </select>
                    {/* Sort Selector */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="newest" style={{ background: '#0f111a' }}>{lang === 'si' ? 'නවතම' : lang === 'ta' ? 'சமீபத்திய' : 'Newest'}</option>
                      <option value="oldest" style={{ background: '#0f111a' }}>{lang === 'si' ? 'පැරණිතම' : lang === 'ta' ? 'பழமையான' : 'Oldest'}</option>
                      <option value="highest" style={{ background: '#0f111a' }}>{lang === 'si' ? 'ඉහළම' : lang === 'ta' ? 'அதிகபட்சம்' : 'Highest'}</option>
                      <option value="lowest" style={{ background: '#0f111a' }}>{lang === 'si' ? 'අඩුම' : lang === 'ta' ? 'குறைந்தபட்சம்' : 'Lowest'}</option>
                    </select>
                  </div>
                </div>

                {/* Rounds Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                  {displayedRounds.map((r) => {
                    const color = r.crash_point < 2 ? '#ff3366' : r.crash_point < 5 ? '#ffd000' : '#00e5a0';
                    const bg = r.crash_point < 2 ? 'rgba(255,51,102,0.1)' : r.crash_point < 5 ? 'rgba(255,208,0,0.1)' : 'rgba(0,229,160,0.1)';
                    return (
                      <div
                        key={r.id || r.round_number}
                        onClick={() => { setSelectedRound(r); setShowRoundModal(true); }}
                        style={{
                          background: bg,
                          border: `1px solid ${color}40`,
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'monospace', color }}>{Number(r.crash_point).toFixed(2)}x</span>
                        <span style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>#{r.round_number}</span>
                        <span style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{timeAgo(r.created_at, t)}</span>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          {r.crash_point >= 10 && <Flame size={10} style={{ color: '#ff3366' }} />}
                          {r.crash_point >= 5 && r.crash_point < 10 && <Target size={10} style={{ color: '#00e5a0' }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {processedRounds.length > displayCount && (
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      onClick={() => setDisplayCount(prev => Math.min(prev + 50, processedRounds.length))}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,255,213,0.3)',
                        background: 'rgba(0,255,213,0.1)',
                        color: '#00ffd5',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {lang === 'si' ? 'තවත් පෙන්වන්න' : lang === 'ta' ? 'மேலும் காட்டு' : 'Load More'} ({processedRounds.length - displayCount} {lang === 'si' ? 'ඉතිරි' : lang === 'ta' ? 'மீதமுள்ள' : 'remaining'})
                    </button>
                  </div>
                )}
              </div>

              {/* Round Detail Modal */}
              {showRoundModal && selectedRound && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                  }}
                  onClick={() => setShowRoundModal(false)}
                >
                  <div
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--border2)',
                      borderRadius: '16px',
                      padding: '32px',
                      maxWidth: '500px',
                      width: '100%',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>
                        {lang === 'si' ? 'වට විස්තරය' : lang === 'ta' ? 'சுற்று விவரம்' : 'Round Details'}
                      </h3>
                      <button
                        onClick={() => setShowRoundModal(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'center', padding: '20px', background: `${selectedRound.crash_point < 2 ? 'rgba(255,51,102,0.1)' : selectedRound.crash_point < 5 ? 'rgba(255,208,0,0.1)' : 'rgba(0,229,160,0.1)'}`, borderRadius: '12px', border: `1px solid ${selectedRound.crash_point < 2 ? '#ff336640' : selectedRound.crash_point < 5 ? '#ffd00040' : '#00e5a040'}` }}>
                        <div style={{ fontSize: '42px', fontWeight: '900', fontFamily: 'monospace', color: selectedRound.crash_point < 2 ? '#ff3366' : selectedRound.crash_point < 5 ? '#ffd000' : '#00e5a0' }}>
                          {Number(selectedRound.crash_point).toFixed(2)}x
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Crash Point</div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Round #</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>#{selectedRound.round_number}</div>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Risk Level</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: selectedRound.crash_point < 2 ? '#ff3366' : selectedRound.crash_point < 5 ? '#ffd000' : '#00e5a0' }}>
                            {selectedRound.crash_point < 2 ? 'HIGH' : selectedRound.crash_point < 5 ? 'MEDIUM' : 'LOW'}
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Time</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                            {new Date(selectedRound.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Time Ago</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                            {timeAgo(selectedRound.created_at, t)}
                          </div>
                        </div>

                        {selectedRound.player_count !== undefined && selectedRound.player_count !== null && (
                          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Players (Bets)</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>
                              {selectedRound.player_count}
                            </div>
                          </div>
                        )}
                        {selectedRound.total_bet_volume !== undefined && selectedRound.total_bet_volume !== null && (
                          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Total Volume</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>
                              {Number(selectedRound.total_bet_volume).toLocaleString()} LKR
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Full Timestamp</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff', fontFamily: 'monospace' }}>
                          {new Date(selectedRound.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeNav === 'patterns' ? (
            /* ─── PATTERNS PAGE ─── */
            <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px', letterSpacing: '1px' }}>{t.patternsTitle}</h2>
                <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.6' }}>{t.patternsDesc}</p>
              </div>

              {/* Partners Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                {[
                  { name: '1xBet', color: '#00d4ff', desc: lang === 'si' ? 'තථ්‍ය කාලීන දත්ත ග්‍රහණය සහිත ප්‍රධාන ක්‍රෑෂ් ක්‍රීඩාව' : lang === 'ta' ? 'நிகழ்நேர தரவு பிடிப்புடன் கூடிய முதன்மை கிராஷ் விளையாட்டு' : 'Primary crash game with real-time data capture', status: 'ACTIVE' },
                  { name: 'Aviator', color: '#a78bfa', desc: lang === 'si' ? 'Spribe Aviator ගුණක ලුහුබැඳීම' : lang === 'ta' ? 'Spribe Aviator பெருக்கிகள் கண்காணிப்பு' : 'Spribe Aviator multipliers tracking', status: 'ACTIVE' },
                  { name: 'Lucky Jet', color: '#00e5a0', desc: lang === 'si' ? 'Lucky Jet ක්‍රෑෂ් රටා විශ්ලේෂණය' : lang === 'ta' ? 'Lucky Jet கிராஷ் வடிவ பகுப்பாய்வு' : 'Lucky Jet crash pattern analysis', status: 'ACTIVE' },
                  { name: 'JetX', color: '#ffc84a', desc: lang === 'si' ? 'SmartSoft Gaming රටා හඳුනාගැනීම' : lang === 'ta' ? 'SmartSoft Gaming வடிவ அங்கீகாரம்' : 'SmartSoft Gaming pattern recognition', status: 'BETA' },
                  { name: 'Crash X', color: '#ff3366', color2: '#ff6b8a', desc: lang === 'si' ? 'Turbo Games ක්‍රෑෂ් දත්ත එකතු කිරීම' : lang === 'ta' ? 'Turbo Games கிராஷ் தரவு சேகரிப்பு' : 'Turbo Games crash data collection', status: 'COMING' },
                  { name: 'Spaceman', color: '#00ffd5', desc: lang === 'si' ? 'Pragmatic Play ක්‍රෑෂ් විශ්ලේෂණ' : lang === 'ta' ? 'Pragmatic Play கிராஷ் பகுப்பாய்வு' : 'Pragmatic Play crash analytics', status: 'COMING' },
                ].map((partner, i) => (
                  <div key={i} className="glass-card" style={{ padding: '20px', border: `1px solid ${partner.color}30`, transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = partner.color + '60'; e.currentTarget.style.boxShadow = `0 8px 32px ${partner.color}15`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = partner.color + '30'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `linear-gradient(135deg, ${partner.color}20, ${partner.color}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${partner.color}30` }}>
                        <span style={{ fontSize: '18px' }}>🎮</span>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '700', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '1px', padding: '3px 10px', borderRadius: '20px', background: partner.status === 'ACTIVE' ? 'rgba(0,229,160,0.15)' : partner.status === 'BETA' ? 'rgba(255,200,74,0.15)' : 'rgba(136,136,136,0.15)', color: partner.status === 'ACTIVE' ? '#00e5a0' : partner.status === 'BETA' ? '#ffc84a' : '#888' }}>
                        {partner.status}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{partner.name}</h3>
                    <p style={{ fontSize: '11px', color: '#888', lineHeight: '1.5' }}>{partner.desc}</p>
                  </div>
                ))}
              </div>

              {/* How It Works */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '16px', letterSpacing: '0.5px' }}>{t.howItWorks}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {[
                    { step: '01', icon: <Activity size={24} />, title: t.step1Title, desc: t.step1Desc, color: '#00d4ff' },
                    { step: '02', icon: <BarChart3 size={24} />, title: t.step2Title, desc: t.step2Desc, color: '#a78bfa' },
                    { step: '03', icon: <Bot size={24} />, title: t.step3Title, desc: t.step3Desc, color: '#00e5a0' },
                    { step: '04', icon: <Target size={24} />, title: t.step4Title, desc: t.step4Desc, color: '#ffc84a' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontFamily: "'Rajdhani', sans-serif", fontSize: '64px', fontWeight: '900', color: `${item.color}08`, lineHeight: 1 }}>{item.step}</div>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, marginBottom: '14px' }}>
                        {item.icon}
                      </div>
                      <h4 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{item.title}</h4>
                      <p style={{ fontSize: '11px', color: '#888', lineHeight: '1.5' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pattern Detection */}
              <div>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '16px', letterSpacing: '0.5px' }}>{t.detectedPatterns}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {[
                    { name: lang === 'si' ? 'ක්ෂණික ක්‍රෑෂ් ධාරාව' : lang === 'ta' ? 'உடனடி கிராஷ் தொடர்' : 'Instant Crash Streak', desc: lang === 'si' ? '1.2x ට අඩු වට කිහිපයක් අඛණ්ඩව සිදුවීම' : lang === 'ta' ? 'தொடர்ச்சியாக 1.2x கீழ் பல சுற்றுகள்' : 'Multiple rounds below 1.2x in sequence', risk: t.riskHigh, color: '#ff3366' },
                    { name: lang === 'si' ? 'යථා තත්ත්වයට පත්වීමේ රැල්ල' : lang === 'ta' ? 'மீட்பு எழுச்சி' : 'Recovery Surge', desc: lang === 'si' ? 'ක්‍රෑෂ් වට කිහිපයකට පසු ඉහළ ගුණක ලැබීම' : lang === 'ta' ? 'கிராஷ் சுற்றுகளுக்குப் பிறகு அதிக பெருக்கிகள்' : 'High multipliers following crash clusters', risk: t.riskLow, color: '#00e5a0' },
                    { name: lang === 'si' ? 'අස්ථාවර උච්චාවචනය' : lang === 'ta' ? 'ஏற்ற இறக்க அலைவு' : 'Volatile Oscillation', desc: lang === 'si' ? 'ඉහළ සහ අඩු ක්‍රෑෂ් අගයන් මාරුවෙන් මාරුවට සිදුවීම' : lang === 'ta' ? 'மாறிமாறி வரும் அதிக/குறைந்த கிராஷ் புள்ளிகள்' : 'Alternating high/low crash points', risk: t.riskMedium, color: '#ffd000' },
                    { name: lang === 'si' ? 'ස්ථාවර තලාව' : lang === 'ta' ? 'நிலையான சமவெளி' : 'Stable Plateau', desc: lang === 'si' ? '2x ත් 4x ත් අතර ස්ථාවර ගුණක පරාසයක්' : lang === 'ta' ? 'நிலையான 2x-4x கிராஷ் வரம்பு' : 'Consistent 2x-4x crash range', risk: t.riskLow, color: '#00e5a0' },
                    { name: lang === 'si' ? 'මහා ජයග්‍රහණ පොකුර' : lang === 'ta' ? 'மெகா ஹிட் கிளஸ்டர்' : 'Mega Hit Cluster', desc: lang === 'si' ? 'කෙටි කාලයක් තුළ 10x+ වට කිහිපයක් සිදුවීම' : lang === 'ta' ? 'குறுகிய காலத்தில் பல 10x+ சுற்றுகள்' : 'Multiple 10x+ rounds in short window', risk: lang === 'si' ? 'අවස්ථාවක්' : lang === 'ta' ? 'வாய்ப்பு' : 'OPPORTUNITY', color: '#a78bfa' },
                  ].map((pattern, i) => (
                    <div key={i} className="glass-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: pattern.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', fontWeight: '700', color: '#fff' }}>{pattern.name}</div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{pattern.desc}</div>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '700', fontFamily: "'Rajdhani', sans-serif", padding: '3px 10px', borderRadius: '20px', background: `${pattern.color}15`, color: pattern.color, border: `1px solid ${pattern.color}30` }}>
                        {pattern.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ─── DEFAULT DASHBOARD ─── */
            <>
              {/* ─── TOP ROW: Performance Stats Header ─── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'si' ? 'කාර්යසාධන සංඛ්‍යාලේඛන' : lang === 'ta' ? 'செயல்திறன் புள்ளிவிவரங்கள்' : 'Performance Stats'}
                  </span>
                  {/* Signal Quality Trust Badge */}
                  {winRate.signalQuality && winRate.signalQuality !== 'INSUFFICIENT' && (() => {
                    const sq = winRate.signalQuality!;
                    const sqColor = sq === 'STRONG' ? '#00e5a0' : sq === 'MODERATE' ? '#ffd000' : '#ff3366';
                    const sqBg = sq === 'STRONG' ? 'rgba(0,229,160,0.12)' : sq === 'MODERATE' ? 'rgba(255,208,0,0.12)' : 'rgba(255,51,102,0.12)';
                    const sqLabel = sq === 'STRONG'
                      ? (lang === 'si' ? '✦ ශක්තිමත් සංඥාව' : lang === 'ta' ? '✦ வலுவான சமிக்ஞை' : '✦ STRONG SIGNAL')
                      : sq === 'MODERATE'
                      ? (lang === 'si' ? '◈ මධ්‍යස්ථ සංඥාව' : lang === 'ta' ? '◈ மிதமான சமிக்ஞை' : '◈ MODERATE')
                      : (lang === 'si' ? '⚠ ප්‍රවේශමෙන්' : lang === 'ta' ? '⚠ கவனமாக இருங்கள்' : '⚠ CAUTION');
                    return (
                      <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', background: sqBg, color: sqColor, border: `1px solid ${sqColor}30`, letterSpacing: '0.5px', fontFamily: "'Rajdhani', sans-serif" }}>
                        {sqLabel}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Window Tabs */}
                  {(['24h', '7d', 'all'] as const).map(w => (
                    <button key={w} onClick={() => setStatsWindow(w)} style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', border: `1px solid ${statsWindow === w ? '#a78bfa' : 'rgba(255,255,255,0.08)'}`, background: statsWindow === w ? 'rgba(167,139,250,0.15)' : 'transparent', color: statsWindow === w ? '#a78bfa' : '#555', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {w === '24h' ? (lang === 'si' ? '24ව' : lang === 'ta' ? '24ம' : '24H') : w === '7d' ? (lang === 'si' ? '7ද' : lang === 'ta' ? '7நா' : '7D') : (lang === 'si' ? 'සියලු' : lang === 'ta' ? 'அனைத்தும்' : 'ALL')}
                    </button>
                  ))}
                  <button onClick={() => setShowMobileStatsPanel(!showMobileStatsPanel)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                    {showMobileStatsPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {showMobileStatsPanel && (() => {
                // Pick the correct data window
                const w = statsWindow === '24h' ? winRate.last24h : statsWindow === '7d' ? winRate.last7d : winRate.allTime;
                const evVal = w?.realizedEv ?? 0;
                const evColor = evVal > 0 ? '#00e5a0' : evVal < 0 ? '#ff3366' : '#ffd000';
                const evBg = evVal > 0 ? 'rgba(0,229,160,0.12)' : evVal < 0 ? 'rgba(255,51,102,0.12)' : 'rgba(255,208,0,0.12)';
                const evStr = w ? (evVal >= 0 ? '+' : '') + evVal.toFixed(3) : 'N/A';
                const wrVal = w?.winRate ?? 0;
                const wrColor = wrVal >= 65 ? '#00e5a0' : wrVal >= 50 ? '#ffd000' : '#ff3366';
                const windowLabel = statsWindow === '24h'
                  ? (lang === 'si' ? 'පසුගිය 24 පැය' : lang === 'ta' ? 'கடந்த 24 மணி' : 'Last 24 Hours')
                  : statsWindow === '7d'
                  ? (lang === 'si' ? 'පසුගිය දින 7' : lang === 'ta' ? 'கடந்த 7 நாட்கள்' : 'Last 7 Days')
                  : (lang === 'si' ? 'සියලු කාලය' : lang === 'ta' ? 'எல்லா நேரமும்' : 'All Time');
                const noData = !w || w.total === 0;

                return (
                  <div className="stat-strip">
                    {/* Session Avg */}
                    <div className="stat-card2">
                      <div className="sc2-icon" style={{ background: 'rgba(0,229,160,0.12)', color: '#00e5a0' }}><BarChart3 size={18} /></div>
                      <div>
                        <div className="sc2-label">{t.sessionAvg}</div>
                        <div className="sc2-val">{avg}x</div>
                      </div>
                    </div>

                    {/* AI Win Rate — windowed */}
                    <div className="stat-card2">
                      <div className="sc2-icon" style={{ background: noData ? 'rgba(255,255,255,0.05)' : (wrVal >= 65 ? 'rgba(0,229,160,0.12)' : wrVal >= 50 ? 'rgba(255,208,0,0.12)' : 'rgba(255,51,102,0.12)'), color: noData ? '#555' : wrColor }}><CheckCircle2 size={18} /></div>
                      <div>
                        <div className="sc2-label">
                          {lang === 'si' ? 'AI සාර්ථකත්වය' : lang === 'ta' ? 'AI வெற்றி விகிதம்' : 'AI Win Rate'}
                        </div>
                        <div className="sc2-val" style={{ color: noData ? '#555' : wrColor }}>
                          {noData ? 'N/A' : `${wrVal}%`}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                          {noData
                            ? (lang === 'si' ? 'දත්ත නැත' : lang === 'ta' ? 'தரவு இல்லை' : 'No data yet')
                            : `${w!.correct}/${w!.total} · ${windowLabel}`}
                        </div>
                      </div>
                    </div>

                    {/* Realized EV — windowed */}
                    <div className="stat-card2">
                      <div className="sc2-icon" style={{ background: noData ? 'rgba(255,255,255,0.05)' : evBg, color: noData ? '#555' : evColor }}><Coins size={18} /></div>
                      <div>
                        <div className="sc2-label">{lang === 'si' ? 'EV / ඔට්ටුව' : lang === 'ta' ? 'EV / பந்தயம்' : 'Realized EV / Bet'}</div>
                        <div className="sc2-val" style={{ color: noData ? '#555' : evColor }}>{noData ? 'N/A' : evStr}</div>
                        {!noData && (
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', lineHeight: '1.2' }}>
                            {evVal >= 0
                              ? (lang === 'si' ? `1කට +රු.${evVal.toFixed(2)}` : lang === 'ta' ? `ஒவ்வொன்றிலும் +₹${evVal.toFixed(2)}` : `+$${evVal.toFixed(2)} per $1 bet`)
                              : (lang === 'si' ? `1කට -රු.${Math.abs(evVal).toFixed(2)}` : lang === 'ta' ? `ஒவ்வொன்றிலும் -₹${Math.abs(evVal).toFixed(2)}` : `-$${Math.abs(evVal).toFixed(2)} per $1 bet`)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Bets — windowed */}
                    <div className="stat-card2">
                      <div className="sc2-icon" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}><Activity size={18} /></div>
                      <div>
                        <div className="sc2-label">{lang === 'si' ? 'ඔට්ටු' : lang === 'ta' ? 'பந்தயங்கள்' : 'Bets'}</div>
                        <div className="sc2-val" style={{ color: '#a78bfa' }}>{noData ? '0' : w!.total}</div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{windowLabel}</div>
                      </div>
                    </div>

                    {/* Instant Floor */}
                    <div className="stat-card2">
                      <div className="sc2-icon" style={{ background: 'rgba(255,51,102,0.12)', color: '#ff3366' }}><AlertOctagon size={18} /></div>
                      <div>
                        <div className="sc2-label">{lang === 'si' ? 'ක්ෂණික ක්‍රෑෂ් (≤1.01)' : lang === 'ta' ? 'உடனடி கிராஷ் (≤1.01)' : 'Instant Floor (≤1.01)'}</div>
                        <div className="sc2-val" style={{ color: '#ff3366' }}>{stats?.pInstantCrash !== undefined ? stats.pInstantCrash.toFixed(1) + '%' : '0.0%'}</div>
                      </div>
                    </div>

                    {/* Avg Target */}
                    <div className="stat-card2">
                      <div className="sc2-icon" style={{ background: 'rgba(0,255,213,0.12)', color: '#00ffd5' }}><Target size={18} /></div>
                      <div>
                        <div className="sc2-label">{lang === 'si' ? 'සාමාන්‍ය ඉලක්කය' : lang === 'ta' ? 'சராசரி இலக்கு' : 'Avg Target'}</div>
                        <div className="sc2-val" style={{ color: '#00ffd5' }}>{w?.avgTarget ? w.avgTarget.toFixed(2) + 'x' : 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}


              {/* Segmented Controller (Mobile only) */}
              <div className="mobile-dash-tabs hide-on-desktop">
                <button
                  className={`mobile-dash-tab-btn ${dashTab === 'signals' ? 'active' : ''}`}
                  onClick={() => setDashTab('signals')}
                >
                  {lang === 'si' ? 'AI සංඥා' : lang === 'ta' ? 'AI சமிக்ஞைகள்' : 'AI Signals'}
                </button>
                <button
                  className={`mobile-dash-tab-btn ${dashTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setDashTab('stats')}
                >
                  {lang === 'si' ? 'වෙළඳපල විශ්ලේෂණ' : lang === 'ta' ? 'சந்தை பகுப்பாய்வு' : 'Market Analytics'}
                </button>
              </div>

              {/* ─── MAIN GRID ─── */}
              <div className="main-grid2">

                {/* ─── LEFT COLUMN ─── */}
                <div className={`left-col2 ${dashTab === 'signals' ? 'mobile-visible' : 'mobile-hidden'}`}>

                  {/* Bet Signal Hero Card */}
                  {prediction && stratMeta ? (
                    <div className="hero-banner-3d" style={{ borderColor: stratMeta.color + '60', display: 'flex', flexDirection: 'column' }} ref={heroRef}>
                      <div className="hero-grid-overlay" />
                      <div className="hero-banner-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
                        <div style={{ color: stratMeta.color, transform: 'scale(1.8)', marginLeft: '10px', flexShrink: 0 }}>{stratMeta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="hero-banner-title" style={{ color: stratMeta.color, fontSize: '16px' }}>{stratMeta.label}</div>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {prediction.strategy_reason || prediction.skip_reason || (lang === 'si' ? 'AI උපායමාර්ගය ක්‍රියාත්මකයි.' : lang === 'ta' ? 'AI உத்தி செயலில் உள்ளது.' : 'AI strategy active.')}
                          </div>
                          <div className="hc2-vol-row" style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className={`vol-badge vol-${stats?.volatility ?? 'normal'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                              {stats?.volatility?.toUpperCase() ?? 'NORMAL'} VOL
                            </span>
                            <span className="hc2-trend" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              {stats?.trend === 'rising' ? <TrendingUp size={12} color="#00e5a0" /> : stats?.trend === 'falling' ? <TrendingDown size={12} color="#ff3366" /> : <Minus size={12} color="#888" />}
                              {stats?.trend?.toUpperCase() ?? 'FLAT'}
                            </span>
                          </div>
                        </div>

                        {/* Compact SNAP Score™ Gauge directly on the right, before the target */}
                        {prediction.stability_analysis && (() => {
                          const displayStabilityIndex = prediction.stability_analysis.holdScore !== undefined
                            ? (100 - prediction.stability_analysis.holdScore)
                            : (prediction.stability_analysis.stability_index ?? 50);
                          return (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              width: '100px',
                              flexShrink: 0,
                              padding: '6px 8px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              position: 'relative'
                            }}>
                              <div style={{
                                fontSize: '8px',
                                fontWeight: '900',
                                color: '#94a3b8',
                                fontFamily: "'Rajdhani', sans-serif",
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%'
                              }}>
                                <span>STABILITY</span>
                                <span style={{ color: '#00ffd5', fontWeight: '900' }}>{displayStabilityIndex}%</span>
                              </div>
                              <div style={{ position: 'relative', width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>
                                <div style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: `${displayStabilityIndex}%`,
                                  background: 'linear-gradient(90deg, #ff3366 0%, #ffd000 50%, #00e575 100%)',
                                  borderRadius: '3px',
                                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                }} />
                                <div style={{
                                  position: 'absolute',
                                  left: `${displayStabilityIndex}%`,
                                  top: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ffffff',
                                  border: '1.5px solid #a78bfa',
                                  boxShadow: '0 0 4px #a78bfa',
                                  transition: 'left 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                }} />
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%',
                                fontSize: '7px',
                                color: '#64748b',
                                fontWeight: '700',
                                marginTop: '3px',
                                fontFamily: "'Rajdhani', sans-serif"
                              }}>
                                <span>VOLATILE</span>
                                <span>STABLE</span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="hero-banner-target-container" style={{ flexShrink: 0 }}>
                          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>{lang === 'si' ? 'ඉලක්කය' : lang === 'ta' ? 'இலக்கு' : 'Target'}</div>
                          {prediction.should_bet && prediction.cashout_target && prediction.cashout_target > 0 ? (
                            <div className="hero-banner-target" style={{ color: stratMeta.color, fontSize: '32px' }}>
                              {Number(prediction.cashout_target).toFixed(2)}x
                            </div>
                          ) : (
                            <div style={{ color: '#ff3366', fontSize: '26px', fontWeight: '900', marginTop: '4px' }}>{lang === 'si' ? 'රැඳී සිටින්න' : lang === 'ta' ? 'காத்திருக்கவும்' : 'WAIT'}</div>
                          )}
                        </div>
                      </div>
                      </div>
                  ) : (
                    <div className="hero-banner-3d" ref={heroRef} style={{ minHeight: '120px', display: 'flex', alignItems: 'center' }}>
                      <div className="hero-grid-overlay" />
                      <div className="hero-banner-content" style={{ width: '100%' }}>
                        <div className="spin" style={{ color: '#00ffd5', flexShrink: 0 }}><Orbit size={28} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#00ffd5', letterSpacing: '3px', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', marginBottom: '6px' }}>⚡ {t.neuralEngineLoading}</div>
                          <div style={{ fontSize: '12px', color: '#6b7fa3', lineHeight: '1.6' }}>
                            {rounds.length > 0 ? f(t.neuralEngineProcessing, { count: rounds.length }) : t.neuralEngineLiveStream}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                            {[lang === 'si' ? 'රටා විශ්ලේෂණය' : lang === 'ta' ? 'வடிவ பகுப்பாய்வு' : 'Pattern Analysis', lang === 'si' ? 'අනුක්‍රමික පරිලෝකනය' : lang === 'ta' ? 'வரிசை ஸ்கேன்' : 'Sequence Scan', lang === 'si' ? 'අවදානම් ලකුණු කිරීම' : lang === 'ta' ? 'அபாய மதிப்பீடு' : 'Risk Scoring'].map((label, i) => (
                              <span key={i} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(0,255,213,0.07)', color: '#00ffd5', border: '1px solid rgba(0,255,213,0.2)', letterSpacing: '0.5px' }}>{label}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Prediction Panel */}
                  <div className={`glass-card pred-card2 ${prediction ? `pred-${RISK_COLOR[prediction.risk]}` : ''}`}>
                    <div className="pc2-header responsive-header">
                      <div className="pc2-title">
                        <Bot size={16} color="#a78bfa" style={{ flexShrink: 0 }} />
                        <span className="pc2-title-text">{t.aiCoachTitle}</span>
                      </div>
                      <span className={`pred-status ${predStatus}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        {predStatus === 'predicting' ? <><RefreshCw size={11} className="spin" /> {t.analyzingDot}</> : predStatus === 'done' ? <><CheckCircle2 size={11} /> {t.ready}</> : t.waiting}
                      </span>
                    </div>

                    {prediction?.ai_model_used && predStatus === 'done' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <span className={`risk-badge risk-${RISK_COLOR[prediction.risk]}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 12px', fontSize: '11px', fontWeight: '700', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.5px' }}>
                          {prediction.risk === 'HIGH' ? <AlertTriangle size={12} /> : prediction.risk === 'MEDIUM' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                          {prediction.risk === 'HIGH' ? t.riskHigh : prediction.risk === 'MEDIUM' ? t.riskMedium : t.riskLow}
                        </span>
                        <span className="badge-pill" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)', fontWeight: '600', fontFamily: "'Rajdhani', sans-serif" }}>
                          <Bot size={12} /> {t.aiCoachBadge}
                        </span>
                        {prediction.volatility_phase && (
                          <span className="badge-pill" style={{
                            color: prediction.volatility_phase === 'CALM' ? '#00e5a0' : prediction.volatility_phase === 'VOLATILE' ? '#ff3366' : '#ffd000',
                            background: prediction.volatility_phase === 'CALM' ? 'rgba(0,229,160,0.1)' : prediction.volatility_phase === 'VOLATILE' ? 'rgba(255,51,102,0.1)' : 'rgba(255,208,0,0.1)',
                            fontWeight: '600', fontFamily: "'Rajdhani', sans-serif"
                          }}>
                            <BarChart3 size={12} /> {
                              lang === 'si' ? (prediction.volatility_phase === 'CALM' ? 'නිශ්චල' : prediction.volatility_phase === 'VOLATILE' ? 'අස්ථාවර' : 'සාමාන්‍ය') :
                              lang === 'ta' ? (prediction.volatility_phase === 'CALM' ? 'அமைதி' : prediction.volatility_phase === 'VOLATILE' ? 'ஏற்ற இறக்கம்' : 'சாதாரண') :
                              prediction.volatility_phase
                            }
                          </span>
                        )}
                        {prediction.should_bet && prediction.recommended_stake_pct && (
                          <span className="badge-pill" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)', fontWeight: '600', fontFamily: "'Rajdhani', sans-serif" }}>
                            <Target size={12} /> {f(t.betPercent, { pct: prediction.recommended_stake_pct })}
                          </span>
                        )}
                      </div>
                    )}

                    {predStatus === 'predicting' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', padding: '8px 12px', background: 'rgba(167,139,250,0.08)', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.15)' }}>
                        <RefreshCw size={14} className="spin" style={{ color: '#a78bfa' }} />
                        <span style={{ color: '#a78bfa', fontSize: '11px', fontWeight: '600', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.5px' }}>{t.analyzingCap}</span>
                      </div>
                    )}

                    {prediction && stats ? (
                      <>
                        {/* Confidence bar removed per request */}

                        {prediction.instant_crash_risk !== undefined && prediction.instant_crash_risk >= 30 && (
                          <>
                            <style>{`
                              @keyframes pulse-border {
                                0% { border-color: rgba(239, 68, 68, 0.3); box-shadow: 0 0 10px rgba(239, 68, 68, 0.05); }
                                100% { border-color: rgba(239, 68, 68, 0.85); box-shadow: 0 0 20px rgba(239, 68, 68, 0.25); }
                              }
                              @keyframes pulse-scale {
                                0% { transform: scale(1); }
                                100% { transform: scale(1.15); }
                              }
                              @keyframes shake-skull {
                                0% { transform: rotate(-8deg); }
                                100% { transform: rotate(8deg); }
                              }
                            `}</style>
                            <div className="instant-crash-alert-card" style={{
                              background: 'rgba(239, 68, 68, 0.09)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              borderRadius: '10px',
                              padding: '12px 14px',
                              marginBottom: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              animation: 'pulse-border 2s infinite alternate'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(239, 68, 68, 0.18)',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                flexShrink: 0,
                                animation: 'pulse-scale 1.5s infinite alternate'
                              }}>
                                <Skull size={18} color="#ef4444" style={{ animation: 'shake-skull 0.3s infinite alternate' }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  color: '#ef4444',
                                  fontWeight: '800',
                                  fontSize: '11px',
                                  letterSpacing: '0.7px',
                                  textTransform: 'uppercase',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontFamily: "'Rajdhani', sans-serif"
                                }}>
                                  💀 {lang === 'si' ? 'ක්ෂණික බිඳවැටීමේ අවදානම' : lang === 'ta' ? 'உடனடி விபத்து எச்சரிக்கை' : 'INSTANT CRASH WARNING'}
                                  <span style={{
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: '9px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '900',
                                    marginLeft: 'auto'
                                  }}>
                                    {prediction.instant_crash_risk}% RISK
                                  </span>
                                </div>
                                <div style={{ color: '#ccc', fontSize: '11px', marginTop: '3px', lineHeight: '1.4', fontFamily: "'Rajdhani', sans-serif" }}>
                                  {prediction.instant_crash_warning}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {timeData && (
                          <TimeSyncCard timeData={timeData} lang={lang} />
                        )}

                        <div className="pred-summary" style={{ fontStyle: 'italic', color: '#aaa', borderLeft: '3px solid #a78bfa', paddingLeft: '10px', margin: '10px 0 14px', fontSize: '12px', lineHeight: '1.5' }}>
                          {prediction.summary}
                        </div>

                        {prediction.strategy === 'SKIP' || !prediction.should_bet ? (
                          timeData?.isLKSleep ? (
                            <div style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <ShieldAlert size={18} color="#00ffd5" style={{ flexShrink: 0 }} />
                              <div>
                                <div style={{ color: '#00ffd5', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t.sleepPhaseTitle}</div>
                                <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                                  {t.sleepPhaseDesc}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <ShieldAlert size={18} color="#ff3366" style={{ flexShrink: 0 }} />
                              <div>
                                <div style={{ color: '#ff3366', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t.skipSignalActive}</div>
                                <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                                  {prediction.skip_reason || prediction.strategy_reason || (lang === 'si' ? 'සැසිය ඉහළ අවදානම් රටා පෙන්නුම් කරයි.' : lang === 'ta' ? 'அமர்வு அதிக ஆபத்துள்ள வடிவங்களை வெளிப்படுத்துகிறது.' : 'Session is exhibiting high-risk patterns.')}
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <>
                            <div className={`cashout-targets ${prediction.swing_target ? '' : 'single'}`}>
                              {(() => {
                                const targetVal = prediction.cashout_target || (stats ? stats.conservativeCashout : 1.10);
                                const tStats = getTargetStats(targetVal);
                                const evStr = tStats.ev >= 0 ? `+${tStats.ev.toFixed(3)}` : tStats.ev.toFixed(3);
                                const evColor = tStats.ev >= 0 ? '#00e5a0' : '#ff3366';
                                return (
                                  <div className="cashout-target safe" style={{ borderLeftColor: '#00e5a0', background: 'rgba(0,229,160,0.03)', padding: '10px', borderLeftWidth: '3px', borderRadius: '6px' }}>
                                    <div className="ct-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#888' }}><ShieldCheck size={12} color="#00e5a0" /> {t.safeAutoCashout}</div>
                                    <div className="ct-mult" style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'monospace', color: '#00e5a0', margin: '4px 0' }}>
                                      {targetVal.toFixed(2)}x
                                    </div>
                                    <div className="ct-pct" style={{ fontSize: '10px', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span>{f(t.chance, { pct: tStats.hitRate })}</span>
                                      <span style={{ color: evColor, fontWeight: '600' }}>{f(t.expectedProfit, { ev: evStr })}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                              {prediction.swing_target && (() => {
                                const tStats = getTargetStats(prediction.swing_target);
                                const evStr = tStats.ev >= 0 ? `+${tStats.ev.toFixed(3)}` : tStats.ev.toFixed(3);
                                const evColor = tStats.ev >= 0 ? '#00e5a0' : '#ff3366';
                                return (
                                  <div className="cashout-target risk" style={{ borderLeftColor: '#ffd000', background: 'rgba(255,208,0,0.03)', padding: '10px', borderLeftWidth: '3px', borderRadius: '6px' }}>
                                    <div className="ct-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#888' }}><Scale size={12} color="#ffd000" /> {t.optionalSwing}</div>
                                    <div className="ct-mult" style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'monospace', color: '#ffd000', margin: '4px 0' }}>
                                      {prediction.swing_target.toFixed(2)}x
                                    </div>
                                    <div className="ct-pct" style={{ fontSize: '10px', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span>{f(t.chance, { pct: tStats.hitRate })}</span>
                                      <span style={{ color: evColor, fontWeight: '600' }}>{f(t.expectedProfit, { ev: evStr })}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {stats?.pInstantCrash !== undefined && (
                              <div style={{ background: 'rgba(255,51,102,0.06)', border: '1px solid rgba(255,51,102,0.15)', borderRadius: '8px', padding: '10px 12px', marginTop: '4px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <AlertTriangle size={14} color="#ff3366" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ fontSize: '10px', color: '#c7d2fe', lineHeight: '1.4' }}>
                                  <span style={{ color: '#ff3366', fontWeight: '800', textTransform: 'uppercase', marginRight: '4px' }}>{t.instantCrashFloor}</span>
                                  {f(t.instantCrashDesc, { pct: stats.pInstantCrash.toFixed(1) })}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {stats.p90SafeCashout !== undefined && !prediction.swing_target && prediction.strategy !== 'SKIP' && (
                          <div className="ai-ceiling-forecast" style={{ background: 'rgba(0,229,160,0.1)', borderColor: '#00e5a0', marginTop: '12px' }}>
                            <span className="ceiling-label" style={{ color: '#00e5a0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Target size={12} color="#00e5a0" /> {t.statisticalCeiling}
                            </span>
                            <span className="ceiling-val" style={{ color: '#00e5a0' }}>{Number(stats.p90SafeCashout).toFixed(2)}x</span>
                          </div>
                        )}

                        {prediction.long_targets && (
                          <div className="ai-long-forecast" style={{ marginBottom: '14px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '6px',
                              fontSize: '10px',
                              color: '#888',
                              textTransform: 'uppercase',
                              letterSpacing: '0.8px',
                              fontWeight: '700',
                              fontFamily: "'Rajdhani', sans-serif"
                            }}>
                              <span>{lang === 'si' ? 'දිගුකාලීන පුරෝකථනය' : lang === 'ta' ? 'நீண்ட கால கணிப்புகள்' : 'LONG-TERM CHANCES'}</span>
                              <span style={{ 
                                color: prediction.ai_model_used !== 'stats-only' ? '#6c63ff' : '#888', 
                                fontWeight: '900',
                                background: prediction.ai_model_used !== 'stats-only' ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: prediction.ai_model_used !== 'stats-only' ? '1px solid rgba(108, 99, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)'
                              }}>
                                {prediction.ai_model_used !== 'stats-only' ? '🤖 AI MODEL' : '📊 STATS'}
                              </span>
                            </div>
                            <div className="long-targets-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                              {[
                                { target: '5.0x', refVal: '19.4%', val: prediction.long_targets.x5 },
                                { target: '10.0x', refVal: '9.7%', val: prediction.long_targets.x10 },
                                { target: '20.0x', refVal: '4.8%', val: prediction.long_targets.x20 },
                              ].map(lt => (
                                <div key={lt.target} style={{
                                  flex: 1,
                                  textAlign: 'center',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid rgba(255, 255, 255, 0.06)',
                                  padding: '8px 4px',
                                  borderRadius: '8px',
                                  fontFamily: "'Rajdhani', sans-serif"
                                }}>
                                  <span style={{ display: 'block', fontSize: '10px', color: '#aaa', fontWeight: '700' }}>{lt.target}</span>
                                  <span style={{ display: 'block', fontSize: '15px', fontWeight: '800', margin: '2px 0', color: '#fff' }}>
                                    {Number(lt.val).toFixed(1)}%
                                  </span>
                                  <span style={{ display: 'block', fontSize: '8px', color: '#555' }}>Ref: {lt.refVal}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pred-bars">
                          {[
                            { label: t.under2x, pct: stats.pUnder2, cls: 'red' },
                            { label: t.between2and5, pct: stats.p2to5, cls: 'yellow' },
                            { label: t.over5x, pct: stats.pOver5, cls: 'green' },
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
                          <span>{f(t.ema, { val: stats.ema })}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {stats.currentLowStreak > 0 ? f(t.streakLow, { val: stats.currentLowStreak }) : f(t.streakHigh, { val: stats.currentHighStreak })}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {lang === 'si' ? 'ප්‍රවණතාවය' : lang === 'ta' ? 'போக்கு' : 'Trend'}: {stats.trend === 'rising' ? t.trendRising : stats.trend === 'falling' ? t.trendFalling : t.trendFlat}
                          </span>
                          <span>{f(t.riskScoreLabel, { val: stats.riskScore })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="pred-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '28px 0' }}>
                        {isPredicting ? <RefreshCw className="spin" size={22} /> : <Orbit size={22} />}
                        {isPredicting ? t.runningAIAnalysis : t.startCaptureForPred}
                      </div>
                    )}
                  </div>

                  {/* Target Hit Rates */}
                  <div className="glass-card" style={{ marginBottom: '16px' }}>
                    <div className="panel-title" style={{ marginBottom: '10px' }}>{f(t.targetHitRatesTitle, { count: rounds.length })}</div>
                    {stats && stats.count > 0 ? (
                      <div className="target-table">
                        <div className="target-table-head">
                          <span>{t.thTarget}</span><span>{t.thMath}</span><span>{t.thHitRate}</span><span>{t.thRecent}</span><span>{t.thLast}</span><span>{t.thSignal}</span>
                        </div>
                        {stats.targets.map(tRow => (
                          <div key={tRow.target} className={`target-row signal-${tRow.signal.toLowerCase()}`}>
                            <span className="target-mult">{tRow.target.toFixed(1)}x</span>
                            <span className="target-math">{(tRow.mathProb ?? 0).toFixed(1)}%</span>
                            <div className="target-bar-wrap">
                              <div className="target-bar-bg"><div className="target-bar-fill" style={{ width: `${tRow.hitRate}%` }} /></div>
                              <span className="target-pct">{tRow.hitRate}%</span>
                            </div>
                            <span className={`target-recent ${tRow.recentHitRate >= tRow.hitRate ? 'up' : 'down'}`}>{tRow.recentHitRate}%{tRow.recentHitRate >= tRow.hitRate ? ' ↑' : ' ↓'}</span>
                            <span className="target-last">{tRow.lastHitAgo === 0 ? t.now : tRow.lastHitAgo === -1 ? t.never : `${tRow.lastHitAgo}${t.rAgo}`}</span>
                            <span className={`target-signal ${tRow.signal.toLowerCase()}`}>{tRow.signal}</span>
                          </div>
                        ))}
                        <div className="target-footer">{t.targetFooter}</div>
                      </div>
                    ) : (
                      <div className="feed-empty">{t.captureRoundsToSeeTarget}</div>
                    )}
                  </div>
                </div>

                {/* ─── RIGHT COLUMN ─── */}
                <div className={`right-col2 ${dashTab === 'stats' ? 'mobile-visible' : 'mobile-hidden'}`}>

                  {/* Chart */}
                  <div className="glass-card">
                    <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={14} color="#00ffd5" /> {lang === 'si' ? 'ක්‍රෑෂ් ඉතිහාසය' : lang === 'ta' ? 'கிராஷ் வரலாறு' : 'Crash History'}</span>
                      <span style={{ fontSize: '10px', color: '#555' }}>{lang === 'si' ? `අවසන් වට ${Math.min(rounds.length, 50)} ක්` : lang === 'ta' ? `கடைசி ${Math.min(rounds.length, 50)} சுற்றுகள்` : `Last ${Math.min(rounds.length, 50)} rounds`}</span>
                    </div>
                    <div style={{ width: '100%', height: '300px' }}>
                      {rounds.length > 1 && (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 6, right: 0, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCrash" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00ffd5" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#00ffd5" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} minTickGap={20} />
                            <YAxis tick={{ fontSize: 9, fill: '#555' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}x`} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'rgba(15,17,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                              formatter={(value: any, name: any, props: any) => [`${value}x`, `${lang === 'si' ? 'වටය' : lang === 'ta' ? 'சுற்று' : 'Round'} ${props.payload.name}`]}
                              labelFormatter={(label) => `${lang === 'si' ? 'වේලාව' : lang === 'ta' ? 'நேரம்' : 'Time'}: ${label}`}
                            />
                            <Area type="monotone" dataKey="crash" stroke="#00ffd5" strokeWidth={2} fillOpacity={1} fill="url(#colorCrash)" dot={<CustomDot />} activeDot={{ r: 6, fill: '#00ffd5', stroke: '#fff', strokeWidth: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="chart-legend">
                      <span className="dot green" /> ≥5x
                      <span className="dot yellow" /> 2–5x
                      <span className="dot red" /> &lt;2x
                    </div>
                  </div>

                  {/* AI Data Stream */}
                  <div className="glass-card">
                    <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Zap size={14} color="#a78bfa" /> {lang === 'si' ? 'AI දත්ත විකාශය' : lang === 'ta' ? 'AI தரவு ஊட்டம்' : 'AI Data Stream'}
                    </div>
                    <div className="ai-stream-grid">
                      <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', background: 'radial-gradient(circle, rgba(0,229,160,0.2) 0%, transparent 70%)' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', textTransform: 'uppercase', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}><Activity size={12} color="#00e5a0" /> {lang === 'si' ? 'සජීවී එන්ජින් තත්ත්වය' : lang === 'ta' ? 'நேரடி இயந்திர நிலை' : 'Live Engine State'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                            <span style={{ color: '#aaa' }}>{t.trendTitle}</span>
                            <strong style={{ color: stats?.trend === 'rising' ? '#00e5a0' : stats?.trend === 'falling' ? '#ff3366' : '#fff', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{stats?.trend === 'rising' ? t.trendRising.toUpperCase() : stats?.trend === 'falling' ? t.trendFalling.toUpperCase() : t.trendFlat.toUpperCase()}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                            <span style={{ color: '#aaa' }}>{lang === 'si' ? 'අස්ථාවරතාවය' : lang === 'ta' ? 'ஏற்ற இறக்கம்' : 'Volatility'}</span>
                            <strong style={{ color: '#ffd000' }}>{stats?.volatility?.toUpperCase() || 'NORMAL'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                            <span style={{ color: '#aaa' }}>{lang === 'si' ? 'අවදානම් ලකුණු' : lang === 'ta' ? 'அபாய மதிப்பெண்' : 'Risk Score'}</span>
                            <strong style={{ color: (stats?.riskScore ?? 0) > 60 ? '#ff3366' : (stats?.riskScore ?? 0) < 40 ? '#00e5a0' : '#ffd000', fontSize: '14px' }}>{stats?.riskScore ?? 0}/100</strong>
                          </div>
                        </div>
                      </div>

                      {stats?.sequenceMatch ? (
                        <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', textTransform: 'uppercase', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}><Layers size={12} color="#00d4ff" /> {lang === 'si' ? 'අනුක්‍රමික එන්ජිම' : lang === 'ta' ? 'வரிசை இயந்திரம்' : 'Sequence Engine'}</div>
                          <div style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {stats.sequenceMatch.sequence.map((sq, i) => (
                              <span key={i} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', background: sq === 'INSTANT' ? 'rgba(255,51,102,0.15)' : sq === 'LOW' ? 'rgba(255,208,0,0.15)' : sq === 'MED' ? 'rgba(0,229,160,0.15)' : 'rgba(167,139,250,0.15)', color: sq === 'INSTANT' ? '#ff3366' : sq === 'LOW' ? '#ffd000' : sq === 'MED' ? '#00e5a0' : '#a78bfa', fontWeight: 'bold' }}>{sq}</span>
                            ))}
                          </div>
                          <div style={{ fontSize: '11px', color: '#888', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>{lang === 'si' ? 'ක්ෂණික අවදානම' : lang === 'ta' ? 'உடனடி ஆபத்து' : 'Instant Risk'} <strong style={{ color: stats.sequenceMatch.pInstantNext > 20 ? '#ff3366' : '#fff' }}>{stats.sequenceMatch.pInstantNext}%</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>{lang === 'si' ? 'ආරක්ෂිත පහර' : lang === 'ta' ? 'பாதுகாப்பான வெற்றி' : 'Safe Hit'} <strong style={{ color: '#00e5a0' }}>{stats.sequenceMatch.pSafeNext}%</strong></div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', padding: '12px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '11px' }}>
                          {lang === 'si' ? 'අනුක්‍රමය ජනනය වෙමින්...' : lang === 'ta' ? 'வரிசை உருவாகிறது...' : 'Sequence generating...'}
                        </div>
                      )}

                      {stats?.detectedPatterns && stats.detectedPatterns.length > 0 && (
                        <div style={{ gridColumn: '1 / -1', background: 'linear-gradient(145deg, rgba(167,139,250,0.08), rgba(167,139,250,0.02))', padding: '12px', borderRadius: '12px', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ background: 'rgba(167,139,250,0.15)', padding: '10px', borderRadius: '10px' }}><Zap size={18} color="#a78bfa" /></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '2px', letterSpacing: '1px', fontWeight: 'bold' }}>{lang === 'si' ? 'ක්‍රෑෂ් රටාවක් හඳුනාගෙන ඇත' : lang === 'ta' ? 'தொடர் முறை கண்டறியப்பட்டது' : 'Streak Pattern Detected'}</div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{
                              (() => {
                                const name = stats.detectedPatterns[0].patternName;
                                if (name.includes("Instant Crash Streak")) return lang === 'si' ? 'ක්ෂණික ක්‍රෑෂ් ධාරාව' : lang === 'ta' ? 'உடனடி கிராஷ் தொடர்' : name;
                                if (name.includes("Recovery Surge")) return lang === 'si' ? 'යථා තත්ත්වයට පත්වීමේ රැල්ල' : lang === 'ta' ? 'மீட்பு எழுச்சி' : name;
                                if (name.includes("Volatile Oscillation")) return lang === 'si' ? 'අස්ථාවර උච්චාවචනය' : lang === 'ta' ? 'ஏற்ற இறக்க அலைவு' : name;
                                if (name.includes("Stable Plateau")) return lang === 'si' ? 'ස්ථාවර තලාව' : lang === 'ta' ? 'நிலையான சமவெளி' : name;
                                return name;
                              })()
                            }</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div key={stats.detectedPatterns[0].occurrences} className="zoom-3d-pulse" style={{ fontSize: '20px', fontWeight: '900', color: '#a78bfa', lineHeight: 1, display: 'inline-block' }}>{stats.detectedPatterns[0].occurrences}x</div>
                            <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>{lang === 'si' ? 'ඉතිහාසය' : lang === 'ta' ? 'வரலாறு' : 'HISTORY'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Feed */}
                  <div className="glass-card feed-panel">
                    <div className="panel-title" style={{ marginBottom: '10px' }}>{t.navLiveFeed}</div>
                    <div className="feed-list">
                      {rounds.length === 0
                        ? <div className="feed-empty">{t.waitingForCrashData}</div>
                        : rounds.slice(0, 40).map((round, i) => (
                          <div key={round.id ?? `${round.round_number}-${i}`} className={`feed-row ${round._optimistic ? 'optimistic' : ''}`}>
                            <div className="feed-meta">
                              <span className="feed-num">#{round.round_number}</span>
                              <span className="feed-time">{timeAgo(round.created_at, t)}</span>
                            </div>
                            <span className={`feed-mult color-${classifyRisk(round.crash_point)}`}>
                              {Number(round.crash_point).toFixed(2)}x
                            </span>
                            {round.crash_point >= 10 && (
                              <Flame size={12} style={{ color: '#ff3366', marginLeft: '4px', filter: 'drop-shadow(0 0 4px rgba(255,51,102,0.5))' }} />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── TOASTER ─── */}
      <div className="toaster-container">
        {toasts.map(toast => {
          let IconComponent = Info;
          if (toast.type === 'success') IconComponent = CheckCircle2;
          if (toast.type === 'error') IconComponent = AlertTriangle;
          if (toast.type === 'warning') IconComponent = AlertTriangle;

          return (
            <div key={toast.id} className={`toast-card toast-${toast.type}`}>
              <div className={`toast-icon ${toast.type}`}>
                <IconComponent size={18} />
              </div>
              <div className="toast-content">
                <span className="toast-message">{toast.message}</span>
                {toast.type === 'error' && (
                  <div className="toast-actions">
                    <button className="toast-btn accent" onClick={() => {
                      triggerReconnect();
                      removeToast(toast.id);
                    }}>
                      {t.reconnect}
                    </button>
                  </div>
                )}
              </div>
              <button className="toast-close" onClick={() => removeToast(toast.id)}>
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {/* ─── BOTTOM TAB BAR (MOBILE ONLY) ─── */}
      <div className="mobile-tabbar">
        {navItems.map(item => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              className={`mobile-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <div className="tab-icon-wrapper">
                {item.icon}
              </div>
              <span className="tab-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
