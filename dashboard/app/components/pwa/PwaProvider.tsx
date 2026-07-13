"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { Download, Share, Smartphone, Zap, Sparkles, Home } from "lucide-react";
import {
  type BeforeInstallPromptEvent,
  consumePostSubscribeFlag,
  dismissInstall,
  flagPostSubscribeInstall,
  isAndroid,
  isIosSafari,
  isStandaloneDisplay,
  markInstalled,
  wasInstallDismissed,
  isPwaInstalledMarked,
  isUninstallFeedbackShown,
  markUninstallFeedbackShown,
  clearInstalledState,
  hasSessionPromptOccurred,
  markSessionPromptOccurred,
} from "./pwa-utils";
import styles from "./InstallAppPrompt.module.css";

interface PwaContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  promptInstall: () => Promise<boolean>;
  openInstallSheet: (reason?: "subscribe" | "manual" | "soft") => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    return {
      canInstall: false,
      isInstalled: false,
      isIos: false,
      promptInstall: async () => false,
      openInstallSheet: () => {},
    };
  }
  return ctx;
}

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;

  const run = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);
      })
      .catch((err) => {
        console.warn("[PWA] SW registration failed:", err);
      });
  };

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  // Client-only flags — never read window during SSR/first paint
  const [mounted, setMounted] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [canNativeInstall, setCanNativeInstall] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [reason, setReason] = useState<"subscribe" | "manual" | "soft">("soft");
  const [installing, setInstalling] = useState(false);
  const [uninstallFeedbackOpen, setUninstallFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const closeAll = useCallback((persistDismiss = true) => {
    setSheetOpen(false);
    setToastOpen(false);
    if (persistDismiss) dismissInstall();
  }, []);

  const openInstallSheet = useCallback((r: "subscribe" | "manual" | "soft" = "manual") => {
    if (typeof window !== "undefined" && isStandaloneDisplay()) return;
    setReason(r);
    setToastOpen(false);
    setSheetOpen(true);
  }, []);

  const promptInstall = useCallback(async () => {
    if (ios) {
      openInstallSheet(reason === "subscribe" ? "subscribe" : "manual");
      return false;
    }
    const ev = deferred.current;
    if (!ev) {
      // No bip event yet — still show sheet with instructions
      openInstallSheet(reason === "subscribe" ? "subscribe" : "manual");
      return false;
    }
    setInstalling(true);
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice.outcome === "accepted") {
        markInstalled();
        setInstalled(true);
        setCanNativeInstall(false);
        deferred.current = null;
        closeAll(false);
        return true;
      }
      dismissInstall();
      return false;
    } catch {
      openInstallSheet("manual");
      return false;
    } finally {
      setInstalling(false);
    }
  }, [closeAll, ios, openInstallSheet, reason]);

  // Mount + detect environment (client only)
  useEffect(() => {
    setMounted(true);
    const standalone = isStandaloneDisplay();
    setInstalled(standalone);
    setIos(isIosSafari());
    setAndroid(isAndroid());
    registerServiceWorker();

    // Check for "uninstall" heuristic
    if (!standalone && isPwaInstalledMarked() && !isUninstallFeedbackShown()) {
      setUninstallFeedbackOpen(true);
    }
  }, []);

  // Capture beforeinstallprompt
  useEffect(() => {
    if (!mounted) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanNativeInstall(true);
    };
    const onInstalled = () => {
      markInstalled();
      setInstalled(true);
      setCanNativeInstall(false);
      deferred.current = null;
      setSheetOpen(false);
      setToastOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [mounted]);

  // Post-subscribe + soft install prompt (client only)
  useEffect(() => {
    if (!mounted) return;
    if (isStandaloneDisplay()) return;

    const success =
      searchParams?.get("success") === "true" ||
      searchParams?.get("welcome") === "subscribed" ||
      searchParams?.get("subscribed") === "1";

    if (success) {
      flagPostSubscribeInstall();
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("success");
        url.searchParams.delete("welcome");
        url.searchParams.delete("subscribed");
        window.history.replaceState({}, "", url.pathname + url.search);
      } catch {
        /* */
      }
      const t = window.setTimeout(() => {
        setReason("subscribe");
        setSheetOpen(true);
        setToastOpen(false);
      }, 500);
      return () => window.clearTimeout(t);
    }

    if (pathname?.startsWith("/app") && consumePostSubscribeFlag()) {
      const t = window.setTimeout(() => {
        setReason("subscribe");
        setSheetOpen(true);
        setToastOpen(false);
      }, 700);
      return () => window.clearTimeout(t);
    }

    // Soft prompt: compact toast on /app for mobile browsers that can install
    const softEligible =
      pathname?.startsWith("/app") &&
      !wasInstallDismissed() &&
      !isStandaloneDisplay() &&
      (canNativeInstall || ios || android);

    if (softEligible) {
      const t = window.setTimeout(() => {
        setReason("soft");
        // Prefer full sheet on narrow viewports so layout never collapses
        if (window.innerWidth <= 850) {
          setSheetOpen(true);
          setToastOpen(false);
        } else {
          setToastOpen(true);
        }
      }, 3500);
      return () => window.clearTimeout(t);
    }

    // Random session prompt for uninstalled users (runs on new session after a few minutes)
    if (!isStandaloneDisplay() && (canNativeInstall || ios || android) && !hasSessionPromptOccurred()) {
      markSessionPromptOccurred();
      
      // Random 50% chance
      if (Math.random() > 0.5) {
        // Wait 2 minutes
        const t = window.setTimeout(() => {
          setReason("soft");
          if (window.innerWidth <= 850) {
            setSheetOpen(true);
            setToastOpen(false);
          } else {
            setToastOpen(true);
          }
        }, 120000);
        return () => window.clearTimeout(t);
      }
    }
  }, [mounted, pathname, searchParams, canNativeInstall, ios, android]);

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall: canNativeInstall || ios,
      isInstalled: installed,
      isIos: ios,
      promptInstall,
      openInstallSheet,
    }),
    [canNativeInstall, installed, ios, openInstallSheet, promptInstall],
  );

  const title =
    reason === "subscribe" ? "You're in — install the app" : "Install CrashTracker";
  const subtitle =
    reason === "subscribe"
      ? "Add CrashTracker to your home screen for one-tap live signals."
      : "Get the full mobile experience — faster, fullscreen, home-screen ready.";

  // Never render install UI on server — prevents hydration mismatch
  const ui =
    mounted && typeof document !== "undefined"
      ? createPortal(
          <>
            {toastOpen && !sheetOpen && !installed && (
              <div className={styles.toast} role="status">
                <div className={styles.toastIcon}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="" width={40} height={40} />
                </div>
                <div className={styles.toastBody}>
                  <strong>Install app</strong>
                  <span>Add to home screen for native feel</span>
                </div>
                <button
                  type="button"
                  className={styles.toastBtn}
                  onClick={() => {
                    setToastOpen(false);
                    openInstallSheet("soft");
                  }}
                >
                  Install
                </button>
                <button
                  type="button"
                  className={styles.toastClose}
                  aria-label="Dismiss"
                  onClick={() => closeAll(true)}
                >
                  ×
                </button>
              </div>
            )}

            {sheetOpen && !installed && (
              <div className={styles.overlay} role="presentation">
                <button
                  type="button"
                  className={styles.backdrop}
                  aria-label="Close"
                  onClick={() => closeAll(true)}
                />
                <div
                  className={styles.sheet}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pwa-install-title"
                >
                  <div className={styles.handle} />
                  <div className={styles.hero}>
                    <div className={styles.iconWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="CrashTracker" width={56} height={56} />
                    </div>
                    <div className={styles.heroText}>
                      <h2 id="pwa-install-title">{title}</h2>
                      <p>{subtitle}</p>
                      {reason === "subscribe" && (
                        <span className={styles.badge}>
                          <Sparkles size={11} /> Pro unlocked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.features}>
                    <div className={styles.feat}>
                      <span className={styles.featIcon}>
                        <Zap size={14} />
                      </span>
                      Instant launch from home screen
                    </div>
                    <div className={styles.feat}>
                      <span className={styles.featIcon}>
                        <Smartphone size={14} />
                      </span>
                      Fullscreen mobile-native experience
                    </div>
                    <div className={styles.feat}>
                      <span className={styles.featIcon}>
                        <Home size={14} />
                      </span>
                      Works offline for shell & branding
                    </div>
                  </div>

                  {ios && (
                    <div className={styles.iosSteps}>
                      <h3>Install on iPhone / iPad</h3>
                      <ol>
                        <li>
                          Tap the{" "}
                          <Share
                            size={12}
                            style={{ display: "inline", verticalAlign: "-2px" }}
                          />{" "}
                          <strong>Share</strong> button in Safari
                        </li>
                        <li>
                          Scroll and tap <strong>Add to Home Screen</strong>
                        </li>
                        <li>
                          Tap <strong>Add</strong> — CrashTracker opens like an app
                        </li>
                      </ol>
                    </div>
                  )}

                  {!ios && !canNativeInstall && (
                    <div className={styles.iosSteps}>
                      <h3>{android ? "Install on Android" : "Install tips"}</h3>
                      <ol>
                        <li>
                          Open the browser menu <strong>⋮</strong>
                        </li>
                        <li>
                          Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
                        </li>
                        <li>Confirm — CrashTracker appears on your home screen</li>
                      </ol>
                    </div>
                  )}

                  <div className={styles.actions}>
                    {ios ? (
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() => closeAll(true)}
                      >
                        <Share size={18} />
                        Got it — use Share
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.primary}
                        disabled={installing}
                        onClick={() => void promptInstall()}
                      >
                        <Download size={18} />
                        {installing
                          ? "Opening install…"
                          : canNativeInstall
                            ? "Install CrashTracker"
                            : "Show install steps"}
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => closeAll(true)}
                    >
                      Not now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {uninstallFeedbackOpen && (
              <div className={styles.overlay} role="presentation">
                <div className={styles.backdrop} />
                <div
                  className={styles.sheet}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pwa-uninstall-title"
                  style={{ maxHeight: 'none', top: 'auto', bottom: 0, paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
                >
                  <div className={styles.handle} />
                  <div className={styles.hero}>
                    <div className={styles.heroText}>
                      <h2 id="pwa-uninstall-title">Did you uninstall our app?</h2>
                      <p>We noticed you are using the browser instead of the app. Let us know why so we can improve!</p>
                    </div>
                  </div>
                  
                  <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <textarea 
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="What was the issue?"
                      style={{ 
                        width: '100%', 
                        minHeight: '80px', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: '#fff',
                        fontFamily: 'inherit',
                        resize: 'none'
                      }}
                    />
                    <div className={styles.actions} style={{ padding: 0 }}>
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() => {
                          // Simulate sending feedback
                          console.log("Uninstall feedback submitted:", feedbackText);
                          markUninstallFeedbackShown();
                          clearInstalledState();
                          setUninstallFeedbackOpen(false);
                        }}
                      >
                        Submit Feedback
                      </button>
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => {
                          markUninstallFeedbackShown();
                          clearInstalledState();
                          setUninstallFeedbackOpen(false);
                        }}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body,
        )
      : null;

  return (
    <PwaContext.Provider value={value}>
      {children}
      {ui}
    </PwaContext.Provider>
  );
}
