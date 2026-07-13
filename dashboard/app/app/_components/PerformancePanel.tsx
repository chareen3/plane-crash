import { BarChart3, CheckCircle2, ChevronDown, ChevronUp, Coins, AlertOctagon, Target, Shield, Flame, TrendingUp, Activity } from "lucide-react";
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

function pctColor(v: number, good = 55, mid = 40) {
  if (v >= good) return '#00e5a0';
  if (v >= mid) return '#ffd000';
  return '#ff3366';
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
  const market = winRate.market;

  const evVal = w?.realizedEv ?? 0;
  const evColor = evVal > 0 ? '#00e5a0' : evVal < 0 ? '#ff3366' : '#ffd000';
  const evBg = evVal > 0 ? 'rgba(0,229,160,0.12)' : evVal < 0 ? 'rgba(255,51,102,0.12)' : 'rgba(255,208,0,0.12)';
  const evStr = w && (w.total ?? 0) > 0 ? (evVal >= 0 ? '+' : '') + evVal.toFixed(3) : '—';

  const wrVal = w?.winRate ?? 0;
  const wrColor = pctColor(wrVal, 65, 50);
  const hasBets = !!(w && w.total > 0);
  const hasSignals = !!(w && (w.signalsTotal ?? 0) > 0);

  const windowLabel = statsWindow === '24h'
    ? (lang === 'si' ? 'පසුගිය 24 පැය' : lang === 'ta' ? 'கடந்த 24 மணி' : 'Last 24 Hours')
    : statsWindow === '7d'
    ? (lang === 'si' ? 'පසුගිය දින 7' : lang === 'ta' ? 'கடந்த 7 நாட்கள்' : 'Last 7 Days')
    : (lang === 'si' ? 'සියලු කාලය' : lang === 'ta' ? 'எல்லா நேரமும்' : 'All Time');

  const sq = winRate.signalQuality;
  const sqColor = sq === 'STRONG' ? '#00e5a0' : sq === 'MODERATE' ? '#ffd000' : '#ff3366';
  const sqBg = sq === 'STRONG' ? 'rgba(0,229,160,0.12)' : sq === 'MODERATE' ? 'rgba(255,208,0,0.12)' : 'rgba(255,51,102,0.12)';
  const sqLabel = sq === 'STRONG'
    ? (lang === 'si' ? '✦ ශක්තිමත් සංඥාව' : lang === 'ta' ? '✦ வலுவான சமிக்ஞை' : '✦ STRONG SIGNAL')
    : sq === 'MODERATE'
    ? (lang === 'si' ? '◈ මධ්‍යස්ථ සංඥාව' : lang === 'ta' ? '◈ மிதமான சமிக்ஞை' : '◈ MODERATE')
    : (lang === 'si' ? '⚠ ප්‍රවේශමෙන්' : lang === 'ta' ? '⚠ கவனமாக இருங்கள்' : '⚠ CAUTION');

  // ── Live market (always available from stats / market snapshot) ──
  const hit15 = stats?.targets?.find(x => x.target === 1.5)?.hitRate
    ?? market?.pctAbove15
    ?? (stats ? Math.max(0, 100 - (stats.pUnder2 ?? 0)) : null);
  const hit2FromDist = (stats?.p2to5 != null && stats?.pOver5 != null)
    ? (stats.p2to5 + stats.pOver5)
    : null;
  const hit2 = stats?.targets?.find(x => x.target === 2)?.hitRate
    ?? market?.pctAbove2
    ?? hit2FromDist;
  const instantPct = stats?.pInstantCrash ?? market?.instantPct ?? 0;
  const targetHitHist = stats?.suggestedCashoutWinRate
    ?? (stats?.suggestedCashout
      ? stats.targets?.find(x => Math.abs(x.target - stats.suggestedCashout) < 0.05)?.hitRate
      : null);
  const lowStreak = stats?.currentLowStreak ?? 0;
  const highStreak = stats?.currentHighStreak ?? 0;
  const regime = stats?.volatilityRegime ?? '—';
  const risk = stats?.riskScore;
  const last20 = market?.last20Avg;
  const formLabel = stats?.recentMomentumLabel ?? stats?.sessionMomentum ?? '—';

  const skipSaveRate = w?.skipSaveRate ?? 0;
  const betRate = w?.betRate ?? 0;
  const skipRate = w?.skipRate ?? 0;
  const signalsTotal = w?.signalsTotal ?? 0;

  const L = {
    cashoutHit: lang === 'si' ? 'කෑෂ්අවුට් හිට්' : lang === 'ta' ? 'கேஷ்அவுட் ஹிட்' : 'Cashout Hit Rate',
    noBetsYet: lang === 'si' ? 'තවම BET නැත' : lang === 'ta' ? 'இன்னும் BET இல்லை' : 'No BET rounds yet',
    skipSaves: lang === 'si' ? 'SKIP ආරක්ෂා' : lang === 'ta' ? 'SKIP பாதுகாப்பு' : 'Skip Saves',
    skipSavesSub: lang === 'si' ? 'SKIP කළ විට <1.5x' : lang === 'ta' ? 'SKIP செய்ய <1.5x' : 'Skipped & crash <1.5x',
    betSkip: lang === 'si' ? 'BET / SKIP' : lang === 'ta' ? 'BET / SKIP' : 'BET vs SKIP',
    safeZone: lang === 'si' ? '≥1.5x හිට් %' : lang === 'ta' ? '≥1.5x ஹிட் %' : '≥1.5x Hit %',
    twoX: lang === 'si' ? '≥2x හිට් %' : lang === 'ta' ? '≥2x ஹிட் %' : '≥2x Hit %',
    instant: lang === 'si' ? 'ක්ෂණික (<1.15)' : lang === 'ta' ? 'உடனடி (<1.15)' : 'Instant (<1.15x)',
    targetHist: lang === 'si' ? 'ඉලක්ක හිට් (ඉතිහාස)' : lang === 'ta' ? 'இலக்கு ஹிட் (வரலாறு)' : 'Target Hit (hist.)',
    streak: lang === 'si' ? 'වත්මන් ස්ට්‍රීක්' : lang === 'ta' ? 'தற்போதைய ஸ்ட்ரீக்' : 'Live Streak',
    form: lang === 'si' ? 'මෑත ආකෘතිය' : lang === 'ta' ? 'சமீப வடிவம்' : 'Recent Form',
    last20: lang === 'si' ? 'අවසන් 20 avg' : lang === 'ta' ? 'கடைசி 20 சராசரி' : 'Last 20 Avg',
    riskRegime: lang === 'si' ? 'අවදානම / තත්ත්වය' : lang === 'ta' ? 'ஆபத்து / நிலை' : 'Risk / Regime',
    marketSection: lang === 'si' ? 'සජීව වෙළඳපොළ' : lang === 'ta' ? 'நேரடி சந்தை' : 'Live Market',
    signalSection: lang === 'si' ? 'සංඥා කාර්යසාධනය' : lang === 'ta' ? 'சிக்னல் செயல்திறன்' : 'Signal Performance',
    waitingSignals: lang === 'si' ? 'ශ්‍රේණිගත සංඥා එන තෙක්' : lang === 'ta' ? 'மதிப்பீட்டு சிக்னல்கள் வரும் வரை' : 'Waiting for graded signals…',
  };

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
        <>
          {/* ── Live market strip (never N/A if we have rounds) ── */}
          <div style={{ fontSize: '10px', color: '#666', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>
            {L.marketSection}
          </div>
          <div className="stat-strip">
            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: 'rgba(0,229,160,0.12)', color: '#00e5a0' }}><BarChart3 size={18} /></div>
              <div>
                <div className="sc2-label">{t.sessionAvg}</div>
                <div className="sc2-val">{avg}x</div>
                {last20 != null && last20 > 0 && (
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{L.last20}: {last20}x</div>
                )}
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: 'rgba(0,229,160,0.12)', color: '#00e5a0' }}><TrendingUp size={18} /></div>
              <div>
                <div className="sc2-label">{L.safeZone}</div>
                <div className="sc2-val" style={{ color: hit15 != null ? pctColor(hit15, 55, 40) : '#888' }}>
                  {hit15 != null ? `${hit15}%` : '—'}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  {L.twoX}: {hit2 != null ? `${hit2}%` : '—'}
                </div>
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: 'rgba(255,51,102,0.12)', color: '#ff3366' }}><AlertOctagon size={18} /></div>
              <div>
                <div className="sc2-label">{L.instant}</div>
                <div className="sc2-val" style={{ color: '#ff3366' }}>
                  {typeof instantPct === 'number' ? `${Number(instantPct).toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: 'rgba(0,255,213,0.12)', color: '#00ffd5' }}><Target size={18} /></div>
              <div>
                <div className="sc2-label">{L.targetHist}</div>
                <div className="sc2-val" style={{ color: '#00ffd5' }}>
                  {targetHitHist != null ? `${targetHitHist}%` : '—'}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  @ {stats?.suggestedCashout != null ? `${stats.suggestedCashout.toFixed(2)}x` : '—'}
                </div>
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: 'rgba(255,208,0,0.12)', color: '#ffd000' }}><Flame size={18} /></div>
              <div>
                <div className="sc2-label">{L.streak}</div>
                <div className="sc2-val" style={{ color: lowStreak >= 3 ? '#ff3366' : highStreak >= 3 ? '#00e5a0' : '#ffd000' }}>
                  {lowStreak > 0 ? `${lowStreak}↓` : highStreak > 0 ? `${highStreak}↑` : '0'}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  {L.form}: {String(formLabel)}
                </div>
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}><Activity size={18} /></div>
              <div>
                <div className="sc2-label">{L.riskRegime}</div>
                <div className="sc2-val" style={{ color: '#a78bfa', fontSize: '16px' }}>
                  {risk != null ? `${risk}` : '—'}
                  <span style={{ fontSize: '11px', color: '#888', marginLeft: 4 }}>/ {regime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Signal performance (windowed; useful with skips too) ── */}
          <div style={{ fontSize: '10px', color: '#666', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', margin: '12px 0 6px' }}>
            {L.signalSection} · {windowLabel}
          </div>
          <div className="stat-strip">
            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: hasBets ? (wrVal >= 65 ? 'rgba(0,229,160,0.12)' : wrVal >= 50 ? 'rgba(255,208,0,0.12)' : 'rgba(255,51,102,0.12)') : 'rgba(255,255,255,0.05)', color: hasBets ? wrColor : '#555' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div className="sc2-label">{L.cashoutHit}</div>
                <div className="sc2-val" style={{ color: hasBets ? wrColor : '#555' }}>
                  {hasBets ? `${wrVal}%` : '—'}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  {hasBets ? `${w!.correct}/${w!.total} BET` : L.noBetsYet}
                </div>
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: hasSignals ? 'rgba(0,229,160,0.12)' : 'rgba(255,255,255,0.05)', color: hasSignals ? pctColor(skipSaveRate, 55, 40) : '#555' }}>
                <Shield size={18} />
              </div>
              <div>
                <div className="sc2-label">{L.skipSaves}</div>
                <div className="sc2-val" style={{ color: hasSignals ? pctColor(skipSaveRate, 55, 40) : '#555' }}>
                  {hasSignals ? `${skipSaveRate}%` : '—'}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  {hasSignals
                    ? `${w!.skipSaves ?? 0}/${w!.skipTotal ?? 0} · ${L.skipSavesSub}`
                    : L.waitingSignals}
                </div>
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}><Activity size={18} /></div>
              <div>
                <div className="sc2-label">{L.betSkip}</div>
                <div className="sc2-val" style={{ color: '#a78bfa', fontSize: '15px' }}>
                  {hasSignals ? `${betRate}% / ${skipRate}%` : '—'}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  {hasSignals
                    ? `${w!.total ?? 0} BET · ${w!.skipTotal ?? 0} SKIP · ${signalsTotal} total`
                    : windowLabel}
                </div>
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: hasBets ? evBg : 'rgba(255,255,255,0.05)', color: hasBets ? evColor : '#555' }}>
                <Coins size={18} />
              </div>
              <div>
                <div className="sc2-label">{lang === 'si' ? 'EV / ඔට්ටුව' : lang === 'ta' ? 'EV / பந்தயம்' : 'Realized EV / Bet'}</div>
                <div className="sc2-val" style={{ color: hasBets ? evColor : '#555' }}>{evStr}</div>
                {hasBets && (
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', lineHeight: '1.2' }}>
                    {evVal >= 0
                      ? (lang === 'si' ? `1කට +රු.${evVal.toFixed(2)}` : lang === 'ta' ? `ஒவ்வொன்றிலும் +₹${evVal.toFixed(2)}` : `+$${evVal.toFixed(2)} per $1 bet`)
                      : (lang === 'si' ? `1කට -රු.${Math.abs(evVal).toFixed(2)}` : lang === 'ta' ? `ஒவ்வொன்றிலும் -₹${Math.abs(evVal).toFixed(2)}` : `-$${Math.abs(evVal).toFixed(2)} per $1 bet`)}
                  </div>
                )}
              </div>
            </div>

            <div className="stat-card2">
              <div className="sc2-icon" style={{ background: 'rgba(0,255,213,0.12)', color: '#00ffd5' }}><Target size={18} /></div>
              <div>
                <div className="sc2-label">{lang === 'si' ? 'සාමාන්‍ය ඉලක්කය' : lang === 'ta' ? 'சராசரி இலக்கு' : 'Avg Cashout Target'}</div>
                <div className="sc2-val" style={{ color: '#00ffd5' }}>
                  {hasBets && w?.avgTarget ? `${w.avgTarget.toFixed(2)}x` : (stats?.suggestedCashout ? `${stats.suggestedCashout.toFixed(2)}x` : '—')}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  {hasBets
                    ? (lang === 'si' ? 'ග්‍රේඩ් කළ BET' : lang === 'ta' ? 'மதிப்பிட்ட BET' : 'On graded BETs')
                    : (lang === 'si' ? 'වත්මන් යෝජනාව' : lang === 'ta' ? 'தற்போதைய பரிந்துரை' : 'Live suggestion')}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
