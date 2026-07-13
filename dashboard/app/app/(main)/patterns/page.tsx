"use client";

import { useDashboard } from "../../_context/DashboardContext";
import { useMobileUI } from "../../_components/DashboardRoot";
import { PatternsPage } from "../../_components/PatternsPage";
import { MobilePageChrome } from "../../_components/mobile/MobilePageChrome";

export default function PatternsRoutePage() {
  const d = useDashboard();
  const isMobile = useMobileUI();
  const page = (
    <PatternsPage
      rounds={d.rounds}
      stats={d.stats}
      prediction={d.prediction}
      lang={d.lang}
      t={d.t}
    />
  );
  if (isMobile) {
    return (
      <MobilePageChrome title={d.t.navPatterns} subtitle="Streaks · Markov · Active patterns">
        <div className="m-embed">{page}</div>
      </MobilePageChrome>
    );
  }
  return page;
}
