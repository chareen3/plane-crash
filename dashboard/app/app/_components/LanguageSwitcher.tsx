"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { type LanguageCode, LANGUAGE_NAMES } from "@/lib/locales";

const LANG_META: Record<LanguageCode, { flag: string; short: string }> = {
  en: { flag: "🇬🇧", short: "EN" },
  si: { flag: "🇱🇰", short: "SI" },
  ta: { flag: "🇮🇳", short: "TA" },
};

interface LanguageSwitcherProps {
  lang: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  /** compact = icon pill for mobile/header; full = wider label */
  variant?: "compact" | "full";
}

export function LanguageSwitcher({
  lang,
  onChange,
  variant = "compact",
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const meta = LANG_META[lang];

  return (
    <div className={`lang-switcher ${variant}`} ref={ref}>
      <button
        type="button"
        className="lang-switcher-trigger ui-btn"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={LANGUAGE_NAMES[lang]}
      >
        <Globe size={14} className="lang-globe" />
        <span className="lang-flag" aria-hidden>{meta.flag}</span>
        <span className="lang-code">{meta.short}</span>
        {variant === "full" && (
          <span className="lang-name">{LANGUAGE_NAMES[lang]}</span>
        )}
        <ChevronDown size={12} className={`lang-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="lang-switcher-menu" role="listbox">
          {(Object.keys(LANGUAGE_NAMES) as LanguageCode[]).map(code => {
            const m = LANG_META[code];
            const active = code === lang;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                className={`lang-option ${active ? "active" : ""}`}
                onClick={() => {
                  onChange(code);
                  setOpen(false);
                }}
              >
                <span className="lang-flag">{m.flag}</span>
                <span className="lang-option-text">
                  <span className="lang-option-name">{LANGUAGE_NAMES[code]}</span>
                  <span className="lang-option-code">{m.short}</span>
                </span>
                {active && <Check size={14} className="lang-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
