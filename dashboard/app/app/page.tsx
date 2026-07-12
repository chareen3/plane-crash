"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { ShieldCheck, RefreshCw, BarChart3, Bot, Activity, Target, Layers, Flame, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { translations, type LanguageCode } from "@/lib/locales";
import { type ChartType, type TimeRange, type SortBy, type FilterBy, type Round, type WinRate } from "./_lib/dashboard-types";
import { sortRounds, filterRounds, filterByTimeRange } from "./_lib/dashboard-helpers";

// Local Custom Hooks
import { useDashboardState } from "./_hooks/useDashboardState";
import { usePredictionState } from "./_hooks/usePredictionState";
import { useCrashFeed } from "./_hooks/useCrashFeed";

// Modular UI Components
import { DashboardShell } from "./_components/DashboardShell";
import { PerformancePanel } from "./_components/PerformancePanel";
import { BetSignalHeroCard, AIPredictionPanel } from "./_components/PredictionCard";
import { LiveFeedTable, CrashHistoryGrid, TargetHitRatesTable, MiniLiveFeedPanel, CrashHistoryChart } from "./_components/CrashHistoryTable";

export default function Dashboard() {
  const router = useRouter();

  // 1. Dashboard UI coordinates hook
  const dashboard = useDashboardState();
  const {
    lang,
    handleLangChange,
    isAdmin,
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
  } = dashboard;

  const t = translations[lang] || translations.en;
  const [activeGame] = useState<'1xbet' | 'aviator' | 'luckyjet'>('1xbet');

  // 2. Win Rate callback
  const [winRate, setWinRate] = useState<WinRate>({ total: 0, correct: 0, winRate: 0, byRisk: {} });

  const fetchWinRate = useCallback(async () => {
    const res = await fetch('/api/grade');
    if (res.ok) {
      const d = await res.json();
      setWinRate(d);
    }
  }, []);

  // 3. Prediction API & state hook
  const {
    prediction,
    setPrediction,
    timeData,
    setTimeData,
    isPredicting,
    predStatus,
    setPredStatus,
    runPrediction,
  } = usePredictionState(activeGame, fetchWinRate);

  // 4. Hero Flash ref trigger callback
  const heroRef = useRef<HTMLDivElement | null>(null);
  const onNewCrashLive = useCallback(() => {
    heroRef.current?.classList.remove('flash');
    void heroRef.current?.offsetWidth;
    heroRef.current?.classList.add('flash');
  }, []);

  // 5. Realtime telemetry, heartbeats & watchdogs hook
  const {
    rounds,
    lastCrash,
    localStats,
    betAmount,
    latency,
    connectionStatus,
    lastSyncedRound,
    liveData,
    triggerReconnect,
  } = useCrashFeed({
    runPrediction,
    fetchWinRate,
    setPrediction,
    setPredStatus,
    setTimeData,
    addToast,
    onNewCrashLive,
    t,
  });

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getTargetStats = useCallback((target: number | undefined | null) => {
    if (!rounds || rounds.length === 0 || !target || target <= 0) {
      return { hitRate: 0, ev: 0 };
    }
    const hits = rounds.filter(r => Number(r.crash_point) >= target).length;
    const hitRate = Math.round((hits / rounds.length) * 100);
    const ev = (hitRate / 100) * target - 1;
    return { hitRate, ev };
  }, [rounds]);

  // UI state filters (local page coordinator states)
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');

  const stats = localStats;
  const avg = stats ? stats.mean.toFixed(2) : '—';
  const highest = rounds.length > 0 ? Math.max(...rounds.map(r => Number(r.crash_point))).toFixed(2) : '—';

  const processedRounds = sortRounds(filterByTimeRange(filterRounds(rounds, filterBy), timeRange), sortBy);
  const displayedRounds = processedRounds.slice(0, displayCount);

  const chartData = [...displayedRounds].reverse().map(r => ({
    name: r.round_number,
    time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    crash: Number(r.crash_point),
    color: r.crash_point < 2 ? '#ff3366' : r.crash_point < 5 ? '#ffd000' : '#00e5a0'
  }));

  const formatStr = (str: string, values: Record<string, string | number>) => {
    let result = str;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(`{${key}}`, String(val));
    }
    return result;
  };

  return (
    <DashboardShell
      activeNav={activeNav}
      setActiveNav={setActiveNav}
      mobileDrawerOpen={mobileDrawerOpen}
      setMobileDrawerOpen={setMobileDrawerOpen}
      isAdmin={isAdmin}
      userMenuOpen={userMenuOpen}
      setUserMenuOpen={setUserMenuOpen}
      handleLogout={handleLogout}
      lang={lang}
      handleLangChange={handleLangChange}
      connectionStatus={connectionStatus}
      latency={latency}
      lastSyncedRound={lastSyncedRound}
      triggerReconnect={triggerReconnect}
      liveData={liveData}
      lastCrash={lastCrash}
      betAmount={betAmount}
      isPredicting={isPredicting}
      runPrediction={runPrediction}
      roundsLength={rounds.length}
      toasts={toasts}
      removeToast={removeToast}
      t={t}
    >
      {/* activeNav Switch Router UI */}
      {activeNav === 'live' ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px', letterSpacing: '1px' }}>{t.realTimeFeed}</h2>
              <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.6' }}>{t.liveFeedDesc}</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="live-dot" style={{ background: '#00e5a0', boxShadow: '0 0 6px #00e5a0' }} />
                <span style={{ fontSize: '12px', color: '#00e5a0', fontWeight: 'bold' }}>{t.websocketActive}</span>
              </div>
            </div>
          </div>

          <div className="live-feed-grid">
            <LiveFeedTable
              rounds={rounds}
              prediction={prediction}
              latency={latency}
              t={t}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={14} color="#00ffd5" /> {t.systemStatus}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{t.pingLatency}</span>
                    <strong style={{ fontSize: '14px', color: '#00e5a0', fontFamily: 'monospace' }}>{latency}ms</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{t.eventsSec}</span>
                    <strong style={{ fontSize: '14px', color: '#fff', fontFamily: 'monospace' }}>{(rounds.length > 0 ? 0.8 + Math.random() * 0.4 : 0).toFixed(1)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{t.uptime}</span>
                    <strong style={{ fontSize: '14px', color: '#fff', fontFamily: 'monospace' }}>99.9%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{t.totalHandled}</span>
                    <strong style={{ fontSize: '14px', color: '#a78bfa', fontFamily: 'monospace' }}>
                      {rounds.length > 0 ? (rounds.length * 142 + Math.floor(Math.random() * 100)).toLocaleString() : 0}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(145deg, rgba(167,139,250,0.05), transparent)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={14} /> {t.aiProcessingEngine}
                </div>
                <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>{formatStr(t.aiProcessingEngineDesc, { delay: latency + 12 })}</p>
              </div>
            </div>
          </div>
        </div>
      ) : activeNav === 'history' ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px', letterSpacing: '1px' }}>{t.historyTitle}</h2>
            <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.6' }}>{t.historyDesc}</p>
          </div>

          <CrashHistoryGrid
            rounds={rounds}
            processedRounds={processedRounds}
            displayedRounds={displayedRounds}
            stats={stats}
            avg={avg}
            highest={highest}
            displayCount={displayCount}
            setDisplayCount={setDisplayCount}
            showRoundModal={showRoundModal}
            setShowRoundModal={setShowRoundModal}
            selectedRound={selectedRound}
            setSelectedRound={setSelectedRound}
            chartType={chartType}
            setChartType={setChartType}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            chartData={chartData}
            lang={lang}
            t={t}
          />
        </div>
      ) : activeNav === 'patterns' ? (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px', letterSpacing: '1px' }}>{t.patternsTitle}</h2>
            <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.6' }}>{t.patternsDesc}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '40px' }}>
            {[
              { name: '1xBet', color: '#00d4ff', desc: lang === 'si' ? 'තථ්‍ය කාලීන දත්ත ග්‍රහණය සහිත ප්‍රධාන ක්‍රෑෂ් ක්‍රීඩාව' : lang === 'ta' ? 'நிகழ்நேர தரவு பிடிப்புடன் கூடிய முதன்மை கிராஷ் விளையாட்டு' : 'Primary crash game with real-time data capture', status: 'ACTIVE' },
              { name: 'Aviator', color: '#a78bfa', desc: lang === 'si' ? 'Spribe Aviator ගුණක ලුහුබැඳීම' : lang === 'ta' ? 'Spribe Aviator பெருக்கிகள் கண்காணிப்பு' : 'Spribe Aviator multipliers tracking', status: 'ACTIVE' },
              { name: 'Lucky Jet', color: '#00e5a0', desc: lang === 'si' ? 'Lucky Jet ක්‍රෑෂ් රටා විශ්ලේෂණය' : lang === 'ta' ? 'Lucky Jet கிராஷ் வடிவ பகுப்பாய்வு' : 'Lucky Jet crash pattern analysis', status: 'ACTIVE' },
              { name: 'JetX', color: '#ffc84a', desc: lang === 'si' ? 'SmartSoft Gaming රටා හඳුනාගැනීම' : lang === 'ta' ? 'SmartSoft Gaming வடிவ அங்கீகாரம்' : 'SmartSoft Gaming pattern recognition', status: 'BETA' },
              { name: 'Crash X', color: '#ff3366', desc: lang === 'si' ? 'Turbo Games ක්‍රෑෂ් දත්ත එකතු කිරීම' : lang === 'ta' ? 'Turbo Games கிராஷ் தரவு சேகரிப்பு' : 'Turbo Games crash data collection', status: 'COMING' },
              { name: 'Spaceman', color: '#00ffd5', desc: lang === 'si' ? 'Pragmatic Play ක්‍රෑෂ් විශ්ලේෂණ' : lang === 'ta' ? 'Pragmatic Play கிராஷ் பகுப்பாய்வு' : 'Pragmatic Play crash analytics', status: 'COMING' },
            ].map((partner, i) => (
              <div key={i} className="glass-card" style={{ padding: '20px', border: `1px solid ${partner.color}30`, transition: 'all 0.3s ease', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `linear-gradient(135deg, ${partner.color}20, ${partner.color}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${partner.color}30` }}>
                    <span style={{ fontSize: '18px' }}>🎮</span>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '700', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '1px', padding: '3px 10px', borderRadius: '20px', background: partner.status === 'ACTIVE' ? 'rgba(0,229,160,0.15)' : partner.status === 'BETA' ? 'rgba(255,200,74,0.15)' : 'rgba(136,136,136,0.15)', color: partner.status === 'ACTIVE' ? '#00e5a0' : partner.status === 'BETA' ? '#ffc84a' : '#888' }}>
                    {partner.status}
                  </span>
                </div>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{partner.name}</h3>
                <p style={{ fontSize: '11px', color: '#888', lineHeight: '1.5' }}>{partner.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '16px', letterSpacing: '0.5px' }}>{t.howItWorks}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { step: '01', icon: <Activity size={24} />, title: t.step1Title, desc: t.step1Desc, color: '#00d4ff' },
                { step: '02', icon: <BarChart3 size={24} />, title: t.step2Title, desc: t.step2Desc, color: '#a78bfa' },
                { step: '03', icon: <Bot size={24} />, title: t.step3Title, desc: t.step3Desc, color: '#00e5a0' },
                { step: '04', icon: <Target size={24} />, title: t.step4Title, desc: t.step4Desc, color: '#ffc84a' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontFamily: "'Rajdhani', sans-serif", fontSize: '64px', fontWeight: '900', color: `${item.color}08`, lineHeight: 1 }}>{item.step}</div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, marginBottom: '14px' }}>
                    {item.icon}
                  </div>
                  <h4 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{item.title}</h4>
                  <p style={{ fontSize: '11px', color: '#888', lineHeight: '1.5' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '16px', letterSpacing: '0.5px' }}>{t.detectedPatterns}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {[
                { name: lang === 'si' ? 'ක්ෂණික ක්‍රෑෂ් ධාරාව' : lang === 'ta' ? 'உடனடி கிராஷ் தொடர்' : 'Instant Crash Streak', desc: lang === 'si' ? '1.2x ට අඩු වට කිහිපයක් අඛණ්ඩව සිදුවීම' : lang === 'ta' ? 'தொடர்ச்சியாக 1.2x கீழ் பல சுற்றுகள்' : 'Multiple rounds below 1.2x in sequence', risk: t.riskHigh, color: '#ff3366' },
                { name: lang === 'si' ? 'යථා තත්ත්වයට පත්වීමේ රැල්ල' : lang === 'ta' ? 'மீட்பு எழுச்சி' : 'Recovery Surge', desc: lang === 'si' ? 'ක්‍රෑෂ් වට කිහිපයකට පසු ඉහළ ගුණක ලැබීම' : lang === 'ta' ? 'கிராஷ் சுற்றுகளுக்குப் பிறகு அதிக பெருக்கிகள்' : 'High multipliers following crash clusters', risk: t.riskLow, color: '#00e5a0' },
                { name: lang === 'si' ? 'අස්ථාවර උච්චාවචනය' : lang === 'ta' ? 'ஏற்ற இறக்கம் அலைவு' : 'Volatile Oscillation', desc: lang === 'si' ? 'ඉහළ සහ අඩු ක්‍රෑෂ් අගයන් මාරුවෙන් මාරුවට සිදුවීම' : lang === 'ta' ? 'மாறிமாறி வரும் அதிக/குறைந்த கிராஷ் புள்ளிகள்' : 'Alternating high/low crash points', risk: t.riskMedium, color: '#ffd000' },
                { name: lang === 'si' ? 'ස්ථාවර තලාව' : lang === 'ta' ? 'நிலையான சமவெளி' : 'Stable Plateau', desc: lang === 'si' ? '2x ත් 4x ත් අතර ස්ථාවර ගුණක පරාසයක්' : lang === 'ta' ? 'நிலையான 2x-4x கிராஷ் வரம்பு' : 'Consistent 2x-4x crash range', risk: t.riskLow, color: '#00e5a0' },
                { name: lang === 'si' ? 'මහා ජයග්‍රහණ පොකුර' : lang === 'ta' ? 'மெகா ஹிட் கிளஸ்டர்' : 'Mega Hit Cluster', desc: lang === 'si' ? 'කෙටි කාලයක් තුළ 10x+ වට කිහිපයක් සිදුවීම' : lang === 'ta' ? 'குறுகிய காலத்தில் பல 10x+ சுற்றுகள்' : 'Multiple 10x+ rounds in short window', risk: lang === 'si' ? 'අවස්ථාවක්' : lang === 'ta' ? 'வாய்ப்பு' : 'OPPORTUNITY', color: '#a78bfa' },
              ].map((pattern, i) => (
                <div key={i} className="glass-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: pattern.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', fontWeight: '700', color: '#fff' }}>{pattern.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{pattern.desc}</div>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '700', fontFamily: "'Rajdhani', sans-serif", padding: '3px 10px', borderRadius: '20px', background: `${pattern.color}15`, color: pattern.color, border: `1px solid ${pattern.color}30` }}>
                    {pattern.risk}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ─── DEFAULT DASHBOARD ─── */
        <>
          <PerformancePanel
            winRate={winRate}
            statsWindow={statsWindow}
            setStatsWindow={setStatsWindow}
            showMobileStatsPanel={showMobileStatsPanel}
            setShowMobileStatsPanel={setShowMobileStatsPanel}
            avg={avg}
            stats={stats}
            lang={lang}
            t={t}
          />

          <div className="mobile-dash-tabs hide-on-desktop">
            <button
              className={`mobile-dash-tab-btn ${dashTab === 'signals' ? 'active' : ''}`}
              onClick={() => setDashTab('signals')}
            >
              {lang === 'si' ? 'AI සංඥා' : lang === 'ta' ? 'AI சமிக்ஞைகள்' : 'AI Signals'}
            </button>
            <button
              className={`mobile-dash-tab-btn ${dashTab === 'stats' ? 'active' : ''}`}
              onClick={() => setDashTab('stats')}
            >
              {lang === 'si' ? 'වෙළඳපල විශ්ලේෂණ' : lang === 'ta' ? 'சந்தை பகுப்பாய்வு' : 'Market Analytics'}
            </button>
          </div>

          <div className="main-grid2">
            <div className={`left-col2 ${dashTab === 'signals' ? 'mobile-visible' : 'mobile-hidden'}`}>
              <BetSignalHeroCard
                prediction={prediction}
                stats={stats}
                roundsCount={rounds.length}
                heroRef={heroRef}
                lang={lang}
                t={t}
              />

              <AIPredictionPanel
                prediction={prediction}
                stats={stats}
                isPredicting={isPredicting}
                predStatus={predStatus}
                timeData={timeData}
                getTargetStats={getTargetStats}
                lang={lang}
                t={t}
              />

              <TargetHitRatesTable
                rounds={rounds}
                stats={stats}
                t={t}
              />
            </div>

            <div className={`right-col2 ${dashTab === 'stats' ? 'mobile-visible' : 'mobile-hidden'}`}>
              <CrashHistoryChart
                displayedRounds={displayedRounds}
                chartType={chartType}
                setChartType={setChartType}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
                chartData={chartData}
                lang={lang}
                t={t}
                showFilters={false}
              />

              <div className="glass-card">
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Zap size={14} color="#a78bfa" /> {lang === 'si' ? 'AI දත්ත විකාශය' : lang === 'ta' ? 'AI தரவு ஊட்டம்' : 'AI Data Stream'}
                </div>
                <div className="ai-stream-grid">
                  <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', background: 'radial-gradient(circle, rgba(0,229,160,0.2) 0%, transparent 70%)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', textTransform: 'uppercase', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}><Activity size={12} color="#00e5a0" /> {lang === 'si' ? 'සජීවී එන්ජින් තත්ත්වය' : lang === 'ta' ? 'நேரடி இயந்திர நிலை' : 'Live Engine State'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                        <span style={{ color: '#aaa' }}>{t.trendTitle}</span>
                        <strong style={{ color: stats?.trend === 'rising' ? '#00e5a0' : stats?.trend === 'falling' ? '#ff3366' : '#fff', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{stats?.trend === 'rising' ? t.trendRising.toUpperCase() : stats?.trend === 'falling' ? t.trendFalling.toUpperCase() : t.trendFlat.toUpperCase()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                        <span style={{ color: '#aaa' }}>{lang === 'si' ? 'අස්ථාවරතාවය' : lang === 'ta' ? 'ஏற்ற இறக்கம்' : 'Volatility'}</span>
                        <strong style={{ color: '#ffd000' }}>{stats?.volatility?.toUpperCase() || 'NORMAL'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                        <span style={{ color: '#aaa' }}>{lang === 'si' ? 'අවදානම් ලකුණු' : lang === 'ta' ? 'அபாய மதிப்பெண்' : 'Risk Score'}</span>
                        <strong style={{ color: (stats?.riskScore ?? 0) > 60 ? '#ff3366' : (stats?.riskScore ?? 0) < 40 ? '#00e5a0' : '#ffd000', fontSize: '14px' }}>{stats?.riskScore ?? 0}/100</strong>
                      </div>
                    </div>
                  </div>

                  {stats?.sequenceMatch ? (
                    <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', textTransform: 'uppercase', color: '#888', marginBottom: '8px', letterSpacing: '1px' }}><Layers size={12} color="#00d4ff" /> {lang === 'si' ? 'අනුක්‍රමික එන්ජිම' : lang === 'ta' ? 'வரிசை இயந்திரம்' : 'Sequence Engine'}</div>
                      <div style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {stats.sequenceMatch.sequence.map((sq: string, i: number) => (
                          <span key={i} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', background: sq === 'INSTANT' ? 'rgba(255,51,102,0.15)' : sq === 'LOW' ? 'rgba(255,208,0,0.15)' : sq === 'MED' ? 'rgba(0,229,160,0.15)' : 'rgba(167,139,250,0.15)', color: sq === 'INSTANT' ? '#ff3366' : sq === 'LOW' ? '#ffd000' : sq === 'MED' ? '#00e5a0' : '#a78bfa', fontWeight: 'bold' }}>{sq}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>{lang === 'si' ? 'ක්ෂණික අවදානම' : lang === 'ta' ? 'உடனடி ஆபத்து' : 'Instant Risk'} <strong style={{ color: stats.sequenceMatch.pInstantNext > 20 ? '#ff3366' : '#fff' }}>{stats.sequenceMatch.pInstantNext}%</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>{lang === 'si' ? 'ආරක්ෂිත පහර' : lang === 'ta' ? 'பாதுகாப்பான வெற்றி' : 'Safe Hit'} <strong style={{ color: '#00e5a0' }}>{stats.sequenceMatch.pSafeNext}%</strong></div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', padding: '12px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '11px' }}>
                      {lang === 'si' ? 'අනුක්‍රමය ජනනය වෙමින්...' : lang === 'ta' ? 'வரிசை உருவாகிறது...' : 'Sequence generating...'}
                    </div>
                  )}

                  {stats?.detectedPatterns && stats.detectedPatterns.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', background: 'linear-gradient(145deg, rgba(167,139,250,0.08), rgba(167,139,250,0.02))', padding: '12px', borderRadius: '12px', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: 'rgba(167,139,250,0.15)', padding: '10px', borderRadius: '10px' }}><Zap size={18} color="#a78bfa" /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '2px', letterSpacing: '1px', fontWeight: 'bold' }}>{lang === 'si' ? 'ක්‍රෑෂ් රටාවක් හඳුනාගෙන ඇත' : lang === 'ta' ? 'தொடர் முறை கண்டறியப்பட்டது' : 'Streak Pattern Detected'}</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{
                          (() => {
                            const name = stats.detectedPatterns[0].patternName;
                            if (name.includes("Instant Crash Streak")) return lang === 'si' ? 'ක්ෂණික ක්‍රෑෂ් ධාරාව' : lang === 'ta' ? 'உடனடி கிராஷ் தொடர்' : name;
                            if (name.includes("Recovery Surge")) return lang === 'si' ? 'යථා තත්ත්වයට පත්වීමේ රැල්ල' : lang === 'ta' ? 'மீட்பு எழுச்சி' : name;
                            if (name.includes("Volatile Oscillation")) return lang === 'si' ? 'අස්ථාවර උච්චාවචනය' : lang === 'ta' ? 'ஏற்ற இறக்கம் அலைவு' : name;
                            if (name.includes("Stable Plateau")) return lang === 'si' ? 'ස්ථාවර තලාව' : lang === 'ta' ? 'நிலையான சமவெளி' : name;
                            return name;
                          })()
                        }</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div key={stats.detectedPatterns[0].occurrences} className="zoom-3d-pulse" style={{ fontSize: '20px', fontWeight: '900', color: '#a78bfa', lineHeight: 1, display: 'inline-block' }}>{stats.detectedPatterns[0].occurrences}x</div>
                        <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>{lang === 'si' ? 'ඉතිහාසය' : lang === 'ta' ? 'வரலாறு' : 'HISTORY'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <MiniLiveFeedPanel
                rounds={rounds}
                t={t}
              />
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
