import { ShieldAlert, ShieldCheck, Scale, Rocket, AlertTriangle, RefreshCw, Orbit, TrendingUp, TrendingDown, Minus, Bot, CheckCircle2, Info, Sparkles, Target, BarChart3, Moon, Sun, Sunset, Star as StarIcon, Gauge, Skull } from "lucide-react";
import { type Translations, type LanguageCode } from "@/lib/locales";
import { type Prediction } from "../_lib/dashboard-types";
import { type CrashStats } from "@/lib/stats";

const RISK_COLOR: Record<string, string> = { LOW: 'green', MEDIUM: 'yellow', HIGH: 'red' };

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

const STRATEGY_META = (t: Translations) => ({
  SKIP: { color: '#ff3366', glow: 'rgba(255,51,102,0.3)', icon: <ShieldAlert size={28} strokeWidth={2} />, label: t.holdDoNotEnter, tag: t.danger },
  CONSERVATIVE: { color: '#00e5a0', glow: 'rgba(0,229,160,0.3)', icon: <ShieldCheck size={28} strokeWidth={2} />, label: t.safeEntrySignal, tag: t.safe },
  AGGRESSIVE: { color: '#ffd000', glow: 'rgba(255,208,0,0.3)', icon: <Scale size={28} strokeWidth={2} />, label: t.highRiskPlay, tag: t.risk },
  SWING: { color: '#a78bfa', glow: 'rgba(167,139,250,0.3)', icon: <Rocket size={28} strokeWidth={2} />, label: t.swingTrade, tag: t.swing },
});

interface BetSignalHeroCardProps {
  prediction: Prediction | null;
  stats: CrashStats | null;
  roundsCount: number;
  heroRef: React.RefObject<HTMLDivElement | null>;
  lang: LanguageCode;
  t: Translations;
}

