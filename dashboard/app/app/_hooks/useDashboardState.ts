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
      }
    });
  }, []);

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
  };
}
