"use client";

import { useEffect, useState } from "react";

/** Breakpoint aligned with dashboard mobile shell (CSS 850px). */
export const MOBILE_BREAKPOINT = 850;
export const MOBILE_COOKIE = "ct_mobile";
export const MOBILE_STORAGE_KEY = "ct_is_mobile";

export function detectIsMobile(breakpoint = MOBILE_BREAKPOINT): boolean {
  if (typeof window === "undefined") return false;
  const w = window.innerWidth;
  const narrow = w <= breakpoint;
  const phoneUa =
    /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || "",
    ) && w <= 1024;
  return narrow || phoneUa;
}

export function persistMobileFlag(mobile: boolean) {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.classList.toggle("m-native-root", mobile);
    document.documentElement.dataset.mobile = mobile ? "1" : "0";
    localStorage.setItem(MOBILE_STORAGE_KEY, mobile ? "1" : "0");
    // 1 year — so next SSR/refresh can start with the correct shell
    document.cookie = `${MOBILE_COOKIE}=${mobile ? "1" : "0"};path=/;max-age=31536000;samesite=lax`;
  } catch {
    /* private mode etc. */
  }
}

function readDomHint(): boolean | null {
  if (typeof document === "undefined") return null;
  const d = document.documentElement.dataset.mobile;
  if (d === "1") return true;
  if (d === "0") return false;
  if (document.documentElement.classList.contains("m-native-root")) return true;
  try {
    const s = localStorage.getItem(MOBILE_STORAGE_KEY);
    if (s === "1") return true;
    if (s === "0") return false;
  } catch {
    /* */
  }
  return null;
}

/**
 * Mobile detection for native shell.
 *
 * - `serverHint` from cookie avoids wrong SSR after the first visit
 * - Blocking boot script (root layout) sets `m-native-root` before paint
 * - `ready` is false until client confirms detection (prevents desktop flash on phones)
 */
export function useIsMobile(
  breakpoint = MOBILE_BREAKPOINT,
  serverHint = false,
): { isMobile: boolean; ready: boolean } {
  // Prefer server cookie hint so hydration matches SSR when known
  const [isMobile, setIsMobile] = useState(serverHint);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      const live = detectIsMobile(breakpoint);
      setIsMobile(live);
      persistMobileFlag(live);
      setReady(true);
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [breakpoint]);

  return { isMobile, ready };
}

/** Back-compat: boolean-only consumers (settings, etc.) */
export function useIsMobileFlag(breakpoint = MOBILE_BREAKPOINT, serverHint = false): boolean {
  const { isMobile, ready } = useIsMobile(breakpoint, serverHint);
  // Before ready: trust cookie/server hint or DOM so settings doesn't flash desktop
  if (!ready) {
    const hint = readDomHint();
    if (hint != null) return hint;
    return serverHint;
  }
  return isMobile;
}
