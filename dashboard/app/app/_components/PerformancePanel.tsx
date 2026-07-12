import { BarChart3, CheckCircle2, ChevronDown, ChevronUp, Coins, AlertOctagon, Target } from "lucide-react";
import { type Translations, type LanguageCode } from "@/lib/locales";
import { type WinRate } from "../_lib/dashboard-types";
import { type CrashStats } from "@/lib/stats";

interface PerformancePanelProps {
  winRate: WinRate;
  statsWindow: '24h' | '7d' | 'all';
  setStatsWindow: (w: '24h' | '7d' | 'all') => void;
  showMobileStatsPanel: boolean;
  setShowMobileStatsPanel: (show: boolean) => void;
  avg: string;
  stats: CrashStats | null;
  lang: LanguageCode;
  t: Translations;
}

export function PerformancePanel({
  winRate,
  statsWindow,
  setStatsWindow,
  showMobileStatsPanel,
  setShowMobileStatsPanel,
  avg,
  stats,
  lang,
  t,
}: PerformancePanelProps) {
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

  const sq = winRate.signalQuality;
  const sqColor = sq === 'STRONG' ? '#00e5a0' : sq === 'MODERATE' ? '#ffd000' : '#ff3366';
  const sqBg = sq === 'STRONG' ? 'rgba(0,229,160,0.12)' : sq === 'MODERATE' ? 'rgba(255,208,0,0.12)' : 'rgba(255,51,102,0.12)';
  const sqLabel = sq === 'STRONG'
    ? (lang === 'si' ? '✦ ශක්තිමත් සංඥාව' : lang === 'ta' ? '✦ வலுவான சமிக்ஞை' : '✦ STRONG SIGNAL')
    : sq === 'MODERATE'
    ? (lang === 'si' ? '◈ මධ්‍යස්ථ සංඥාව' : lang === 'ta' ? '◈ மிதமான சமிக்ஞை' : '◈ MODERATE')
    : (lang === 'si' ? '⚠ ප්‍රවේශමෙන්' : lang === 'ta' ? '⚠ கவனமாக இருங்கள்' : '⚠ CAUTION');

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {lang === 'si' ? 'කාර්යසාධන සංඛ්‍යාලේඛන' : lang === 'ta' ? 'செயல்திறன் புள்ளிவிவரங்கள்' : 'Performance Stats'}
          </span>
          {sq && sq !== 'INSUFFICIENT' && (
            <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', background: sqBg, color: sqColor, border: `1px solid ${sqColor}30`, letterSpacing: '0.5px', fontFamily: "'Rajdhani', sans-serif" }}>
              {sqLabel}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(['24h', '7d', 'all'] as const).map(windowOption => (
            <button
              key={windowOption}
              onClick={() => setStatsWindow(windowOption)}
              style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '8px',
                border: `1px solid ${statsWindow === windowOption ? '#a78bfa' : 'rgba(255,255,255,0.08)'}`,
                background: statsWindow === windowOption ? 'rgba(167,139,250,0.15)' : 'transparent',
                color: statsWindow === windowOption ? '#a78bfa' : '#555',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {windowOption === '24h'
                ? (lang === 'si' ? '24ව' : lang === 'ta' ? '24ம' : '24H')
                : windowOption === '7d'
                ? (lang === 'si' ? '7ද' : lang === 'ta' ? '7நா' : '7D')
                : (lang === 'si' ? 'සියලු' : lang === 'ta' ? 'அனைத்தும்' : 'ALL')}
            </button>
          ))}
          <button
            onClick={() => setShowMobileStatsPanel(!showMobileStatsPanel)}
            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            {showMobileStatsPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {showMobileStatsPanel && (
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
      )}
    </>
  );
}

// Simple Helper component to avoid unused icon import compiler errors if any icon isn't referenced
function Activity({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
