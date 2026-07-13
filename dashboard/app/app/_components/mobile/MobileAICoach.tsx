"use client";

import { useMemo } from "react";
import {
  AlertTriangle, BarChart3, Bot, CheckCircle2, Gauge, Moon, RefreshCw,
  Scale, ShieldAlert, ShieldCheck, Sparkles, Target,
} from "lucide-react";
import { type Translations, type LanguageCode } from "@/lib/locales";
import { type CrashStats } from "@/lib/stats";
import { getLKTimeData } from "@/lib/ai";
import { type Prediction } from "../../_lib/dashboard-types";
import { riskKey, riskTone, safeCashout } from "../../_lib/normalize-prediction";
import { getPeakPhaseMeta, getPeakTagStyle, resolvePeakPhase } from "../../_lib/peak-phase";
import {
  MARKET_TIMEZONE,
  formatTimeInZone,
  getTimezoneOffsetLabel,
  readStoredTimezone,
  normalizeTimezone,
} from "../../_lib/timezone-options";
import styles from "./MobileAICoach.module.css";

interface MobileAICoachProps {
  prediction: Prediction | null;
  stats: CrashStats | null;
  isPredicting: boolean;
  predStatus: "idle" | "predicting" | "done";
  timeData: any;
  getTargetStats: (target: number | undefined | null) => { hitRate: number; ev: number };
  lang: LanguageCode;
  t: Translations;
}

/**
 * Mobile-native AI Risk Coach & Probability Estimator.
 * Styles live in MobileAICoach.module.css (scoped) so the card never renders unstyled.
 */
