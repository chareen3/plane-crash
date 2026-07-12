import Link from "next/link";
import { Home, Activity, Target, Layers, Clock, Menu, X, User, LogOut, Settings, RefreshCw, Zap, ShieldCheck, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { type Translations, type LanguageCode, LANGUAGE_NAMES } from "@/lib/locales";
import { type Round, type ToastMessage } from "../_lib/dashboard-types";
import { ConnectionStatus } from "./ConnectionStatus";
import { BetControls } from "./BetControls";
import { LiveSignalCard } from "./LiveSignalCard";
import SafePlayModal from "../SafePlayModal";

interface DashboardShellProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
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
  setActiveNav,
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
  const navItems = [
    { id: 'dashboard', icon: <Home size={18} />, label: t.navDashboard },
    { id: 'live', icon: <Activity size={18} />, label: t.navLiveFeed },
    { id: 'targets', icon: <Target size={18} />, label: t.navTargets },
    { id: 'patterns', icon: <Layers size={18} />, label: t.navPatterns },
    { id: 'history', icon: <Clock size={18} />, label: t.navHistory },
  ];

  return (
    <div className="dash-shell">
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="sidebar desktop-sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="CrashTracker" style={{ width: '22px', height: '22px', borderRadius: '5px', objectFit: 'cover' }} />
          <span className="sidebar-logo-text">CrashTracker</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          {isAdmin && (
            <Link href="/admin" className="sidebar-nav-item" style={{ color: '#a78bfa' }}>
              <ShieldCheck size={18} />
              <span>Admin Panel</span>
            </Link>
          )}
          <Link href="/app/settings" className="sidebar-nav-item" style={{ marginTop: 'auto', paddingTop: 20 }}>
            <Settings size={18} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t.selectLanguage}</span>
                <select
                  value={lang}
                  onChange={(e) => handleLangChange(e.target.value as LanguageCode)}
                  className="currency-select"
                  style={{ width: 'auto', background: 'rgba(255,255,255,0.05)' }}
                >
                  {Object.entries(LANGUAGE_NAMES).map(([k, name]) => (
                    <option key={k} value={k} style={{ background: '#0f111a' }}>{name}</option>
                  ))}
                </select>
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
        <header className="dash-topbar desktop-header">
          <div className="dash-topbar-title">
            <Activity size={18} color="#00ffd5" />
            <span>{t.appName}</span>
            <span className="dash-topbar-sub">{t.appSub}</span>
          </div>

          <div className="dash-topbar-actions">
            <BetControls betAmount={betAmount} t={t} variant="badge" />

            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value as LanguageCode)}
              className="currency-select"
            >
              {Object.entries(LANGUAGE_NAMES).map(([k, name]) => (
                <option key={k} value={k} style={{ background: '#0f111a' }}>{name}</option>
              ))}
            </select>

            <ConnectionStatus
              connectionStatus={connectionStatus}
              latency={latency}
              lastSyncedRound={lastSyncedRound}
              triggerReconnect={triggerReconnect}
              t={t}
            />

            <SafePlayModal />

            <div style={{ position: 'relative' }}>
              <button className="top-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <User size={14} /> Profile
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '200px',
                  backgroundColor: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '12px',
                  padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                  <Link href="/app/settings" className="sidebar-nav-item" style={{ padding: '10px 12px', fontSize: '13px' }}>
                    <Settings size={14} /> Profile Settings
                  </Link>
                  <button className="sidebar-nav-item" onClick={handleLogout} style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--red)' }}>
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── MOBILE TOP BAR ─── */}
        <header className="dash-topbar mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-menu-btn" onClick={() => setMobileDrawerOpen(true)}>
              <Menu size={22} color="#fff" />
            </button>
            <div className="dash-topbar-title">
              <img src="/logo.png" alt="CrashTracker" style={{ width: '20px', height: '20px', borderRadius: '5px', objectFit: 'cover' }} />
              <span className="sidebar-logo-text">{t.appName}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {connectionStatus === 'connected' ? (
              <span className="mobile-status-dot connected" title={`${t.synced}: ${latency}ms`} />
            ) : (
              <span className="mobile-status-dot disconnected" title={t.disconnected} />
            )}

            <button className="mobile-action-btn" onClick={runPrediction} disabled={isPredicting || roundsLength === 0}>
              {isPredicting ? <RefreshCw size={14} className="spin" color="#00ffd5" /> : <Zap size={14} color="#00ffd5" />}
            </button>
            <SafePlayModal />
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
              className={`mobile-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
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
