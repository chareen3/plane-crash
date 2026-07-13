"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { DashboardProvider, navIdFromPath, useDashboard } from "../_context/DashboardContext";
import { MOBILE_BREAKPOINT, useIsMobile } from "../_hooks/useIsMobile";
import { DashboardShell } from "./DashboardShell";
import { MobileShell } from "./mobile/MobileShell";
import { ShellBoot } from "./ShellBoot";

const MobileUIContext = createContext(false);

/** True when mobile-native shell is active (use for view branching). */
export function useMobileUI(): boolean {
  return useContext(MobileUIContext);
}

function ShellWithNav({
  children,
  initialIsMobile,
}: {
  children: React.ReactNode;
  initialIsMobile: boolean;
}) {
  const pathname = usePathname();
  const d = useDashboard();
  const { isMobile, ready } = useIsMobile(MOBILE_BREAKPOINT, initialIsMobile);
  const activeNav = navIdFromPath(pathname);

  // Wait for client detection so refresh never paints the desktop shell on phones
  if (!ready) {
    return <ShellBoot />;
  }

  if (isMobile) {
    return (
      <MobileUIContext.Provider value={true}>
        <MobileShell
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
          liveData={d.liveData}
          lastCrash={d.lastCrash}
          toasts={d.toasts}
          removeToast={d.removeToast}
          t={d.t}
        >
          {children}
        </MobileShell>
      </MobileUIContext.Provider>
    );
  }

  return (
    <MobileUIContext.Provider value={false}>
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
    </MobileUIContext.Provider>
  );
}

export function DashboardRoot({
  children,
  initialIsMobile = false,
}: {
  children: React.ReactNode;
  /** From ct_mobile cookie — keeps SSR/hydration aligned after first visit */
  initialIsMobile?: boolean;
}) {
  return (
    <DashboardProvider>
      <ShellWithNav initialIsMobile={initialIsMobile}>{children}</ShellWithNav>
    </DashboardProvider>
  );
}
