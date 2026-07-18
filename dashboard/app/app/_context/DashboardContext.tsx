"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { translations } from "@/lib/locales";
import {
  type ChartType,
  type TimeRange,
  type SortBy,
  type FilterBy,
  type WinRate,
  type Prediction,
  type Round,
} from "../_lib/dashboard-types";
import { sortRounds, filterRounds, filterByTimeRange } from "../_lib/dashboard-helpers";
import { useDashboardState } from "../_hooks/useDashboardState";
import { usePredictionState } from "../_hooks/usePredictionState";
import { useCrashFeed } from "../_hooks/useCrashFeed";
import type { CrashStats } from "@/lib/stats";

export type NavId = "dashboard" | "live" | "targets" | "patterns" | "history";

export const NAV_HREF: Record<NavId, string> = {
  dashboard: "/app",
  live: "/app/live",
  targets: "/app/targets",
  patterns: "/app/patterns",
  history: "/app/history",
};

export function navIdFromPath(pathname: string | null): NavId {
  if (!pathname) return "dashboard";
  if (pathname.startsWith("/app/live")) return "live";
  if (pathname.startsWith("/app/targets")) return "targets";
  if (pathname.startsWith("/app/patterns")) return "patterns";
  if (pathname.startsWith("/app/history")) return "history";
  return "dashboard";
}

interface DashboardContextValue {
  // shell / ui
  lang: ReturnType<typeof useDashboardState>["lang"];
  handleLangChange: ReturnType<typeof useDashboardState>["handleLangChange"];
  isAdmin: boolean;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (v: boolean) => void;
  dashTab: "signals" | "stats";
  setDashTab: (v: "signals" | "stats") => void;
  showMobileStatsPanel: boolean;
  setShowMobileStatsPanel: (v: boolean) => void;
  statsWindow: "24h" | "7d" | "all";
  setStatsWindow: (v: "24h" | "7d" | "all") => void;
  userMenuOpen: boolean;
  setUserMenuOpen: (v: boolean) => void;
  selectedRound: Round | null;
  setSelectedRound: (r: Round | null) => void;
  showRoundModal: boolean;
  setShowRoundModal: (v: boolean) => void;
  displayCount: number;
  setDisplayCount: (n: number | ((prev: number) => number)) => void;
  toasts: ReturnType<typeof useDashboardState>["toasts"];
  addToast: ReturnType<typeof useDashboardState>["addToast"];
  removeToast: ReturnType<typeof useDashboardState>["removeToast"];
  t: (typeof translations)["en"];
  handleLogout: () => Promise<void>;

  // feed / prediction
  rounds: Round[];
  lastCrash: Round | null;
  stats: CrashStats | null;
  avg: string;
  highest: string;
  betAmount: string;
  latency: number;
  connectionStatus: "connecting" | "connected" | "disconnected";
  lastSyncedRound: number | null;
  liveData: { multiplierText?: string; timerText?: string; state?: string } | null;
  triggerReconnect: () => void;
  prediction: Prediction | null;
  timeData: any;
  isPredicting: boolean;
  predStatus: "idle" | "predicting" | "done";
  runPrediction: () => void;
  heroRef: RefObject<HTMLDivElement | null>;
  getTargetStats: (target: number | undefined | null) => { hitRate: number; ev: number };
  winRate: WinRate;
  fetchWinRate: () => Promise<void>;

  // history filters
  chartType: ChartType;
  setChartType: (v: ChartType) => void;
  timeRange: TimeRange;
  setTimeRange: (v: TimeRange) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  filterBy: FilterBy;
  setFilterBy: (v: FilterBy) => void;
  processedRounds: Round[];
  displayedRounds: Round[];
  chartData: { name: number; time: string; crash: number; color: string }[];
  formatStr: (str: string, values: Record<string, string | number>) => string;
  subscription: any;
  claimTrial: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dashboard = useDashboardState();
  const {
    lang,
    handleLangChange,
    isAdmin,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    dashTab,
    setDashTab,
    showMobileStatsPanel,
    setShowMobileStatsPanel,
    statsWindow,
    setStatsWindow,
    userMenuOpen,
    setUserMenuOpen,
    selectedRound,
    setSelectedRound,
    showRoundModal,
    setShowRoundModal,
    displayCount,
    setDisplayCount,
    toasts,
    addToast,
    removeToast,
    subscription,
    claimTrial,
  } = dashboard;

  const t = translations[lang] || translations.en;
  const [activeGame] = useState<"1xbet" | "aviator" | "luckyjet">("1xbet");
  const [winRate, setWinRate] = useState<WinRate>({ total: 0, correct: 0, winRate: 0, byRisk: {} });

