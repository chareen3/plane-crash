import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { computeStats } from "@/lib/stats";
import { type Translations } from "@/lib/locales";
import { type Round, type Prediction, type ToastMessage } from "../_lib/dashboard-types";

const supabase = createClient({
  realtime: { params: { eventsPerSecond: 20 } }
});

interface UseCrashFeedParams {
  runPrediction: () => void;
  fetchWinRate: () => void;
  setPrediction: (p: Prediction | null) => void;
  setPredStatus: (s: 'idle' | 'predicting' | 'done') => void;
  setTimeData: (d: any) => void;
  addToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;
  onNewCrashLive?: () => void;
  t: Translations;
}

export function useCrashFeed({
  runPrediction,
  fetchWinRate,
  setPrediction,
  setPredStatus,
  setTimeData,
  addToast,
  onNewCrashLive,
  t,
}: UseCrashFeedParams) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [lastCrash, setLastCrash] = useState<Round | null>(null);
  const [localStats, setLocalStats] = useState<any>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [latency, setLatency] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastSyncedRound, setLastSyncedRound] = useState<number | null>(null);
  const [liveData, setLiveData] = useState<{ multiplierText?: string; timerText?: string; state?: string } | null>(null);

  const lastMessageTimeRef = useRef<number>(Date.now());
  const lastPredictedRoundRef = useRef<number>(-1);
  const prevStatusRef = useRef<'connecting' | 'connected' | 'disconnected'>('connecting');

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

  // Heartbeat: track user activity every 60 seconds
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    };
    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(hbInterval);
  }, []);

  // Subscriptions and watchdogs
  useEffect(() => {
    // Lightweight cache cleanup
    try {
      localStorage.removeItem('oldCrashCache');
      localStorage.removeItem('debugLogs');
      localStorage.removeItem('crashHistory');
    } catch(e) {}

    // Initial rounds load
    supabase.from('crash_rounds').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => {
        if (data?.length) {
          setRounds(data);
          setLastCrash(data[0]);
          setLocalStats(computeStats(data));
        }
      });

    const handleMessage = (evt: MessageEvent) => {
      const type = evt.data?.type;
      if (!type) return;

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
        onNewCrashLive?.();
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

    const pingInterval = setInterval(() => {
      window.postMessage({ type: 'DASHBOARD_PING', timestamp: Date.now() }, '*');
    }, 10000);

    const watchdogInterval = setInterval(() => {
      if (Date.now() - lastMessageTimeRef.current > 30000) {
        setIsExtensionConnected(false);
      }
    }, 5000);

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
  }, [fetchWinRate, runPrediction, setPrediction, setPredStatus, setTimeData, onNewCrashLive]);

  // Handle connection warnings
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

  return {
    rounds,
    setRounds,
    lastCrash,
    setLastCrash,
    localStats,
    setLocalStats,
    betAmount,
    isExtensionConnected,
    latency,
    connectionStatus,
    lastSyncedRound,
    liveData,
    triggerReconnect,
  };
}
