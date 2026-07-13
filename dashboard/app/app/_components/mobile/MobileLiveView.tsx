"use client";

import { useDashboard } from "../../_context/DashboardContext";
import { MobilePageChrome } from "./MobilePageChrome";

export function MobileLiveView() {
  const { rounds, prediction, latency, t, lang } = useDashboard();

  return (
    <MobilePageChrome
      title={t.realTimeFeed}
      subtitle={lang === "si" ? "සජීවී වට" : lang === "ta" ? "நேரடி சுற்றுகள்" : "Live rounds stream"}
    >
      <div className="m-card m-live-meta">
        <div><s>Latency</s><b>{latency}ms</b></div>
        <div><s>Rounds</s><b>{rounds.length}</b></div>
        <div><s>Signal</s><b className={prediction?.should_bet === false ? "r" : "g"}>
          {prediction?.strategy ?? "—"}
        </b></div>
      </div>

      <div className="m-card">
        {rounds.length === 0 ? (
          <div className="m-empty">{t.waitingForCrashData}</div>
        ) : (
          <div className="m-crash-list">
            {rounds.slice(0, 40).map((r, i) => {
              const v = Number(r.crash_point);
              const cls = v < 1.15 ? "bad" : v >= 5 ? "moon" : v >= 2 ? "good" : "mid";
              return (
                <div key={r.id ?? `${r.round_number}-${i}`} className={`m-crash-row ${cls}`}>
                  <div className={`m-crash-pip ${cls}`} />
                  <div className="m-crash-row-mid">
                    <div className="m-crash-row-top">
                      <span className="m-crash-rn">#{r.round_number}</span>
                      <span className="m-crash-time">
                        {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <div className={`m-crash-row-mult ${cls}`}>
                    {v.toFixed(2)}
                    <span>x</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobilePageChrome>
  );
}
