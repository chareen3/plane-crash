import { Users } from "lucide-react";
import { type Translations } from "@/lib/locales";
import { type Round } from "../_lib/dashboard-types";
import { classifyRisk, timeAgo } from "../_lib/dashboard-helpers";

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

interface LiveSignalCardProps {
  liveData: { multiplierText?: string; timerText?: string; state?: string } | null;
  lastCrash: Round | null;
  t: Translations;
  variant: 'sidebar' | 'drawer' | 'mobile-bar';
}

export function LiveSignalCard({ liveData, lastCrash, t, variant }: LiveSignalCardProps) {
  const isWidgetActive = liveData?.state === 'active';

  const formatStr = (str: string, values: Record<string, string | number>) => {
    let result = str;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(val));
    }
    return result;
  };

  if (variant === 'mobile-bar') {
    const riskColor = classifyRisk(Number(lastCrash?.crash_point ?? 0));
    const labelColor = isWidgetActive
      ? '#38bdf8'
      : riskColor === 'green'
      ? '#00e5a0'
      : riskColor === 'yellow'
      ? '#ffd000'
      : '#ff3366';

    return (
      <div className="mobile-live-status-bar">
        <div className="mlsb-container">
          <div className="mlsb-plane-wrapper">
            <JetPlaneIcon
              size={20}
              className={isWidgetActive ? 'widget-plane-icon active' : 'widget-plane-icon crashed'}
            />
          </div>
          <div className="mlsb-info">
            <span className="mlsb-label" style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isWidgetActive ? t.liveMultiplier : t.roundCrashed}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mlsb-val" style={{ color: labelColor }}>
                {isWidgetActive ? (liveData?.multiplierText || '1.00x') : (lastCrash ? Number(lastCrash.crash_point).toFixed(2) + 'x' : '—')}
              </span>
              {!isWidgetActive && lastCrash?.player_count && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                  <Users size={10} color="#38bdf8" />
                  {lastCrash.player_count}
                </span>
              )}
            </div>
          </div>
          {isWidgetActive && liveData?.timerText && (
            <div className="mlsb-timer">{formatStr(t.nextFlightIn, { timer: liveData.timerText })}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`live-crash-widget ${isWidgetActive ? 'widget-active' : 'widget-crashed'}`} style={variant === 'drawer' ? { width: '100%' } : undefined}>
      <div className={`widget-game-label ${isWidgetActive ? 'active' : 'crashed'}`}>
        {t.gameTitle}
      </div>

      <div className={`widget-radar-ring ${isWidgetActive ? 'active' : ''}`}>
        {variant === 'sidebar' ? (
          <img
            src="https://images.dwncdn.net/images/t_app-icon-l/p/4855e891-8e6b-48b7-b768-507340e6ac23/418101296/crash-predictor-aviator-logo"
            alt="Crash Predictor"
            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <JetPlaneIcon
            size={32}
            className={`widget-plane-icon ${isWidgetActive ? 'active' : 'crashed'}`}
          />
        )}
      </div>

      <div className="widget-multiplier-box">
        <div className="widget-state-sub">
          {isWidgetActive ? t.liveMultiplier : t.roundCrashed}
        </div>
        <div className={`widget-mult-val ${isWidgetActive ? 'active' : 'crashed'}`} style={variant === 'drawer' ? { fontSize: '30px' } : undefined}>
          {isWidgetActive ?
            (liveData.multiplierText || '1.00x') :
            (lastCrash ? `${Number(lastCrash.crash_point).toFixed(2)}x` : '—')
          }
        </div>
        <div className="widget-time-ago">
          {isWidgetActive ? t.flyingSupersonic :
            liveData?.timerText ? formatStr(t.nextFlightIn, { timer: liveData.timerText }) :
              (lastCrash ? timeAgo(lastCrash.created_at, t) : t.telemetryStandby)}
        </div>
        {!isWidgetActive && !liveData?.timerText && lastCrash?.player_count && (
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Users size={12} color="#38bdf8" />
            <span>Number of bets: {lastCrash.player_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}
