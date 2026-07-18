"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Lock,
  CreditCard,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Globe,
  Shield,
  Sparkles,
  ChevronRight,
  Check,
  X,
  Download,
} from "lucide-react";
import { updatePassword, updateProfile } from "./actions";
import { createClient } from "@/utils/supabase/client";
import { useIsMobileFlag } from "../_hooks/useIsMobile";
import { usePwa } from "../../components/pwa/PwaProvider";
import {
  buildTimezoneOptions,
  getTimezoneOption,
  normalizeTimezone,
  writeStoredTimezone,
  readStoredTimezone,
  formatTimeInZone,
  MARKET_TIMEZONE,
} from "../_lib/timezone-options";
import styles from "./Settings.module.css";

type TabId = "profile" | "security" | "subscription";

export default function SettingsClient({ user, profile, subscription }: any) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const isMobile = useIsMobileFlag();
  const { openInstallSheet, isInstalled, canInstall } = usePwa();

  const deviceTz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : MARKET_TIMEZONE;

  const initialTz = useMemo(() => {
    const fromProfile = profile?.timezone as string | undefined;
    const fromStore = typeof window !== "undefined" ? readStoredTimezone() : null;
    return normalizeTimezone(fromProfile || fromStore || deviceTz || MARKET_TIMEZONE);
  }, [profile?.timezone, deviceTz]);

  const [timezone, setTimezone] = useState(initialTz);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Sync when profile loads / hydration
  useEffect(() => {
    setTimezone(initialTz);
    writeStoredTimezone(initialTz);
  }, [initialTz]);

  const tzOptions = useMemo(() => buildTimezoneOptions(deviceTz), [deviceTz]);
  // Ensure current value is always in the list
  const optionsWithCurrent = useMemo(() => {
    if (tzOptions.some(o => o.value === timezone)) return tzOptions;
    const extra = getTimezoneOption(timezone);
    return [extra, ...tzOptions];
  }, [tzOptions, timezone]);

  const selectedOpt = getTimezoneOption(timezone);
  const marketClock = formatTimeInZone(MARKET_TIMEZONE);
  const userClock = formatTimeInZone(timezone);

  const email = user?.email || "";
  const initials = useMemo(() => {
    const base = (email || "U").split("@")[0] || "U";
    return base.slice(0, 2).toUpperCase();
  }, [email]);

  const planState = useMemo(() => {
    if (profile?.is_admin) {
      return {
        kind: "admin" as const,
        title: "Admin lifetime",
        desc: "Permanent admin access to the platform.",
        badge: "Admin",
      };
    }
    if (subscription && (subscription.status === "active" || subscription.status === "trial")) {
      const until = subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString()
        : "—";
      const isTrial = subscription.status === "trial";
      return {
        kind: isTrial ? ("trial" as const) : ("active" as const),
        title: isTrial ? "Trial Access · Active" : "Pro plan · Active",
        desc: `Active until ${until}.`,
        badge: isTrial ? "Trial" : "Pro",
      };
    }
    return {
      kind: "none" as const,
      title: "No active plan",
      desc: "Subscribe to unlock live AI signals.",
      badge: "Free",
    };
  }, [profile?.is_admin, subscription]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const onPasswordSubmit = async (formData: FormData) => {
    setLoading(true);
    setMessage(null);
    const res = await updatePassword(formData);
    setLoading(false);
    if (res.error) setMessage({ type: "error", text: res.error });
    else if (res.success) {
      setMessage({ type: "success", text: res.success });
      const form = document.getElementById("password-form") as HTMLFormElement | null;
      form?.reset();
    }
  };

  const onProfileSubmit = async (formData: FormData) => {
    setLoading(true);
    setMessage(null);
    // Always send controlled timezone value
    formData.set("timezone", normalizeTimezone(timezone));
    const res = await updateProfile(formData);
    setLoading(false);
    if (res.error) setMessage({ type: "error", text: res.error });
    else if (res.success) {
      writeStoredTimezone(timezone);
      setMessage({ type: "success", text: res.success });
    }
  };

  const pickTimezone = (value: string) => {
    const next = normalizeTimezone(value);
    setTimezone(next);
    writeStoredTimezone(next);
    setPickerOpen(false);
  };

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setMessage(null);
  };

  const MessageBanner = () =>
    message ? (
      <div className={`${styles.toast} ${message.type === "success" ? styles.toastOk : styles.toastErr}`}>
        {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        <span>{message.text}</span>
      </div>
    ) : null;

  /** Desktop: real native select (controlled). */
  const DesktopTimezoneSelect = () => (
    <select
      name="timezone"
      className={styles.select}
      value={timezone}
      onChange={e => {
        const next = normalizeTimezone(e.target.value);
        setTimezone(next);
        writeStoredTimezone(next);
      }}
    >
      {optionsWithCurrent.map(o => (
        <option key={o.value} value={o.value}>
          {o.label} {o.offset ? `(${o.offset})` : ""}
        </option>
      ))}
    </select>
  );

  /** Mobile: tappable row opens native-feeling sheet; hidden input submits value. */
  const MobileTimezoneField = () => (
    <div className={styles.field}>
      <label className={styles.label}>
        <Globe size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
        Timezone
      </label>
      <input type="hidden" name="timezone" value={timezone} />
      <button
        type="button"
        className={styles.tzTrigger}
        onClick={() => setPickerOpen(true)}
      >
        <div className={styles.tzTriggerMain}>
          <strong>{selectedOpt.short || selectedOpt.value}</strong>
          <span>{selectedOpt.value}</span>
        </div>
        <div className={styles.tzTriggerRight}>
          <em>{userClock}</em>
          <ChevronRight size={18} />
        </div>
      </button>
      <p className={styles.hint}>
        Your clock: <b style={{ color: "#e8eeff" }}>{userClock}</b>
        {" · "}
        Market peak hours use <b style={{ color: "#00ffd5" }}>Asia/Colombo</b> ({marketClock})
      </p>
    </div>
  );

  const TimezoneSheet = () =>
    pickerOpen ? (
      <div className={styles.sheetRoot} role="dialog" aria-modal="true" aria-label="Select timezone">
        <button type="button" className={styles.sheetBg} onClick={() => setPickerOpen(false)} aria-label="Close" />
        <div className={styles.sheet}>
          <div className={styles.sheetHandle} />
          <div className={styles.sheetHead}>
            <div>
              <div className={styles.sheetTitle}>Timezone</div>
              <div className={styles.sheetSub}>Choose your local clock</div>
            </div>
            <button type="button" className={styles.mobIconBtn} onClick={() => setPickerOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className={styles.sheetList}>
            {optionsWithCurrent.map(o => {
              const on = o.value === timezone;
              const clock = formatTimeInZone(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.sheetItem} ${on ? styles.sheetItemOn : ""}`}
                  onClick={() => pickTimezone(o.value)}
                >
                  <div className={styles.sheetItemText}>
                    <strong>{o.short}</strong>
                    <span>{o.label}</span>
                    {o.offset ? <em>{o.offset}</em> : null}
                  </div>
                  <div className={styles.sheetItemRight}>
                    <span className={styles.sheetClock}>{clock}</span>
                    {on ? <Check size={18} color="#00ffd5" /> : <span className={styles.sheetRadio} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    ) : null;

  const ProfileForm = ({ mobile }: { mobile: boolean }) => (
    <form action={onProfileSubmit}>
      {mobile ? (
        <div className={styles.group}>
          <div className={styles.groupHead}>Account</div>
          <div className={styles.groupBody}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} type="email" value={email} disabled readOnly />
              <p className={styles.hint}>Email cannot be changed here.</p>
            </div>
            <MobileTimezoneField />
            <button type="submit" className={styles.cta} disabled={loading}>
              {loading && <Loader2 size={16} className={styles.spin} />}
              Save changes
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2>Profile information</h2>
          <div className={styles.deskField}>
            <label>Email address</label>
            <input className={styles.input} type="email" value={email} disabled readOnly />
            <p>Your email address cannot be changed at this time.</p>
          </div>
          <div className={styles.deskField}>
            <label>Timezone</label>
            <DesktopTimezoneSelect />
            <p>
              Your local clock: <strong style={{ color: "#e8eeff" }}>{userClock}</strong>
              {" · "}
              Peak hours always use Asia/Colombo ({marketClock})
            </p>
          </div>
          <button type="submit" className={styles.deskCta} disabled={loading}>
            {loading && <Loader2 size={16} className={styles.spin} />}
            Save profile changes
          </button>
        </>
      )}
    </form>
  );

  const SecurityForm = ({ mobile }: { mobile: boolean }) => (
    <form id="password-form" action={onPasswordSubmit}>
      {mobile ? (
        <div className={styles.group}>
          <div className={styles.groupHead}>Password</div>
          <div className={styles.groupBody}>
            <div className={styles.field}>
              <label className={styles.label}>New password</label>
              <input
                className={styles.input}
                type="password"
                name="password"
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirm password</label>
              <input
                className={styles.input}
                type="password"
                name="confirmPassword"
                placeholder="Repeat new password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className={styles.cta} disabled={loading}>
              {loading && <Loader2 size={16} className={styles.spin} />}
              Update password
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2>Security</h2>
          <div className={styles.deskField}>
            <label>New password</label>
            <input
              className={styles.input}
              type="password"
              name="password"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>
          <div className={styles.deskField}>
            <label>Confirm new password</label>
            <input
              className={styles.input}
              type="password"
              name="confirmPassword"
              placeholder="Repeat your new password"
              required
              minLength={6}
            />
          </div>
          <button type="submit" className={styles.deskCta} disabled={loading}>
            {loading && <Loader2 size={16} className={styles.spin} />}
            Update password
          </button>
        </>
      )}
    </form>
  );

  const SubscriptionPanel = ({ mobile }: { mobile: boolean }) => {
    const iconClass =
      planState.kind === "admin"
        ? styles.planIconAdmin
        : (planState.kind === "active" || planState.kind === "trial")
          ? styles.planIconOk
          : styles.planIconBad;

    return (
      <>
        {!mobile && <h2>Subscription</h2>}
        <div className={mobile ? styles.group : undefined}>
          {mobile && <div className={styles.groupHead}>Plan</div>}
          <div className={mobile ? styles.groupBody : undefined} style={mobile ? undefined : { display: "flex", flexDirection: "column", gap: 16 }}>
            <div className={styles.planCard}>
              <div className={`${styles.planIcon} ${iconClass}`}>
                {planState.kind === "none" ? <AlertTriangle size={22} /> : <CreditCard size={22} />}
              </div>
              <div>
                <h3 className={styles.planTitle}>{planState.title}</h3>
                <p className={styles.planDesc}>{planState.desc}</p>
              </div>
            </div>

            {!profile?.is_admin && (
              <>
                <p className={styles.hint} style={{ marginTop: mobile ? 0 : 4 }}>
                  Manage billing, payment method, or cancel via the pricing portal.
                </p>
                <a
                  href="/pricing"
                  className={mobile ? styles.ctaSecondary : styles.deskCta}
                  style={
                    !mobile
                      ? {
                          textDecoration: "none",
                          background: "rgba(255,255,255,0.06)",
                          color: "#e8eeff",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }
                      : undefined
                  }
                >
                  <Sparkles size={16} />
                  Pricing & billing
                </a>
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  /* ───────── Mobile native ───────── */
  if (isMobile) {
    return (
      <div className={styles.mob}>
        <header className={styles.mobBar}>
          <button
            type="button"
            className={styles.mobIconBtn}
            onClick={() => router.push("/app")}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div className={styles.mobBarTitles}>
            <span className={styles.mobBarTitle}>Profile & Settings</span>
            <span className={styles.mobBarSub}>{email || "Account"}</span>
          </div>
          <button
            type="button"
            className={styles.mobIconBtn}
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>

        <div className={styles.mobScroll}>
          <section className={styles.hero}>
            <div className={styles.avatar} aria-hidden>
              {initials}
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.heroEmail}>{email || "User"}</div>
              <span
                className={[
                  styles.heroStatus,
                  planState.kind === "admin"
                    ? styles.heroStatusAdmin
                    : (planState.kind === "active" || planState.kind === "trial")
                      ? styles.heroStatusActive
                      : styles.heroStatusNone,
                ].join(" ")}
              >
                {planState.kind === "admin" ? <Shield size={11} /> : null}
                {planState.badge}
              </span>
            </div>
          </section>

          <nav className={styles.seg} aria-label="Settings sections">
            {(
              [
                { id: "profile" as const, icon: <User size={14} />, label: "Profile" },
                { id: "security" as const, icon: <Lock size={14} />, label: "Security" },
                { id: "subscription" as const, icon: <CreditCard size={14} />, label: "Plan" },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.segBtn} ${activeTab === tab.id ? styles.segBtnOn : ""}`}
                onClick={() => switchTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <MessageBanner />

          {activeTab === "profile" && <ProfileForm mobile />}
          {activeTab === "security" && <SecurityForm mobile />}
          {activeTab === "subscription" && <SubscriptionPanel mobile />}

          {!isInstalled && (
            <div className={styles.group}>
              <div className={styles.groupHead}>Mobile app</div>
              <div className={styles.groupBody}>
                <p className={styles.hint} style={{ marginBottom: 0 }}>
                  Install CrashTracker on your home screen for a native app experience.
                </p>
                <button
                  type="button"
                  className={styles.ctaSecondary}
                  onClick={() => openInstallSheet("manual")}
                >
                  <Download size={16} />
                  {canInstall ? "Install app" : "How to install"}
                </button>
              </div>
            </div>
          )}

          <div className={styles.dangerZone}>
            <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>

        <TimezoneSheet />
      </div>
    );
  }

  /* ───────── Desktop ───────── */
  return (
    <div className={styles.desk}>
      <header className={styles.deskTop}>
        <Link href="/app" className={styles.deskBack}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
      </header>

      <div className={styles.deskBody}>
        <h1 className={styles.deskTitle}>Settings</h1>
        <p className={styles.deskSub}>Manage profile, security, and subscription.</p>

        <MessageBanner />

        <div className={styles.deskLayout}>
          <nav className={styles.deskNav}>
            <button
              type="button"
              className={`${styles.deskNavBtn} ${activeTab === "profile" ? styles.deskNavBtnOn : ""}`}
              onClick={() => switchTab("profile")}
            >
              <User size={18} /> Profile
            </button>
            <button
              type="button"
              className={`${styles.deskNavBtn} ${activeTab === "security" ? styles.deskNavBtnOn : ""}`}
              onClick={() => switchTab("security")}
            >
              <Lock size={18} /> Security
            </button>
            <button
              type="button"
              className={`${styles.deskNavBtn} ${activeTab === "subscription" ? styles.deskNavBtnOn : ""}`}
              onClick={() => switchTab("subscription")}
            >
              <CreditCard size={18} /> Subscription
            </button>
            <div className={styles.deskNavDivider} />
            <button
              type="button"
              className={`${styles.deskNavBtn} ${styles.deskNavDanger}`}
              onClick={handleSignOut}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </nav>

          <div className={styles.deskPanel}>
            {activeTab === "profile" && <ProfileForm mobile={false} />}
            {activeTab === "security" && <SecurityForm mobile={false} />}
            {activeTab === "subscription" && <SubscriptionPanel mobile={false} />}
          </div>
        </div>
      </div>
    </div>
  );
}
