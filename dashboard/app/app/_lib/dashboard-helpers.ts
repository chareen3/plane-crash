import { type Translations } from "@/lib/locales";
import { type Round, type FilterBy, type SortBy, type TimeRange } from "./dashboard-types";

export function classifyRisk(v: number) {
  return v < 2 ? 'red' : v < 5 ? 'yellow' : 'green';
}

export function timeAgo(iso: string, t: Translations) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t.agoSeconds.replace('{val}', String(s));
  return t.agoMinutes.replace('{val}', String(Math.floor(s / 60)));
}

export function filterRounds(rounds: Round[], filter: FilterBy): Round[] {
  switch (filter) {
    case 'safe': return rounds.filter(r => r.crash_point >= 2 && r.crash_point < 5);
    case 'risk': return rounds.filter(r => r.crash_point >= 5);
    case 'high': return rounds.filter(r => r.crash_point < 2);
    default: return rounds;
  }
}

export function sortRounds(rounds: Round[], sort: SortBy): Round[] {
  const sorted = [...rounds];
  switch (sort) {
    case 'oldest': return sorted.reverse();
    case 'highest': return sorted.sort((a, b) => b.crash_point - a.crash_point);
    case 'lowest': return sorted.sort((a, b) => a.crash_point - b.crash_point);
    default: return sorted;
  }
}

export function filterByTimeRange(rounds: Round[], range: TimeRange): Round[] {
  if (range === 'all') return rounds;
  const now = Date.now();
  const ranges: Record<string, number> = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
  const cutoff = now - (ranges[range] || 0);
  return rounds.filter(r => new Date(r.created_at).getTime() >= cutoff);
}

export function getTargetStats(rounds: Round[], target: number | undefined | null) {
  if (!rounds || rounds.length === 0 || !target || target <= 0) {
    return { hitRate: 0, ev: 0 };
  }
  const hits = rounds.filter(r => Number(r.crash_point) >= target).length;
  const hitRate = Math.round((hits / rounds.length) * 100);
  const ev = (hitRate / 100) * target - 1;
  return { hitRate, ev };
}
