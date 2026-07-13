"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, Activity, Target, Layers, Clock, Menu, X, LogOut,
  Settings, ShieldCheck, Info, CheckCircle2, AlertTriangle, Download,
} from "lucide-react";
import { type Translations, type LanguageCode } from "@/lib/locales";
import { type Round, type ToastMessage } from "../../_lib/dashboard-types";
import { LiveSignalCard } from "../LiveSignalCard";
import { LanguageSwitcher } from "../LanguageSwitcher";
import SafePlayModal from "../../SafePlayModal";
import { NAV_HREF, type NavId } from "../../_context/DashboardContext";
import { usePwa } from "../../../components/pwa/PwaProvider";

interface MobileShellProps {
  activeNav: string;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  isAdmin: boolean;
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  handleLogout: () => Promise<void>;
  lang: LanguageCode;
  handleLangChange: (lang: LanguageCode) => void;
  connectionStatus: "connecting" | "connected" | "disconnected";
  latency: number;
  liveData: { multiplierText?: string; timerText?: string; state?: string } | null;
  lastCrash: Round | null;
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
  t: Translations;
  children: React.ReactNode;
}

export function MobileShell({
  activeNav,
  mobileDrawerOpen,
  setMobileDrawerOpen,
  isAdmin,
  userMenuOpen,
  setUserMenuOpen,
  handleLogout,
  lang,
  handleLangChange,
  connectionStatus,
  latency,
  liveData,
  lastCrash,
  toasts,
  removeToast,
  t,
  children,
}: MobileShellProps) {
  const router = useRouter();
  const { openInstallSheet, isInstalled, canInstall } = usePwa();

  const tabs: { id: NavId; icon: React.ReactNode; label: string; href: string }[] = [
    { id: "dashboard", icon: <Home size={22} strokeWidth={2.2} />, label: t.navDashboard, href: NAV_HREF.dashboard },
    { id: "live", icon: <Activity size={22} strokeWidth={2.2} />, label: t.navLiveFeed, href: NAV_HREF.live },
    { id: "targets", icon: <Target size={22} strokeWidth={2.2} />, label: t.navTargets, href: NAV_HREF.targets },
    { id: "patterns", icon: <Layers size={22} strokeWidth={2.2} />, label: t.navPatterns, href: NAV_HREF.patterns },
    { id: "history", icon: <Clock size={22} strokeWidth={2.2} />, label: t.navHistory, href: NAV_HREF.history },
  ];

  const titleMap: Record<string, string> = {
    dashboard: t.navDashboard,
    live: t.realTimeFeed,
    targets: t.navTargets,
    patterns: t.navPatterns,
    history: t.navHistory,
  };

  return (
    <div className="m-app">
      {/* Status safe-area + app bar */}
      <header className="m-app-bar">
        <button
          type="button"
          className="m-icon-btn"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Menu"
        >
          <Menu size={22} />
        </button>

        <div className="m-app-bar-center">
          <div className="m-app-logo">
            <img src="/logo.png" alt="" />
          </div>
          <div className="m-app-bar-titles">
            <span className="m-app-title">{titleMap[activeNav] || t.appName}</span>
            <span className={`m-conn-pill ${connectionStatus}`}>
              <i />
              {connectionStatus === "connected"
                ? `${t.synced}${latency > 0 ? ` · ${latency}ms` : ""}`
                : connectionStatus === "connecting"
                  ? t.connecting
                  : t.disconnected}
            </span>
          </div>
        </div>

        <div className="m-app-bar-actions">
          <LanguageSwitcher lang={lang} onChange={handleLangChange} variant="compact" />
          <SafePlayModal compact />
        </div>
      </header>

      {/* Live ticker under app bar */}
      <div className="m-live-strip">
        <LiveSignalCard
          liveData={liveData}
          lastCrash={lastCrash}
          t={t}
          variant="mobile-bar"
        />
      </div>

      {/* Scrollable content */}
      <main className="m-app-body">
        {children}
      </main>

      {/* Native bottom tabs */}
      <nav className="m-tabbar" aria-label="Main">
        {tabs.map(tab => {
          const on = activeNav === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`m-tab ${on ? "on" : ""}`}
              onClick={() => router.push(tab.href)}
            >
              <span className="m-tab-ic">{tab.icon}</span>
              <span className="m-tab-label">{tab.label}</span>
              {on && <span className="m-tab-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Drawer (settings / account) */}
      <div
        className={`m-drawer-bg ${mobileDrawerOpen ? "open" : ""}`}
        onClick={() => setMobileDrawerOpen(false)}
      />
      <aside className={`m-drawer ${mobileDrawerOpen ? "open" : ""}`}>
        <div className="m-drawer-head">
          <div className="m-drawer-brand">
            <div className="m-app-logo lg"><img src="/logo.png" alt="" /></div>
            <div>
              <div className="m-drawer-name">CrashTracker</div>
              <div className="m-drawer-sub">Live AI · Mobile</div>
            </div>
          </div>
          <button type="button" className="m-icon-btn" onClick={() => setMobileDrawerOpen(false)} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="m-drawer-section">
          <div className="m-drawer-label">{t.selectLanguage}</div>
          <LanguageSwitcher lang={lang} onChange={handleLangChange} variant="full" />
        </div>

        <div className="m-drawer-section">
          <div className="m-drawer-label">{t.connectionStatus}</div>
          <div className={`m-conn-card ${connectionStatus}`}>
            <i />
            <div>
              <strong>
                {connectionStatus === "connected" ? t.synced : connectionStatus === "connecting" ? t.connecting : t.disconnected}
              </strong>
              {latency > 0 && connectionStatus === "connected" && (
                <span>{latency}ms latency</span>
              )}
            </div>
          </div>
        </div>

        <div className="m-drawer-links">
          <Link href="/app/settings" className="m-drawer-link" onClick={() => setMobileDrawerOpen(false)}>
            <Settings size={18} /> Profile & Settings
          </Link>
          {!isInstalled && (
            <button
              type="button"
              className="m-drawer-link"
              onClick={() => {
                setMobileDrawerOpen(false);
                openInstallSheet("manual");
              }}
            >
              <Download size={18} /> {canInstall ? "Install app" : "Add to Home Screen"}
            </button>
          )}
          {isAdmin && (
            <Link href="/admin" className="m-drawer-link" onClick={() => setMobileDrawerOpen(false)}>
              <ShieldCheck size={18} /> Admin Panel
            </Link>
          )}
          <button type="button" className="m-drawer-link danger" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Toasts */}
      <div className="m-toaster">
        {toasts.map(toast => {
          let Icon = Info;
          if (toast.type === "success") Icon = CheckCircle2;
          if (toast.type === "error" || toast.type === "warning") Icon = AlertTriangle;
          return (
            <div key={toast.id} className={`m-toast m-toast-${toast.type}`}>
              <Icon size={16} />
              <span>{toast.message}</span>
              <button type="button" onClick={() => removeToast(toast.id)}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
