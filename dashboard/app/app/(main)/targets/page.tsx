"use client";

import { useDashboard } from "../../_context/DashboardContext";
import { TargetsPage } from "../../_components/TargetsPage";

export default function TargetsRoutePage() {
  const d = useDashboard();
  return (
    <TargetsPage
      rounds={d.rounds}
      stats={d.stats}
      prediction={d.prediction}
      lang={d.lang}
      t={d.t}
    />
  );
}
