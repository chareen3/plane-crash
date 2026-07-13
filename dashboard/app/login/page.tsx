"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Mail, Lock, Loader2, AlertCircle, CheckCircle2,
  Eye, EyeOff, Phone, Brain, Shield, TrendingUp, Target,
  Zap, Flame, Sparkles,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import styles from "./Auth.module.css";

const FEATURES = [
  {
    icon: <Brain size={20} />,
    title: "AI Risk Coach",
    desc: "Live risk scoring and cashout guidance from 50+ rounds of telemetry.",
    color: "#a78bfa",
  },
  {
    icon: <Shield size={20} />,
    title: "Discipline-first signals",
    desc: "SKIP when conditions are hostile — protect bankroll, not chase moons.",
    color: "#00e5a0",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Peak hours & patterns",
    desc: "Colombo market phase, streak engines, and target hit rates in one view.",
    color: "#00ffd5",
  },
  {
    icon: <Target size={20} />,
    title: "Smart targets",
    desc: "EV-aware cashout levels tuned for sustainable play, not hype.",
    color: "#ffd000",
  },
];

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/app";
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const urlError = searchParams.get("error");

  const [activeTab, setActiveTab] = useState<"login" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(urlError);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [featureIdx, setFeatureIdx] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setTimezone("UTC");
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFeatureIdx((i) => (i + 1) % FEATURES.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setError(urlError);
  }, [urlError]);

  const switchTab = (tab: "login" | "signup") => {
    setActiveTab(tab);
    setError(null);
    setInfo(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (activeTab === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push(redirectTo.startsWith("/") ? redirectTo : "/app");
      router.refresh();
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        data: {
          timezone,
          is_admin: false,
          mobile: mobile.trim() || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data?.user?.identities?.length === 0) {
      setError("This email is already registered. Please sign in.");
      setLoading(false);
      return;
    }

    // If session exists (email confirm disabled), go in
    if (data.session) {
      router.push(redirectTo.startsWith("/") ? redirectTo : "/app");
      router.refresh();
      return;
    }

    setInfo("Check your email for a verification link to finish registration.");
    setLoading(false);
    setPassword("");
  };

  return (
    <div className={styles.shell}>
      {/* Form */}
      <section className={styles.formSide}>
        <div className={styles.formInner}>
          <Link href="/" className={styles.back}>
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="CrashTracker" width={48} height={48} />
            </div>
            <div className={styles.brandText}>
              <strong>CrashTracker</strong>
              <span>AI Risk Analytics</span>
            </div>
          </div>

          <h1 className={styles.title}>
            {activeTab === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className={styles.subtitle}>
            {activeTab === "login"
              ? "Sign in to open your live dashboard, AI coach, and peak-hour signals."
              : "Join CrashTracker for real-time crash analytics and disciplined risk coaching."}
          </p>

          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "login"}
              className={`${styles.tab} ${activeTab === "login" ? styles.tabOn : ""}`}
              onClick={() => switchTab("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "signup"}
              className={`${styles.tab} ${activeTab === "signup" ? styles.tabOn : ""}`}
              onClick={() => switchTab("signup")}
            >
              Register
            </button>
          </div>

          {error && (
            <div className={`${styles.msg} ${styles.msgErr}`} role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className={`${styles.msg} ${styles.msgOk}`}>
              <CheckCircle2 size={16} />
              <span>{info}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-email">
                Email
              </label>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} size={16} />
                <input
                  id="auth-email"
                  className={styles.input}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {activeTab === "signup" && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="auth-mobile">
                  Mobile <span style={{ color: "#5a6a8a", fontWeight: 500 }}>(optional)</span>
                </label>
                <div className={styles.inputWrap}>
                  <Phone className={styles.inputIcon} size={16} />
                  <input
                    id="auth-mobile"
                    className={styles.input}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+94 77 123 4567"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="auth-password">
                  Password
                </label>
                {activeTab === "login" && (
                  <Link
                    href={`/login/forgot${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                    className={styles.linkBtn}
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className={styles.inputWrap}>
                <Lock className={styles.inputIcon} size={16} />
                <input
                  id="auth-password"
                  className={styles.input}
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={activeTab === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.eye}
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className={styles.spin} size={16} />
                  {activeTab === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : activeTab === "login" ? (
                "Sign in to dashboard"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className={styles.footer}>
            {activeTab === "login" ? (
              <>
                New here?{" "}
                <button type="button" onClick={() => switchTab("signup")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button type="button" onClick={() => switchTab("login")}>
                  Sign in
                </button>
              </>
            )}
          </div>

          <p className={styles.legal}>
            By continuing you agree to our{" "}
            <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy</Link>.
          </p>
        </div>
      </section>

      {/* Showcase */}
      <aside className={styles.showcase} aria-hidden>
        <div className={styles.gridBg} />
        <div className={styles.orb1} />
        <div className={styles.orb2} />

        <div className={styles.showcaseInner}>
          <div className={styles.kicker}>
            <Sparkles size={12} /> Live AI risk engine
          </div>
          <h2 className={styles.showcaseTitle}>
            Trade the crash with <em>discipline</em>, not hope.
          </h2>
          <p className={styles.showcaseDesc}>
            Real-time telemetry, peak-hour awareness, and an AI coach built for
            sustainable targets — not moon chasing.
          </p>

          <div className={styles.featureList}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`${styles.feature} ${i === featureIdx ? styles.featureOn : ""}`}
              >
                <div
                  className={styles.featureIcon}
                  style={{ color: f.color, background: `${f.color}18` }}
                >
                  {f.icon}
                </div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <strong>50+</strong>
              <span>Rounds window</span>
            </div>
            <div className={styles.stat}>
              <strong>PWA</strong>
              <span>Installable app</span>
            </div>
            <div className={styles.stat}>
              <strong>&lt;100ms</strong>
              <span>Signal path</span>
            </div>
          </div>

          <div className={styles.trust}>
            <span className={styles.trustPill}>
              <Shield size={12} /> Encrypted auth
            </span>
            <span className={styles.trustPill}>
              <Flame size={12} /> Real-time feed
            </span>
            <span className={styles.trustPill}>
              <Zap size={12} /> AI coach
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <Suspense
        fallback={
          <div className={styles.loading}>
            <Loader2 className={styles.spin} size={24} />
            Loading CrashTracker…
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  );
}
