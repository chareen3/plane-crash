import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Activity, Target, Layers, Clock, Menu, X, User, LogOut, Settings, RefreshCw, Zap, ShieldCheck, Info, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { type Translations, type LanguageCode } from "@/lib/locales";
import { type Round, type ToastMessage } from "../_lib/dashboard-types";
import { ConnectionStatus } from "./ConnectionStatus";
import { BetControls } from "./BetControls";
import { LiveSignalCard } from "./LiveSignalCard";
import { LanguageSwitcher } from "./LanguageSwitcher";
import SafePlayModal from "../SafePlayModal";
import { NAV_HREF, type NavId } from "../_context/DashboardContext";

interface DashboardShellProps {
  activeNav: string;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  isAdmin: boolean;
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  handleLogout: () => Promise<void>;
  lang: LanguageCode;
  handleLangChange: (lang: LanguageCode) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  latency: number;
  lastSyncedRound: number | null;
  triggerReconnect: () => void;
  liveData: { multiplierText?: string; timerText?: string; state?: string } | null;
  lastCrash: Round | null;
  betAmount: string;
  isPredicting: boolean;
  runPrediction: () => void;
  roundsLength: number;
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
  t: Translations;
  children: React.ReactNode;
}

export function DashboardShell({
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
  lastSyncedRound,
  triggerReconnect,
  liveData,
  lastCrash,
  betAmount,
  isPredicting,
  runPrediction,
  roundsLength,
  toasts,
  removeToast,
  t,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const navItems: { id: NavId; icon: React.ReactNode; label: string; href: string }[] = [
    { id: 'dashboard', icon: <Home size={18} />, label: t.navDashboard, href: NAV_HREF.dashboard },
    { id: 'live', icon: <Activity size={18} />, label: t.navLiveFeed, href: NAV_HREF.live },
    { id: 'targets', icon: <Target size={18} />, label: t.navTargets, href: NAV_HREF.targets },
    { id: 'patterns', icon: <Layers size={18} />, label: t.navPatterns, href: NAV_HREF.patterns },
    { id: 'history', icon: <Clock size={18} />, label: t.navHistory, href: NAV_HREF.history },
  ];

  const go = (href: string) => {
    setMobileDrawerOpen(false);
    router.push(href);
  };

  return (
    <div className="dash-shell">
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="sidebar desktop-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <img src="/logo.png" alt="CrashTracker" />
          </div>
          <div className="sidebar-logo-copy">
            <span className="sidebar-logo-text">CrashTracker</span>
            <span className="sidebar-logo-tag">Live AI</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`sidebar-nav-item ui-nav ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setMobileDrawerOpen(false)}
            >
              <span className="nav-icon-wrap">{item.icon}</span>
              <span>{item.label}</span>
              {activeNav === item.id && <span className="nav-active-dot" />}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className="sidebar-nav-item ui-nav admin">
              <span className="nav-icon-wrap"><ShieldCheck size={18} /></span>
              <span>Admin Panel</span>
            </Link>
          )}
          <Link href="/app/settings" className="sidebar-nav-item ui-nav settings-link">
            <span className="nav-icon-wrap"><Settings size={18} /></span>
            <span>Profile & Settings</span>
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <LiveSignalCard
            liveData={liveData}
            lastCrash={lastCrash}
            t={t}
            variant="sidebar"
          />
        </div>
      </aside>

      {/* ─── MOBILE DRAWER (SLIDE-IN SIDEBAR) ─── */}
      <div className={`mobile-drawer-backdrop ${mobileDrawerOpen ? 'open' : ''}`} onClick={() => setMobileDrawerOpen(false)} />
      <div className={`mobile-drawer ${mobileDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="CrashTracker" style={{ width: '22px', height: '22px', borderRadius: '5px', objectFit: 'cover' }} />
            <span className="sidebar-logo-text">CrashTracker</span>
          </div>
          <button className="drawer-close" onClick={() => setMobileDrawerOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
          <div className="drawer-section">
            <h4 className="drawer-section-title">{t.connectionStatus}</h4>
            <ConnectionStatus
              connectionStatus={connectionStatus}
              latency={latency}
              lastSyncedRound={lastSyncedRound}
              triggerReconnect={() => {
                triggerReconnect();
                setMobileDrawerOpen(false);
              }}
              t={t}
              buttonText={t.reconnectSync}
              buttonStyle={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
            />
          </div>

          <div className="drawer-section">
            <h4 className="drawer-section-title">{t.preferences}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: 8 }}>{t.selectLanguage}</span>
                <LanguageSwitcher lang={lang} onChange={handleLangChange} variant="full" />
              </div>
              <BetControls betAmount={betAmount} t={t} variant="row" />
            </div>
          </div>
        </div>

        <div className="drawer-footer" style={{ width: '100%' }}>
          <LiveSignalCard
            liveData={liveData}
            lastCrash={lastCrash}
            t={t}
            variant="drawer"
          />
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="dash-main">
        {/* ─── DESKTOP TOP BAR ─── */}
        <header className="dash-topbar desktop-header modern-header">
          <div className="dash-topbar-left">
            <div className="dash-topbar-title">
              <span className="header-icon-glow" aria-hidden>
                <Sparkles size={15} color="#00ffd5" />
              </span>
              <div className="header-title-stack">
                <span className="header-title-main">{t.appName}</span>
                <span className="dash-topbar-sub">{t.appSub}</span>
              </div>
            </div>
          </div>

          <div className="dash-topbar-actions">
            <div className="header-status-cluster">
              <ConnectionStatus
                connectionStatus={connectionStatus}
                latency={latency}
                lastSyncedRound={lastSyncedRound}
                triggerReconnect={triggerReconnect}
                t={t}
                showButton={connectionStatus !== 'connected'}
              />
              {betAmount ? <BetControls betAmount={betAmount} t={t} variant="badge" /> : null}
            </div>

            <div className="header-tools">
              <LanguageSwitcher lang={lang} onChange={handleLangChange} variant="compact" />

              <button
                type="button"
                className="ui-btn ui-btn-icon accent header-tool-btn"
                onClick={runPrediction}
                disabled={isPredicting || roundsLength === 0}
                title={t.refreshAI}
                aria-label={t.refreshAI}
              >
                {isPredicting ? <RefreshCw size={15} className="spin" /> : <Zap size={15} />}
              </button>

              <SafePlayModal compact />

              <div className="header-profile-wrap">
                <button
                  type="button"
                  className="ui-btn ui-btn-icon header-tool-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  title="Profile"
                  aria-label="Profile"
                >
                  <User size={15} />
                </button>
                {userMenuOpen && (
                  <div className="header-dropdown">
                    <Link href="/app/settings" className="header-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <Settings size={14} /> Profile Settings
                    </Link>
                    <button type="button" className="header-dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ─── MOBILE TOP BAR ─── */}
        <header className="dash-topbar mobile-header modern-header">
          <div className="dash-topbar-left">
            <button type="button" className="ui-btn ui-btn-icon mobile-menu-btn" onClick={() => setMobileDrawerOpen(true)} aria-label="Menu">
              <Menu size={18} />
            </button>
            <div className="dash-topbar-title">
              <div className="sidebar-logo-mark sm">
                <img src="/logo.png" alt="" />
              </div>
              <span className="header-title-main">{t.appName}</span>
            </div>
          </div>

          <div className="dash-topbar-actions mobile-actions">
            <LanguageSwitcher lang={lang} onChange={handleLangChange} variant="compact" />
            <span
              className={`mobile-status-dot ${connectionStatus === 'connected' ? 'connected' : 'disconnected'}`}
              title={connectionStatus === 'connected' ? `${t.synced}: ${latency}ms` : t.disconnected}
            />
            <button
              type="button"
              className="ui-btn ui-btn-icon accent"
              onClick={runPrediction}
              disabled={isPredicting || roundsLength === 0}
              aria-label={t.refreshAI}
            >
              {isPredicting ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
            </button>
            <SafePlayModal compact />
          </div>
        </header>

        {/* ─── MOBILE LIVE STATUS BAR ─── */}
        <LiveSignalCard
          liveData={liveData}
          lastCrash={lastCrash}
          t={t}
          variant="mobile-bar"
        />

        {/* ─── BODY ─── */}
        <div className="dash-body">
          {children}
        </div>
      </div>

      {/* ─── TOASTER ─── */}
      <div className="toaster-container">
        {toasts.map(toast => {
          let IconComponent = Info;
          if (toast.type === 'success') IconComponent = CheckCircle2;
          if (toast.type === 'error') IconComponent = AlertTriangle;
          if (toast.type === 'warning') IconComponent = AlertTriangle;

          return (
            <div key={toast.id} className={`toast-card toast-${toast.type}`}>
              <div className={`toast-icon ${toast.type}`}>
                <IconComponent size={18} />
              </div>
              <div className="toast-content">
                <span className="toast-message">{toast.message}</span>
                {toast.type === 'error' && (
                  <div className="toast-actions">
                    <button className="toast-btn accent" onClick={() => {
                      triggerReconnect();
                      removeToast(toast.id);
                    }}>
                      {t.reconnect}
                    </button>
                  </div>
                )}
              </div>
              <button className="toast-close" onClick={() => removeToast(toast.id)}>
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {/* ─── BOTTOM TAB BAR (MOBILE ONLY) ─── */}
      <div className="mobile-tabbar">
        {navItems.map(item => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => go(item.href)}
            >
              <div className="tab-icon-wrapper">
                {item.icon}
              </div>
              <span className="tab-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
