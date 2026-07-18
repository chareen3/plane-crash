import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { type LanguageCode } from "@/lib/locales";
import { type ToastMessage, type Round } from "../_lib/dashboard-types";

const supabase = createClient();

export function useDashboardState() {
  const [lang, setLang] = useState<LanguageCode>('en');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [dashTab, setDashTab] = useState<'signals' | 'stats'>('signals');
  const [showMobileStatsPanel, setShowMobileStatsPanel] = useState(true);
  const [statsWindow, setStatsWindow] = useState<'24h' | '7d' | 'all'>('24h');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  // Modal / History Details
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [displayCount, setDisplayCount] = useState<number>(50);
  // Supports both number and functional updater (history "load more")

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleLangChange = (newLang: LanguageCode) => {
    setLang(newLang);
    localStorage.setItem('dashboard_lang', newLang);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('dashboard_lang');
    if (savedLang && (savedLang === 'en' || savedLang === 'si' || savedLang === 'ta')) {
      setLang(savedLang as LanguageCode);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('is_admin').eq('id', user.id).single().then(({ data }) => {
          if (data?.is_admin) setIsAdmin(true);
        });

        supabase.from('subscriptions').select('*').eq('user_id', user.id).single().then(({ data }) => {
          if (data) setSubscription(data);
        });
      }
    });
  }, []);

  const claimTrial = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/claim", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to claim trial");
      }
      if (data.subscription) {
        setSubscription(data.subscription);
        addToast("7-Day Free Trial claimed successfully!", "success");
      }
    } catch (err: any) {
      addToast(err.message || "Could not claim trial.", "error");
    }
  }, [addToast]);

  return {
    lang,
    setLang,
    handleLangChange,
    isAdmin,
    setIsAdmin,
    activeNav,
    setActiveNav,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    dashTab,
    setDashTab,
    showMobileStatsPanel,
    setShowMobileStatsPanel,
    statsWindow,
    setStatsWindow,
    userMenuOpen,
    setUserMenuOpen,
    selectedRound,
    setSelectedRound,
    showRoundModal,
    setShowRoundModal,
    displayCount,
    setDisplayCount,
    toasts,
    addToast,
    removeToast,
    subscription,
    setSubscription,
    claimTrial,
  };
}
