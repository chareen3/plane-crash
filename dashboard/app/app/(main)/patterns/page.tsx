"use client";

import { useDashboard } from "../../_context/DashboardContext";
import { PatternsPage } from "../../_components/PatternsPage";

export default function PatternsRoutePage() {
  const d = useDashboard();
  return (
    <PatternsPage
      rounds={d.rounds}
      stats={d.stats}
      prediction={d.prediction}
      lang={d.lang}
      t={d.t}
    />
  );
}
