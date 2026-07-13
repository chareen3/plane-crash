"use client";

import { CheckCircle2, RefreshCw, X, Flame, Target, Users, Coins, Activity, BarChart3, AlertOctagon } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { type Translations, type LanguageCode } from "@/lib/locales";
import { type Round, type Prediction, type ChartType, type TimeRange } from "../_lib/dashboard-types";
import { classifyRisk, timeAgo } from "../_lib/dashboard-helpers";
import { type CrashStats } from "@/lib/stats";

interface LiveFeedTableProps {
  rounds: Round[];
  prediction: Prediction | null;
  latency: number;
  t: Translations;
}

export function LiveFeedTable({ rounds, prediction, latency, t }: LiveFeedTableProps) {
  return (
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
  );
}

interface CrashHistoryGridProps {
  rounds: Round[];
  processedRounds: Round[];
  displayedRounds: Round[];
  stats: CrashStats | null;
  avg: string;
  highest: string;
  displayCount: number;
  setDisplayCount: (cb: (prev: number) => number) => void;
  showRoundModal: boolean;
  setShowRoundModal: (show: boolean) => void;
  selectedRound: Round | null;
  setSelectedRound: (r: Round | null) => void;
  chartType: ChartType;
  setChartType: (t: ChartType) => void;
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  chartData: any[];
  lang: LanguageCode;
  t: Translations;
}

export function CrashHistoryGrid({
  rounds,
  processedRounds,
  displayedRounds,
  stats,
  avg,
  highest,
  displayCount,
  setDisplayCount,
  showRoundModal,
  setShowRoundModal,
  selectedRound,
  setSelectedRound,
  chartType,
  setChartType,
  timeRange,
  setTimeRange,
  chartData,
  lang,
  t,
}: CrashHistoryGridProps) {
  return (
    <div>
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

      {/* Enhanced Chart Component */}
      <CrashHistoryChart
        displayedRounds={displayedRounds}
        chartType={chartType}
        setChartType={setChartType}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        chartData={chartData}
        lang={lang}
        t={t}
      />

      {/* Log Strip of rounds */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>{t.navHistory}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
          {displayedRounds.map(r => {
            const risk = classifyRisk(r.crash_point);
            return (
              <div
                key={r.id || r.round_number}
                className={`history-pill border-${risk}`}
                onClick={() => {
                  setSelectedRound(r);
                  setShowRoundModal(true);
                }}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  padding: '10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>#{r.round_number}</span>
                <strong style={{ fontSize: '15px', color: risk === 'green' ? '#00e5a0' : risk === 'yellow' ? '#ffd000' : '#ff3366', fontFamily: 'monospace', margin: '4px 0' }}>{Number(r.crash_point).toFixed(2)}x</strong>
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
        <RoundDetailModal
          selectedRound={selectedRound}
          onClose={() => setShowRoundModal(false)}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
}

interface RoundDetailModalProps {
  selectedRound: Round;
  onClose: () => void;
  lang: LanguageCode;
  t: Translations;
}

export function RoundDetailModal({ selectedRound, onClose, lang, t }: RoundDetailModalProps) {
  return (
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
      onClick={onClose}
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
            onClick={onClose}
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
              <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(56,189,248,0.1)', padding: '6px', borderRadius: '6px' }}>
                  <Users size={14} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>Number of bets</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>
                    {selectedRound.player_count}
                  </div>
                </div>
              </div>
            )}
            {selectedRound.total_bet_volume !== undefined && selectedRound.total_bet_volume !== null && (
              <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(245,158,11,0.1)', padding: '6px', borderRadius: '6px' }}>
                  <Coins size={14} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>Total winnings</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>
                    {Number(selectedRound.total_bet_volume).toLocaleString()} LKR
                  </div>
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
  );
}

interface TargetHitRatesTableProps {
  rounds: Round[];
  stats: CrashStats | null;
  t: Translations;
}

export function TargetHitRatesTable({ rounds, stats, t }: TargetHitRatesTableProps) {
  return (
    <div className="glass-card target-hit-card" style={{ marginBottom: '16px' }}>
      <div className="panel-title target-hit-title" style={{ marginBottom: '12px' }}>
        <Target size={14} color="#00ffd5" />
        {t.targetHitRatesTitle.replace('{count}', String(rounds.length))}
      </div>
      {stats && stats.count > 0 ? (
        <div className="target-table">
          <div className="target-table-head">
            <span>{t.thTarget}</span><span>{t.thMath}</span><span>{t.thHitRate}</span><span>{t.thRecent}</span><span>{t.thLast}</span><span>{t.thSignal}</span>
          </div>
          {stats.targets.map(tRow => (
            <div key={tRow.target} className={`target-row signal-${tRow.signal.toLowerCase()}${tRow.target >= 25 ? ' mega-row' : ''}`}>
              <span className="target-mult">{tRow.target >= 10 ? tRow.target.toFixed(0) : tRow.target.toFixed(2).replace(/\.?0+$/, '')}x</span>
              <span className="target-math">{(tRow.mathProb ?? 0).toFixed(1)}%</span>
              <div className="target-bar-wrap">
                <div className="target-bar-bg">
                  <div
                    className="target-bar-fill"
                    style={{
                      width: `${Math.min(100, tRow.hitRate)}%`,
                      background: tRow.target >= 25
                        ? 'linear-gradient(90deg, #a78bfa, #ff3366)'
                        : tRow.target >= 10
                          ? 'linear-gradient(90deg, #00d4ff, #a78bfa)'
                          : undefined,
                    }}
                  />
                </div>
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
  );
}

interface MiniLiveFeedPanelProps {
  rounds: Round[];
  t: Translations;
}

export function MiniLiveFeedPanel({ rounds, t }: MiniLiveFeedPanelProps) {
  return (
    <div className="glass-card feed-panel">
      <div className="panel-title" style={{ marginBottom: '10px' }}>{t.navLiveFeed}</div>
      <div className="feed-list">
        {rounds.length === 0 ? (
          <div className="feed-empty">{t.waitingForCrashData}</div>
        ) : (
          rounds.slice(0, 40).map((round, i) => (
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
          ))
        )}
      </div>
    </div>
  );
}

interface CrashHistoryChartProps {
  displayedRounds: Round[];
  chartType: ChartType;
  setChartType: (t: ChartType) => void;
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  chartData: any[];
  lang: LanguageCode;
  t: Translations;
  showFilters?: boolean;
}

export function CrashHistoryChart({
  displayedRounds,
  chartType,
  setChartType,
  timeRange,
  setTimeRange,
  chartData,
  lang,
  t,
  showFilters = true,
}: CrashHistoryChartProps) {
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    return <circle cx={cx} cy={cy} r={3} fill={payload.color} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />;
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} color="#00ffd5" /> {lang === 'si' ? 'වැඩිදියුණු කළ ප්‍රස්ථාරය' : lang === 'ta' ? 'மேம்படுத்தப்பட்ட வரைபடம்' : 'Enhanced Chart'}
        </div>
        {showFilters && (
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
        )}
      </div>

      <div style={{ width: '100%', height: '300px' }}>
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
      <div className="chart-legend">
        <span className="dot green" /> ≥5x
        <span className="dot yellow" /> 2–5x
        <span className="dot red" /> &lt;2x
      </div>
    </div>
  );
}