  const fetchWinRate = useCallback(async () => {
    const res = await fetch("/api/grade");
    if (res.ok) {
      const d = await res.json();
      setWinRate(d);
    }
  }, []);

  const {
    prediction,
    setPrediction,
    timeData,
    setTimeData,
    isPredicting,
    predStatus,
    setPredStatus,
    runPrediction,
  } = usePredictionState(activeGame, fetchWinRate);

  const heroRef = useRef<HTMLDivElement | null>(null);
  const onNewCrashLive = useCallback(() => {
    heroRef.current?.classList.remove("flash");
    void heroRef.current?.offsetWidth;
    heroRef.current?.classList.add("flash");
  }, []);

  const {
    rounds,
    lastCrash,
    localStats,
    betAmount,
    latency,
    connectionStatus,
    lastSyncedRound,
    liveData,
    triggerReconnect,
  } = useCrashFeed({
    runPrediction,
    fetchWinRate,
    setPrediction,
    setPredStatus,
    setTimeData,
    addToast,
    onNewCrashLive,
    t,
  });

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const getTargetStats = useCallback(
    (target: number | undefined | null) => {
      if (!rounds || rounds.length === 0 || !target || target <= 0) {
        return { hitRate: 0, ev: 0 };
      }
      const hits = rounds.filter(r => Number(r.crash_point) >= target).length;
      const hitRate = Math.round((hits / rounds.length) * 100);
      const ev = (hitRate / 100) * target - 1;
      return { hitRate, ev };
    },
    [rounds],
  );

  const [chartType, setChartType] = useState<ChartType>("area");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [filterBy, setFilterBy] = useState<FilterBy>("all");

  const stats = localStats;
  const avg = stats ? stats.mean.toFixed(2) : "—";
  const highest =
    rounds.length > 0
      ? Math.max(...rounds.map(r => Number(r.crash_point))).toFixed(2)
      : "—";

  const processedRounds = useMemo(
    () => sortRounds(filterByTimeRange(filterRounds(rounds, filterBy), timeRange), sortBy),
    [rounds, filterBy, timeRange, sortBy],
  );
  const displayedRounds = useMemo(
    () => processedRounds.slice(0, displayCount),
    [processedRounds, displayCount],
  );

  const chartData = useMemo(
    () =>
      [...displayedRounds].reverse().map(r => ({
        name: r.round_number,
        time: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        crash: Number(r.crash_point),
        color: r.crash_point < 2 ? "#ff3366" : r.crash_point < 5 ? "#ffd000" : "#00e5a0",
      })),
    [displayedRounds],
  );

  const formatStr = useCallback((str: string, values: Record<string, string | number>) => {
    let result = str;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(val));
    }
    return result;
  }, []);

  const value = useMemo<DashboardContextValue>(
    () => ({
      lang,
      handleLangChange,
      isAdmin,
      mobileDrawerOpen,
      setMobileDrawerOpen,
      dashTab,
      setDashTab,
      showMobileStatsPanel,
      setShowMobileStatsPanel,
      statsWindow,
      setStatsWindow,
      userMenuOpen,
      setUserMenuOpen,
      selectedRound,
      setSelectedRound,
      showRoundModal,
      setShowRoundModal,
      displayCount,
      setDisplayCount,
      toasts,
      addToast,
      removeToast,
      t,
      handleLogout,
      rounds,
      lastCrash,
      stats,
      avg,
      highest,
      betAmount,
      latency,
      connectionStatus,
      lastSyncedRound,
      liveData,
      triggerReconnect,
      prediction,
      timeData,
      isPredicting,
      predStatus,
      runPrediction,
      heroRef,
      getTargetStats,
      winRate,
      fetchWinRate,
      chartType,
      setChartType,
      timeRange,
      setTimeRange,
      sortBy,
      setSortBy,
      filterBy,
      setFilterBy,
      processedRounds,
      displayedRounds,
      chartData,
      formatStr,
      subscription,
      claimTrial,
    }),
    [
      lang, handleLangChange, isAdmin, mobileDrawerOpen, dashTab,
      showMobileStatsPanel, statsWindow, userMenuOpen, selectedRound,
      showRoundModal, displayCount, toasts, addToast, removeToast, t,
      handleLogout, rounds, lastCrash, stats, avg, highest, betAmount,
      latency, connectionStatus, lastSyncedRound, liveData, triggerReconnect,
      prediction, timeData, isPredicting, predStatus, runPrediction,
      getTargetStats, winRate, fetchWinRate, chartType, timeRange, sortBy,
      filterBy, processedRounds, displayedRounds, chartData, formatStr,
      setMobileDrawerOpen, setDashTab, setShowMobileStatsPanel, setStatsWindow,
      setUserMenuOpen, setSelectedRound, setShowRoundModal, setDisplayCount,
      subscription, claimTrial,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
