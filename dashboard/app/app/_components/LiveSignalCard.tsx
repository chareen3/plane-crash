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
    style={{ transform: "rotate(-45deg)" }}
  >
    <path d="M12 2L9 9H2L7 13L5 21L12 17L19 21L17 13L22 9H15L12 2Z" />
  </svg>
);

interface LiveSignalCardProps {
  liveData: { multiplierText?: string; timerText?: string; state?: string } | null;
  lastCrash: Round | null;
  t: Translations;
  variant: "sidebar" | "drawer" | "mobile-bar";
}

/** Full real bet count (e.g. 1,248). */
function formatBets(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Math.round(Number(n)).toLocaleString("en-US");
}

export function LiveSignalCard({ liveData, lastCrash, t, variant }: LiveSignalCardProps) {
  const isWidgetActive = liveData?.state === "active";

  const formatStr = (str: string, values: Record<string, string | number>) => {
    let result = str;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(val));
    }
    return result;
  };

  const crashPoint = Number(lastCrash?.crash_point ?? 0);
  const riskColor = classifyRisk(crashPoint);
  const players = lastCrash?.player_count;

  // Mobile header: compact version of desktop radar widget + real bet count
  if (variant === "mobile-bar") {
    return (
      <div
        className={`m-live-widget live-crash-widget ${isWidgetActive ? "widget-active" : "widget-crashed"}`}
      >
        <div className="m-live-widget-row">
          <div className={`m-live-radar widget-radar-ring ${isWidgetActive ? "active" : ""}`}>
            <JetPlaneIcon
              size={22}
              className={`widget-plane-icon ${isWidgetActive ? "active" : "crashed"}`}
            />
          </div>

          <div className="m-live-center">
            <div className={`widget-game-label m-live-label ${isWidgetActive ? "active" : "crashed"}`}>
              {isWidgetActive ? t.liveMultiplier : t.roundCrashed}
              {lastCrash?.round_number != null && (
                <span className="m-live-round">#{lastCrash.round_number}</span>
              )}
            </div>
            <div className={`widget-mult-val m-live-mult ${isWidgetActive ? "active" : "crashed"}`}>
              {isWidgetActive
                ? liveData?.multiplierText || "1.00x"
                : lastCrash
                  ? `${Number(lastCrash.crash_point).toFixed(2)}x`
                  : "—"}
            </div>
            <div className="widget-time-ago m-live-sub">
              {isWidgetActive
                ? t.flyingSupersonic
                : liveData?.timerText
                  ? formatStr(t.nextFlightIn, { timer: liveData.timerText })
                  : lastCrash
                    ? timeAgo(lastCrash.created_at, t)
                    : t.telemetryStandby}
            </div>
          </div>

          <div className="m-live-right">
            {isWidgetActive && liveData?.timerText ? (
              <div className="m-live-timer">
                {liveData.timerText}
                <em>s</em>
              </div>
            ) : players != null && Number(players) > 0 ? (
              <div className="m-live-bets">
                <Users size={13} />
                <strong>{formatBets(players)}</strong>
                <span>bets</span>
              </div>
            ) : (
              <div className="m-live-bets muted">
                <Users size={13} />
                <strong>—</strong>
                <span>bets</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`live-crash-widget ${isWidgetActive ? "widget-active" : "widget-crashed"}`}
      style={variant === "drawer" ? { width: "100%" } : undefined}
    >
      <div className={`widget-game-label ${isWidgetActive ? "active" : "crashed"}`}>
        {t.gameTitle}
      </div>

      <div className={`widget-radar-ring ${isWidgetActive ? "active" : ""}`}>
        {variant === "sidebar" ? (
          <img
            src="https://images.dwncdn.net/images/t_app-icon-l/p/4855e891-8e6b-48b7-b768-507340e6ac23/418101296/crash-predictor-aviator-logo"
            alt="Crash Predictor"
            style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <JetPlaneIcon
            size={32}
            className={`widget-plane-icon ${isWidgetActive ? "active" : "crashed"}`}
          />
        )}
      </div>

      <div className="widget-multiplier-box">
        <div className="widget-state-sub">
          {isWidgetActive ? t.liveMultiplier : t.roundCrashed}
        </div>
        <div
          className={`widget-mult-val ${isWidgetActive ? "active" : "crashed"}`}
          style={variant === "drawer" ? { fontSize: "30px" } : undefined}
        >
          {isWidgetActive
            ? liveData?.multiplierText || "1.00x"
            : lastCrash
              ? `${Number(lastCrash.crash_point).toFixed(2)}x`
              : "—"}
        </div>
        <div className="widget-time-ago">
          {isWidgetActive
            ? t.flyingSupersonic
            : liveData?.timerText
              ? formatStr(t.nextFlightIn, { timer: liveData.timerText })
              : lastCrash
                ? timeAgo(lastCrash.created_at, t)
                : t.telemetryStandby}
        </div>
      </div>
    </div>
  );
}