export function BetSignalHeroCard({
  prediction,
  stats,
  roundsCount,
  heroRef,
  lang,
  t,
}: BetSignalHeroCardProps) {
  const getStratMeta = (strategy: string) => {
    const meta = STRATEGY_META(t)[strategy as 'SKIP' | 'CONSERVATIVE' | 'AGGRESSIVE' | 'SWING'] || STRATEGY_META(t)['CONSERVATIVE'];
    return meta;
  };

  const stratMeta = prediction?.strategy ? getStratMeta(prediction.strategy) : null;

  if (prediction && stratMeta) {
    const displayStabilityIndex = prediction.stability_analysis?.holdScore !== undefined
      ? (100 - prediction.stability_analysis.holdScore)
      : (prediction.stability_analysis?.stability_index ?? 50);

    return (
      <div className="hero-banner-3d" style={{ borderColor: stratMeta.color + '60', display: 'flex', flexDirection: 'column' }} ref={heroRef}>
        <div className="hero-grid-overlay" />
        <div className="hero-banner-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
          <div style={{ color: stratMeta.color, transform: 'scale(1.8)', marginLeft: '10px', flexShrink: 0 }}>{stratMeta.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hero-banner-title" style={{ color: stratMeta.color, fontSize: '16px' }}>{stratMeta.label}</div>
            <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '6px', lineHeight: '1.4' }}>
              {prediction.strategy === 'SKIP' && prediction.stability_analysis && ((100 - (prediction.stability_analysis.holdScore || 50)) >= 70 || (prediction.stability_analysis.stability_index || 50) >= 70)
                ? "Market structure is stable overall, but the current entry quality is weak."
                : prediction.strategy_reason || prediction.skip_reason || (lang === 'si' ? 'AI උපායමාර්ගය ක්‍රියාත්මකයි.' : lang === 'ta' ? 'AI உத்தி செயலில் உள்ளது.' : 'AI strategy active.')}
            </div>
            <div className="hc2-vol-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`vol-badge vol-${stats?.volatility ?? 'normal'}`} style={{ fontSize: '10px', padding: '3px 8px', fontWeight: '600' }}>
                {stats?.volatility?.toUpperCase() ?? 'NORMAL'} VOL
              </span>
              <span className="hc2-trend" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                {stats?.trend === 'rising' ? <TrendingUp size={14} color="#00e5a0" /> : stats?.trend === 'falling' ? <TrendingDown size={14} color="#ff3366" /> : <Minus size={14} color="#888" />}
                {stats?.trend?.toUpperCase() ?? 'FLAT'}
              </span>
              {prediction.stability_analysis?.holdReasons?.slice(0, 2).map((reason: string, i: number) => (
                <span key={i} style={{ fontSize: '10px', padding: '3px 8px', fontWeight: '600', background: 'rgba(255,51,102,0.15)', color: '#ff4d79', borderRadius: '4px', border: '1px solid rgba(255,51,102,0.3)' }}>
                  {reason}
                </span>
              ))}
            </div>
          </div>

          {prediction.stability_analysis && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              width: '120px',
              flexShrink: 0,
              padding: '8px 10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '900',
                color: '#e2e8f0',
                fontFamily: "'Rajdhani', sans-serif",
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                <span>SESSION MATCH</span>
                <span style={{ color: '#00ffd5', fontWeight: '900' }}>{displayStabilityIndex}%</span>
              </div>
              <div style={{ position: 'relative', width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>
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
                  width: '10px',
                  height: '10px',
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
                fontSize: '9px',
                color: '#94a3b8',
                fontWeight: '700',
                marginTop: '4px',
                fontFamily: "'Rajdhani', sans-serif"
              }}>
                <span>VOLATILE</span>
                <span>STABLE</span>
              </div>
            </div>
          )}

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
    );
  }

  return (
    <div className="hero-banner-3d" ref={heroRef} style={{ minHeight: '120px', display: 'flex', alignItems: 'center' }}>
      <div className="hero-grid-overlay" />
      <div className="hero-banner-content" style={{ width: '100%' }}>
        <div className="spin" style={{ color: '#00ffd5', flexShrink: 0 }}><Orbit size={28} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#00ffd5', letterSpacing: '3px', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', marginBottom: '6px' }}>⚡ {t.neuralEngineLoading}</div>
          <div style={{ fontSize: '12px', color: '#6b7fa3', lineHeight: '1.6' }}>
            {roundsCount > 0
              ? t.neuralEngineProcessing.replace('{count}', String(roundsCount))
              : t.neuralEngineLiveStream}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            {[lang === 'si' ? 'රටා විශ්ලේෂණය' : lang === 'ta' ? 'வடிவ பகுப்பாய்வு' : 'Pattern Analysis', lang === 'si' ? 'අනුක්‍රමික පරිලෝකනය' : lang === 'ta' ? 'வரிசை ஸ்கேன்' : 'Sequence Scan', lang === 'si' ? 'අවදානම් ලකුණු කිරීම' : lang === 'ta' ? 'அபாய மதிப்பீடு' : 'Risk Scoring'].map((label, i) => (
              <span key={i} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(0,255,213,0.07)', color: '#00ffd5', border: '1px solid rgba(0,255,213,0.2)', letterSpacing: '0.5px' }}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AIPredictionPanelProps {
  prediction: Prediction | null;
  stats: CrashStats | null;
  isPredicting: boolean;
  predStatus: 'idle' | 'predicting' | 'done';
  timeData: any;
  getTargetStats: (target: number | undefined | null) => { hitRate: number; ev: number };
  lang: LanguageCode;
  t: Translations;
}

export function AIPredictionPanel({
  prediction,
  stats,
  isPredicting,
  predStatus,
  timeData,
  getTargetStats,
  lang,
  t,
}: AIPredictionPanelProps) {
  const formatStr = (str: string, values: Record<string, string | number>) => {
    let result = str;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(val));
    }
    return result;
  };

  return (
    <div className={`glass-card pred-card2 ${prediction ? `pred-${RISK_COLOR[prediction.risk]}` : ''}`}>
      <div className="pc2-header responsive-header">
        <div className="pc2-title">
          <Bot size={16} color="#a78bfa" style={{ flexShrink: 0 }} />
          <span className="pc2-title-text">{t.aiCoachTitle}</span>
        </div>
        <span className={`pred-status ${predStatus}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          {predStatus === 'predicting' ? (
            <><RefreshCw size={11} className="spin" /> {t.analyzingDot}</>
          ) : predStatus === 'done' ? (
            <><CheckCircle2 size={11} /> {t.ready}</>
          ) : (
            t.waiting
          )}
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
              <Target size={12} /> {formatStr(t.betPercent, { pct: prediction.recommended_stake_pct })}
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
                        <span>{formatStr(t.chance, { pct: tStats.hitRate })}</span>
                        <span style={{ color: evColor, fontWeight: '600' }}>{formatStr(t.expectedProfit, { ev: evStr })}</span>
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
                        <span>{formatStr(t.chance, { pct: tStats.hitRate })}</span>
                        <span style={{ color: evColor, fontWeight: '600' }}>{formatStr(t.expectedProfit, { ev: evStr })}</span>
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
                    {formatStr(t.instantCrashDesc, { pct: stats.pInstantCrash.toFixed(1) })}
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
            <span>{formatStr(t.ema, { val: stats.ema })}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {stats.currentLowStreak > 0
                ? formatStr(t.streakLow, { val: stats.currentLowStreak })
                : formatStr(t.streakHigh, { val: stats.currentHighStreak })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {lang === 'si' ? 'ප්‍රවණතාවය' : lang === 'ta' ? 'போக்கு' : 'Trend'}: {stats.trend === 'rising' ? t.trendRising : stats.trend === 'falling' ? t.trendFalling : t.trendFlat}
            </span>
            <span>{formatStr(t.riskScoreLabel, { val: stats.riskScore })}</span>
          </div>
        </>
      ) : (
        <div className="pred-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '28px 0' }}>
          {isPredicting ? <RefreshCw className="spin" size={22} /> : <Orbit size={22} />}
          {isPredicting ? t.runningAIAnalysis : t.startCaptureForPred}
        </div>
      )}
    </div>
  );
}
