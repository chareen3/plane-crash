"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, Loader2, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import styles from "../Auth.module.css";

function ForgotForm() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get("email") || "";

  const [email, setEmail] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/login/update-password")}`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className={styles.cardPage}>
      <div className={styles.card}>
        <Link href="/login" className={styles.back} style={{ marginBottom: 20 }}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>

        <div className={styles.cardIcon}>
          <KeyRound size={24} />
        </div>

        <h1 className={styles.title} style={{ fontSize: 24 }}>
          Reset password
        </h1>
        <p className={styles.subtitle}>
          Enter the email for your CrashTracker account. We&apos;ll send a secure link to set a new password.
        </p>

        {error && (
          <div className={`${styles.msg} ${styles.msgErr}`}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className={`${styles.msg} ${styles.msgOk}`}>
            <CheckCircle2 size={16} />
            <span>
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
              Check your inbox and spam folder. The link expires in about an hour.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="forgot-email">
                Email address
              </label>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} size={16} />
                <input
                  id="forgot-email"
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

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className={styles.spin} size={16} /> Sending link…
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        )}

        <div className={styles.footer}>
          Remember it?{" "}
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
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
        <ForgotForm />
      </Suspense>
    </div>
  );
}
