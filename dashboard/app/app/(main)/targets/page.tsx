"use client";

import { useDashboard } from "../../_context/DashboardContext";
import { useMobileUI } from "../../_components/DashboardRoot";
import { TargetsPage } from "../../_components/TargetsPage";
import { MobilePageChrome } from "../../_components/mobile/MobilePageChrome";

export default function TargetsRoutePage() {
  const d = useDashboard();
  const isMobile = useMobileUI();
  const page = (
    <TargetsPage
      rounds={d.rounds}
      stats={d.stats}
      prediction={d.prediction}
      lang={d.lang}
      t={d.t}
    />
  );
  if (isMobile) {
    return (
      <MobilePageChrome title={d.t.navTargets} subtitle="Hit rates · EV · Safe / Swing / Moon">
        <div className="m-embed">{page}</div>
      </MobilePageChrome>
    );
  }
  return page;
}
