"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import styles from "../Auth.module.css";

function UpdatePasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Recovery links land here after /auth/callback (PKCE) or with hash tokens
  useEffect(() => {
    let active = true;

    const ready = async () => {
      // Hash-based recovery (implicit) — let supabase client parse URL
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (session) {
        setHasSession(true);
        setChecking(false);
        return;
      }

      // Listen for PASSWORD_RECOVERY / SIGNED_IN from link
      const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || s) {
          setHasSession(true);
          setChecking(false);
        }
      });

      // Brief wait for hash processing
      window.setTimeout(async () => {
        if (!active) return;
        const { data: { session: s2 } } = await supabase.auth.getSession();
        setHasSession(!!s2);
        setChecking(false);
      }, 800);

      return () => sub.subscription.unsubscribe();
    };

    void ready();
    return () => {
      active = false;
    };
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    window.setTimeout(() => {
      router.push("/app");
      router.refresh();
    }, 1500);
  };

  if (checking) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spin} size={22} />
        Verifying reset link…
      </div>
    );
  }

  return (
    <div className={styles.cardPage}>
      <div className={styles.card}>
        <Link href="/login" className={styles.back} style={{ marginBottom: 20 }}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>

        <div className={styles.cardIcon}>
          <ShieldCheck size={24} />
        </div>

        <h1 className={styles.title} style={{ fontSize: 24 }}>
          Set new password
        </h1>
        <p className={styles.subtitle}>
          Choose a strong password for your CrashTracker account.
        </p>

        {!hasSession && !done && (
          <div className={`${styles.msg} ${styles.msgErr}`}>
            <AlertCircle size={16} />
            <span>
              This reset link is invalid or expired.{" "}
              <Link href="/login/forgot" className={styles.linkBtn}>
                Request a new one
              </Link>
              .
            </span>
          </div>
        )}

        {error && (
          <div className={`${styles.msg} ${styles.msgErr}`}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {done && (
          <div className={`${styles.msg} ${styles.msgOk}`}>
            <CheckCircle2 size={16} />
            <span>Password updated. Redirecting to your dashboard…</span>
          </div>
        )}

        {hasSession && !done && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-password">
                New password
              </label>
              <div className={styles.inputWrap}>
                <Lock className={styles.inputIcon} size={16} />
                <input
                  id="new-password"
                  className={styles.input}
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
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

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirm-password">
                Confirm password
              </label>
              <div className={styles.inputWrap}>
                <Lock className={styles.inputIcon} size={16} />
                <input
                  id="confirm-password"
                  className={styles.input}
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className={styles.spin} size={16} /> Updating…
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <div className={styles.page}>
      <Suspense
        fallback={
          <div className={styles.loading}>
            <Loader2 className={styles.spin} size={22} />
            Loading…
          </div>
        }
      >
        <UpdatePasswordForm />
      </Suspense>
    </div>
  );
}
