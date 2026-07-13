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

  // Keep latest callbacks without re-subscribing realtime (avoids "after subscribe()" errors)
  const runPredictionRef = useRef(runPrediction);
  const fetchWinRateRef = useRef(fetchWinRate);
  const setPredictionRef = useRef(setPrediction);
  const setPredStatusRef = useRef(setPredStatus);
  const setTimeDataRef = useRef(setTimeData);
  const onNewCrashLiveRef = useRef(onNewCrashLive);
  runPredictionRef.current = runPrediction;
  fetchWinRateRef.current = fetchWinRate;
  setPredictionRef.current = setPrediction;
  setPredStatusRef.current = setPredStatus;
  setTimeDataRef.current = setTimeData;
  onNewCrashLiveRef.current = onNewCrashLive;

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

  // Subscriptions and watchdogs — mount once; use refs for handlers
  useEffect(() => {
    let cancelled = false;

    // Lightweight cache cleanup
    try {
      localStorage.removeItem('oldCrashCache');
      localStorage.removeItem('debugLogs');
      localStorage.removeItem('crashHistory');
    } catch (e) {}

    // Drop any leftover channels with this topic (Strict Mode / HMR remounts)
    try {
      for (const ch of supabase.getChannels()) {
        const topic = (ch as { topic?: string }).topic ?? "";
        if (topic.includes("crash-realtime")) {
          void supabase.removeChannel(ch);
        }
      }
    } catch (e) {}

    // Initial rounds load — then seed AI coach so it is not stuck empty until next crash
    supabase.from('crash_rounds').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => {
        if (cancelled || !data?.length) return;
        setRounds(data);
        setLastCrash(data[0]);
        setLocalStats(computeStats(data));
        runPredictionRef.current();
        fetchWinRateRef.current();
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
        if (td) setTimeDataRef.current(td);
        // Prefer extension prediction; otherwise fetch so coach never stays blank
        if (prediction) {
          if (round?.round_number != null) lastPredictedRoundRef.current = round.round_number;
          setPredictionRef.current(prediction);
          setPredStatusRef.current('done');
        } else if (round?.round_number != null && round.round_number !== lastPredictedRoundRef.current) {
          lastPredictedRoundRef.current = round.round_number;
          runPredictionRef.current();
        } else if (!prediction) {
          runPredictionRef.current();
        }
        onNewCrashLiveRef.current?.();
        fetchWinRateRef.current();
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

    // Unique channel name so remount never reuses a already-subscribed channel
    const channelName = `crash-realtime-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName);

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'crash_rounds' },
      (payload) => {
        if (cancelled) return;
        lastMessageTimeRef.current = Date.now();
        setIsExtensionConnected(true);
        const round = payload.new as Round;
        setRounds(prev => {
          const exists = prev.findIndex(r => r.round_number === round.round_number);
          if (exists !== -1) {
            const u = [...prev];
            u[exists] = round;
            return u;
          }
          const updated = [round, ...prev].slice(0, 50);
          setLocalStats(computeStats(updated as any[]));
          return updated;
        });
        setLastCrash(round);
        if (round.round_number !== lastPredictedRoundRef.current) {
          fetchWinRateRef.current();
          runPredictionRef.current();
          lastPredictedRoundRef.current = round.round_number;
        }
      },
    );

    channel.subscribe((status, err) => {
      if (err) console.warn('[crash-realtime] subscribe error:', status, err);
    });

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
      cancelled = true;
      clearInterval(pingInterval);
      clearInterval(watchdogInterval);
      clearTimeout(connTimeout);
      window.removeEventListener('message', handleMessage);
      void supabase.removeChannel(channel);
    };
  }, []);

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
