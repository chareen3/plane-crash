"use client";

import { usePathname } from "next/navigation";
import { DashboardProvider, navIdFromPath, useDashboard } from "../_context/DashboardContext";
import { DashboardShell } from "./DashboardShell";

function ShellWithNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const d = useDashboard();
  const activeNav = navIdFromPath(pathname);

  return (
    <DashboardShell
      activeNav={activeNav}
      mobileDrawerOpen={d.mobileDrawerOpen}
      setMobileDrawerOpen={d.setMobileDrawerOpen}
      isAdmin={d.isAdmin}
      userMenuOpen={d.userMenuOpen}
      setUserMenuOpen={d.setUserMenuOpen}
      handleLogout={d.handleLogout}
      lang={d.lang}
      handleLangChange={d.handleLangChange}
      connectionStatus={d.connectionStatus}
      latency={d.latency}
      lastSyncedRound={d.lastSyncedRound}
      triggerReconnect={d.triggerReconnect}
      liveData={d.liveData}
      lastCrash={d.lastCrash}
      betAmount={d.betAmount}
      isPredicting={d.isPredicting}
      runPrediction={d.runPrediction}
      roundsLength={d.rounds.length}
      toasts={d.toasts}
      removeToast={d.removeToast}
      t={d.t}
    >
      {children}
    </DashboardShell>
  );
}

export function DashboardRoot({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <ShellWithNav>{children}</ShellWithNav>
    </DashboardProvider>
  );
}