export function MobileAICoach({
  prediction,
  stats,
  isPredicting,
  predStatus,
  timeData,
  getTargetStats,
  lang,
  t,
}: MobileAICoachProps) {
  const formatStr = (str: string, values: Record<string, string | number>) => {
    let result = str;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(val));
    }
    return result;
  };

  const liveStats = stats ?? prediction?.stats ?? null;
  const isSkip =
    !!prediction &&
    (prediction.strategy === "SKIP" || prediction.should_bet === false);
  const rk = riskKey(prediction?.risk ?? prediction?.predicted_risk);
  const tone = riskTone(rk); // green | yellow | red

  // Peak hours always use Colombo market phase (same as desktop) — not user profile TZ
  const peak = useMemo(() => {
    const td = timeData && typeof timeData === "object" ? timeData : null;
    const live = getLKTimeData();
    const lkPhase = resolvePeakPhase(td?.lkPhase || live.lkPhase);
    const currentUTCHour = td?.currentUTCHour ?? live.currentUTCHour;
    const peakHours = td?.peakHours || live.peakHours;
    const currentPeak =
      td?.currentPeak ||
      live.currentPeak ||
      (Array.isArray(peakHours)
        ? peakHours.find((p: any) => p.hour === currentUTCHour)
        : null);

    const userTz = normalizeTimezone(
      readStoredTimezone() ||
        (typeof window !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : MARKET_TIMEZONE),
    );

    return {
      lkPhase,
      isLKPrime: lkPhase === "PRIME",
      isLKSleep: Boolean(td?.isLKSleep ?? live.isLKSleep),
      currentLKTimeStr: td?.currentLKTimeStr || live.currentLKTimeStr || formatTimeInZone(MARKET_TIMEZONE),
      lkNote: td?.lkNote || live.lkNote || "",
      currentPeak,
      // Market (engine) timezone — fixed
      marketTz: MARKET_TIMEZONE,
      marketOffset: "UTC+5:30",
      marketLabel: "Asia/Colombo",
      // User preference (display only)
      userTz,
      userTime: formatTimeInZone(userTz),
      userOffset: getTimezoneOffsetLabel(userTz),
    };
  }, [timeData]);

  const phaseMeta = getPeakPhaseMeta(peak.lkPhase);
  const peakTag = String(peak.currentPeak?.tag || (peak.isLKPrime ? "PEAK" : "NORM")).toUpperCase();
  const tagStyle = getPeakTagStyle(peakTag);
  const peakScore = Number(peak.currentPeak?.score);
  const peakBarW = Number.isFinite(peakScore)
    ? Math.min(100, Math.max(12, peakScore))
    : peak.isLKPrime
      ? 85
      : peak.lkPhase === "EVENING"
        ? 60
        : peak.lkPhase === "MORNING"
          ? 35
          : peak.lkPhase === "DAY"
            ? 50
            : 25;

  const shellClass = [
    styles.coach,
    tone === "red" ? styles.coachHigh : tone === "green" ? styles.coachLow : styles.coachMed,
  ].join(" ");

  const riskBadgeClass = [
    styles.badge,
    tone === "red" ? styles.badgeHigh : tone === "green" ? styles.badgeLow : styles.badgeMed,
  ].join(" ");

  const phase = prediction?.volatility_phase
    ? String(prediction.volatility_phase).toUpperCase()
    : "";
  const phaseBadgeClass = [
    styles.badge,
    phase === "CALM"
      ? styles.badgePhaseCalm
      : phase === "VOLATILE"
        ? styles.badgePhaseVolatile
        : styles.badgePhaseNormal,
  ].join(" ");

  const busy = predStatus === "predicting" || isPredicting;
  const ready = predStatus === "done" || !!prediction;

  const peakTitle =
    lang === "si" ? "උච්ච පැය" : lang === "ta" ? "உச்ச நேரம்" : "Peak hours";
  const peakMarket =
    lang === "si" ? "ශ්‍රී ලංකා වේලාව" : lang === "ta" ? "இலங்கை நேரம்" : "Sri Lanka time";
  const yourTimeLabel =
    lang === "si" ? "ඔබේ වේලාව" : lang === "ta" ? "உங்கள் நேரம்" : "Your time";

  return (
    <section className={shellClass}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <span className={styles.bot} aria-hidden>
            <Bot size={16} strokeWidth={2.2} />
          </span>
          <div className={styles.titleText}>
            <span className={styles.title}>{t.aiCoachTitle}</span>
            <span
              className={[
                styles.status,
                busy ? styles.statusBusy : ready ? styles.statusReady : "",
              ].join(" ")}
            >
              {busy ? (
                <>
                  <RefreshCw size={10} className={styles.spin} /> {t.analyzingDot}
                </>
              ) : ready ? (
                <>
                  <CheckCircle2 size={10} /> {t.ready}
                </>
              ) : (
                t.waiting
              )}
            </span>
          </div>
        </div>
      </div>

      {busy && !prediction && (
        <div className={styles.loading}>
          <RefreshCw size={14} className={styles.spin} />
          <span>{t.analyzingCap}</span>
        </div>
      )}

      {!prediction && !busy && (
        <div className={styles.empty}>
          {t.waitingForCrashData || "Waiting for live signal…"}
        </div>
      )}

      {/* Peak hours — phase colors match desktop TimeSyncCard (always Colombo market) */}
      <div
        className={styles.peak}
        style={{
          background: phaseMeta.bg,
          borderColor: phaseMeta.border,
          boxShadow: `0 0 24px ${phaseMeta.glow}`,
        }}
      >
        <div className={styles.peakTop}>
          <span className={styles.peakTitle} style={{ color: "#f8fafc" }}>
            <Gauge size={12} color={phaseMeta.color} />
            {peakTitle}
          </span>
          <span
            className={styles.peakPhase}
            style={{
              color: phaseMeta.color,
              background: `${phaseMeta.color}18`,
              borderColor: `${phaseMeta.color}40`,
            }}
          >
            {peak.isLKPrime ? (
              <>
                <Sparkles size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> PRIME
              </>
            ) : peak.isLKSleep ? (
              <>
                <Moon size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> SLEEP
              </>
            ) : (
              phaseMeta.label
            )}
          </span>
        </div>

        <div className={styles.peakTzRow}>
          <span
            className={styles.peakTz}
            style={{
              color: phaseMeta.color,
              background: `${phaseMeta.color}18`,
              borderColor: `${phaseMeta.color}40`,
            }}
          >
            {peak.marketLabel}
          </span>
          <span className={styles.peakOffset}>{peak.marketOffset}</span>
          <span className={styles.peakMarket}>{peakMarket}</span>
        </div>

        <div className={styles.peakTimeRow}>
          <span className={styles.peakTime}>{peak.currentLKTimeStr || "—"}</span>
          <span
            className={styles.peakTag}
            style={{
              color: tagStyle.color,
              background: tagStyle.bg,
              borderColor: tagStyle.border,
            }}
          >
            {peakTag}
            {Number.isFinite(peakScore) ? ` ${peakScore}` : ""}
          </span>
        </div>

        {peak.userTz !== MARKET_TIMEZONE && (
          <div className={styles.peakUserTz}>
            <span>{yourTimeLabel}</span>
            <strong>{peak.userTime}</strong>
            <em>{peak.userTz}{peak.userOffset ? ` · ${peak.userOffset}` : ""}</em>
          </div>
        )}

        {peak.lkNote ? <p className={styles.peakNote}>{peak.lkNote}</p> : null}

        {!peak.isLKSleep && (
          <div className={styles.peakBar}>
            <div
              className={styles.peakBarFill}
              style={{
                width: `${peakBarW}%`,
                background: `linear-gradient(90deg, ${phaseMeta.color}, ${phaseMeta.color}80)`,
              }}
            />
          </div>
        )}
      </div>

      {prediction && (
        <>
          <div className={styles.badges}>
            <span className={riskBadgeClass}>
              {rk === "HIGH" ? (
                <AlertTriangle size={11} />
              ) : rk === "MEDIUM" ? (
                <ShieldAlert size={11} />
              ) : (
                <ShieldCheck size={11} />
              )}
              {rk === "HIGH" ? t.riskHigh : rk === "MEDIUM" ? t.riskMedium : t.riskLow}
            </span>
            {phase && (
              <span className={phaseBadgeClass}>
                <BarChart3 size={11} />
                {phase}
              </span>
            )}
            {prediction.should_bet && prediction.recommended_stake_pct != null && (
              <span className={`${styles.badge} ${styles.badgeAi}`}>
                <Target size={11} />
                {formatStr(t.betPercent, { pct: prediction.recommended_stake_pct })}
              </span>
            )}
            <span className={`${styles.badge} ${styles.badgeAi}`}>
              <Bot size={11} /> {t.aiCoachBadge}
            </span>
          </div>

          {(prediction.instant_crash_risk ?? 0) >= 30 && (
            <div className={styles.alert}>
              <AlertTriangle size={16} />
              <div>
                <span className={styles.alertTitle}>
                  {lang === "si"
                    ? "ක්ෂණික අවදානම"
                    : lang === "ta"
                      ? "உடனடி ஆபத்து"
                      : "Instant crash warning"}
                  {" · "}
                  {Number(prediction.instant_crash_risk)}%
                </span>
                <p className={styles.alertBody}>
                  {prediction.instant_crash_warning || t.instantCrashFloor}
                </p>
              </div>
            </div>
          )}

          {prediction.summary ? (
            <p className={styles.summary}>{prediction.summary}</p>
          ) : null}

          {isSkip ? (
            <div
              className={[
                styles.skip,
                timeData?.isLKSleep ? styles.skipSleep : "",
              ].join(" ")}
            >
              <ShieldAlert size={18} />
              <div>
                <span className={styles.skipTitle}>
                  {timeData?.isLKSleep ? t.sleepPhaseTitle : t.skipSignalActive}
                </span>
                <p className={styles.skipBody}>
                  {timeData?.isLKSleep
                    ? t.sleepPhaseDesc
                    : prediction.skip_reason ||
                      prediction.strategy_reason ||
                      (lang === "si"
                        ? "සැසිය ඉහළ අවදානම් රටා පෙන්නුම් කරයි."
                        : "High-risk patterns — do not enter.")}
                </p>
              </div>
            </div>
          ) : (
            <div
              className={[
                styles.targets,
                prediction.swing_target ? styles.targetsDuo : "",
              ].join(" ")}
            >
              {(() => {
                const targetVal = safeCashout(prediction, liveStats?.conservativeCashout);
                const tStats = getTargetStats(targetVal);
                const hit = Number.isFinite(tStats.hitRate) ? tStats.hitRate : 0;
                const ev = Number.isFinite(tStats.ev) ? tStats.ev : 0;
                const evStr = ev >= 0 ? `+${ev.toFixed(3)}` : ev.toFixed(3);
                return (
                  <div className={`${styles.target} ${styles.targetSafe}`}>
                    <div className={styles.ctLabel}>
                      <ShieldCheck size={13} /> {t.safeAutoCashout}
                    </div>
                    <div className={`${styles.ctMult} ${styles.ctMultSafe}`}>
                      {targetVal.toFixed(2)}x
                    </div>
                    <div className={styles.ctMeta}>
                      <span>{formatStr(t.chance, { pct: hit })}</span>
                      <span className={ev >= 0 ? styles.evGood : styles.evBad}>
                        {formatStr(t.expectedProfit, { ev: evStr })}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {prediction.swing_target != null &&
                Number(prediction.swing_target) > 1 &&
                (() => {
                  const swing = Number(prediction.swing_target);
                  const tStats = getTargetStats(swing);
                  const hit = Number.isFinite(tStats.hitRate) ? tStats.hitRate : 0;
                  const ev = Number.isFinite(tStats.ev) ? tStats.ev : 0;
                  const evStr = ev >= 0 ? `+${ev.toFixed(3)}` : ev.toFixed(3);
                  return (
                    <div className={`${styles.target} ${styles.targetSwing}`}>
                      <div className={styles.ctLabel}>
                        <Scale size={13} /> {t.optionalSwing}
                      </div>
                      <div className={`${styles.ctMult} ${styles.ctMultSwing}`}>
                        {swing.toFixed(2)}x
                      </div>
                      <div className={styles.ctMeta}>
                        <span>{formatStr(t.chance, { pct: hit })}</span>
                        <span className={ev >= 0 ? styles.evGood : styles.evBad}>
                          {formatStr(t.expectedProfit, { ev: evStr })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}

          {prediction.long_targets && (
            <div className={styles.long}>
              <div className={styles.longH}>
                {lang === "si"
                  ? "දිගුකාලීන අවස්ථා"
                  : lang === "ta"
                    ? "நீண்ட வாய்ப்புகள்"
                    : "Long-term chances"}
              </div>
              <div className={styles.longGrid}>
                {[
                  { l: "5.0x", v: prediction.long_targets.x5 },
                  { l: "10x", v: prediction.long_targets.x10 },
                  { l: "20x", v: prediction.long_targets.x20 },
                ].map(x => {
                  const pct = Number(x.v);
                  return (
                    <div key={x.l} className={styles.longCell}>
                      <span className={styles.longLabel}>{x.l}</span>
                      <span className={styles.longVal}>
                        {Number.isFinite(pct) ? `${pct}%` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {liveStats?.pInstantCrash != null &&
            !isSkip &&
            Number.isFinite(Number(liveStats.pInstantCrash)) && (
              <div className={styles.floor}>
                <AlertTriangle size={13} />
                <span>
                  <strong>{t.instantCrashFloor}</strong>{" "}
                  {formatStr(t.instantCrashDesc, {
                    pct: Number(liveStats.pInstantCrash).toFixed(1),
                  })}
                </span>
              </div>
            )}

          {liveStats?.p90SafeCashout != null &&
            !isSkip &&
            !prediction.swing_target &&
            Number.isFinite(Number(liveStats.p90SafeCashout)) && (
              <div className={styles.ceiling}>
                <Target size={12} />
                <span>{t.statisticalCeiling}</span>
                <span className={styles.ceilingVal}>
                  {Number(liveStats.p90SafeCashout).toFixed(2)}x
                </span>
              </div>
            )}
        </>
      )}
    </section>
  );
}
