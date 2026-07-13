import { type CrashStats } from "@/lib/stats";

export type ChartType = 'area' | 'line' | 'bar';
export type TimeRange = '1h' | '6h' | '24h' | '7d' | 'all';
export type SortBy = 'newest' | 'oldest' | 'highest' | 'lowest';
export type FilterBy = 'all' | 'safe' | 'risk' | 'high';

export interface Round {
  id?: string;
  round_number: number;
  crash_point: number;
  created_at: string;
  _optimistic?: boolean;
  player_count?: number | null;
  total_bet_volume?: number | null;
  rounds_since_last_moon?: number | null;
}

export interface Prediction {
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
}

export interface WinRateWindow {
  total: number;
  correct: number;
  winRate: number;
  totalProfitUnits: number;
  totalWins: number;
  totalLosses: number;
  avgTarget: number;
  realizedEv: number;
  /** Graded signals (BET + SKIP) in window */
  signalsTotal?: number;
  skipTotal?: number;
  skipSaves?: number;
  skipMisses?: number;
  /** % of skips where crash stayed < 1.5x (discipline value) */
  skipSaveRate?: number;
  betRate?: number;
  skipRate?: number;
  bestWin?: number;
  worstLoss?: number;
}

export interface MarketSnapshot {
  sampleSize: number;
  avg: number;
  last20Avg: number;
  pctAbove15: number;
  pctAbove2: number;
  instantPct: number;
}

export interface WinRate {
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
  market?: MarketSnapshot;
  signalsTotal?: number;
  skipTotal?: number;
  skipSaveRate?: number;
  betRate?: number;
  skipRate?: number;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
}
