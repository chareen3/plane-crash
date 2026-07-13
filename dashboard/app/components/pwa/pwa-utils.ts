export const PWA_DISMISS_KEY = "ct_pwa_install_dismissed";
export const PWA_INSTALLED_KEY = "ct_pwa_installed";
export const PWA_SUBSCRIBE_KEY = "ct_pwa_post_subscribe";
export const PWA_UNINSTALL_FEEDBACK_KEY = "ct_pwa_uninstall_feedback";
export const PWA_SESSION_PROMPT_KEY = "ct_pwa_session_prompt";

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari
  const ios = (window.navigator as any).standalone === true;
  return mq || ios;
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|Chrome|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chrome;
}

export function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return /Android/i.test(window.navigator.userAgent);
}

export function wasInstallDismissed(): boolean {
  try {
    const raw = localStorage.getItem(PWA_DISMISS_KEY);
    if (!raw) return false;
    const t = Number(raw);
    // Re-prompt after 14 days
    if (!Number.isFinite(t)) return true;
    return Date.now() - t < 14 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissInstall(days = 14) {
  try {
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
  } catch {
    /* */
  }
}

export function markInstalled() {
  try {
    localStorage.setItem(PWA_INSTALLED_KEY, "1");
    localStorage.removeItem(PWA_SUBSCRIBE_KEY);
  } catch {
    /* */
  }
}

export function flagPostSubscribeInstall() {
  try {
    sessionStorage.setItem(PWA_SUBSCRIBE_KEY, "1");
    localStorage.setItem(PWA_SUBSCRIBE_KEY, String(Date.now()));
  } catch {
    /* */
  }
}

export function hasSessionPromptOccurred(): boolean {
  try {
    return sessionStorage.getItem(PWA_SESSION_PROMPT_KEY) === "1";
  } catch {
    return true; // fail safe
  }
}

export function markSessionPromptOccurred() {
  try {
    sessionStorage.setItem(PWA_SESSION_PROMPT_KEY, "1");
  } catch {
    /* */
  }
}

export function isUninstallFeedbackShown(): boolean {
  try {
    return localStorage.getItem(PWA_UNINSTALL_FEEDBACK_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUninstallFeedbackShown() {
  try {
    localStorage.setItem(PWA_UNINSTALL_FEEDBACK_KEY, "1");
  } catch {
    /* */
  }
}

export function clearInstalledState() {
  try {
    localStorage.removeItem(PWA_INSTALLED_KEY);
  } catch {
    /* */
  }
}

export function isPwaInstalledMarked(): boolean {
  try {
    return localStorage.getItem(PWA_INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumePostSubscribeFlag(): boolean {
  try {
    const s = sessionStorage.getItem(PWA_SUBSCRIBE_KEY);
    const l = localStorage.getItem(PWA_SUBSCRIBE_KEY);
    if (s === "1") {
      sessionStorage.removeItem(PWA_SUBSCRIBE_KEY);
      return true;
    }
    if (l) {
      const t = Number(l);
      // Within 24h of subscribe success
      if (Number.isFinite(t) && Date.now() - t < 24 * 60 * 60 * 1000) {
        localStorage.removeItem(PWA_SUBSCRIBE_KEY);
        return true;
      }
    }
  } catch {
    /* */
  }
  return false;
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
