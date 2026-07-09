'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, AlertTriangle, Heart, BookOpen, TrendingDown, Clock, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'crash_tracker_tips_seen';

const tips = [
  {
    icon: <TrendingDown size={20} />,
    color: '#00e5a0',
    bg: 'rgba(0,229,160,0.08)',
    border: 'rgba(0,229,160,0.2)',
    category: 'Bankroll Discipline',
    title: 'Set a Hard Daily Limit',
    body: 'Decide your maximum loss amount before you open 1xBet — not after. When you hit it, close the browser. This is the single most effective rule.',
  },
  {
    icon: <Clock size={20} />,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.2)',
    category: 'Time Awareness',
    title: 'Set a Session Time Limit',
    body: 'Set a phone alarm. After 45–60 minutes, stop — regardless of results. Fatigue kills decision-making, and the house knows this.',
  },
  {
    icon: <BookOpen size={20} />,
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.2)',
    category: 'Mindset',
    title: 'Treat Losses as an Entertainment Cost',
    body: 'Money lost is the price of playing — like a movie ticket. Winnings are a bonus, not income. This mindset removes desperation from your decisions.',
  },
  {
    icon: <AlertTriangle size={20} />,
    color: '#ffd000',
    bg: 'rgba(255,208,0,0.08)',
    border: 'rgba(255,208,0,0.2)',
    category: 'Emotional Control',
    title: 'Never Play Stressed, Tired, or Drunk',
    body: 'These three states disable your ability to follow rules. If you feel any of them, close the app. Come back tomorrow with a clear head.',
  },
  {
    icon: <ShieldCheck size={20} />,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
    category: 'AI Signals',
    title: 'Our AI Shows Probability, Not Certainty',
    body: 'For example: a "LOW RISK" signal for 1.8x means historical data suggests a ~65% hit rate. That means 35% of the time it still fails. This is math, not magic.',
  },
  {
    icon: <Heart size={20} />,
    color: '#ff3366',
    bg: 'rgba(255,51,102,0.08)',
    border: 'rgba(255,51,102,0.2)',
    category: 'Safe Play',
    title: "If It Stops Feeling Fun, Stop",
    body: 'CrashTracker is a discipline tool, not a money printer. If gambling feels stressful, obsessive, or desperate — please stop and reach out to a support service.',
  },
];

export default function SafePlayModal() {
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [firstTime, setFirstTime] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setFirstTime(true);
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowBubble(true);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    setShowBubble(true);
    localStorage.setItem(STORAGE_KEY, 'true');
    setFirstTime(false);
  };

  // The modal overlay — rendered via portal into document.body
  const modalContent = open ? (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(6,10,20,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'spFadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          backgroundColor: '#0c1120',
          border: '1px solid rgba(0,229,160,0.15)',
          borderRadius: '24px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,160,0.05)',
          animation: 'spSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(0,229,160,0.15), rgba(56,189,248,0.15))',
              border: '1px solid rgba(0,229,160,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5a0',
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '17px', color: '#e8eeff' }}>
                {firstTime ? '👋 Welcome to CrashTracker' : 'Safe Play Guide'}
              </div>
              <div style={{ fontSize: '12px', color: '#5a6a8a', marginTop: '2px' }}>
                {firstTime ? 'Read this before your first session.' : '6 principles for disciplined play.'}
              </div>
            </div>
          </div>
          <button onClick={handleClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', padding: '7px', cursor: 'pointer', color: '#5a6a8a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Pills */}
        <div style={{
          display: 'flex', gap: '6px', padding: '16px 28px 0', flexShrink: 0,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {tips.map((tip, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                flexShrink: 0,
                padding: '5px 12px', borderRadius: '20px',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                border: activeTab === i ? `1px solid ${tip.color}` : '1px solid rgba(255,255,255,0.08)',
                background: activeTab === i ? tip.bg : 'transparent',
                color: activeTab === i ? tip.color : '#5a6a8a',
                transition: 'all 0.18s',
              }}
            >
              {i + 1}. {tip.category}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1 }}>
          <div style={{
            padding: '24px', borderRadius: '16px',
            background: tips[activeTab].bg,
            border: `1px solid ${tips[activeTab].border}`,
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: `1px solid ${tips[activeTab].border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tips[activeTab].color,
              }}>
                {tips[activeTab].icon}
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: tips[activeTab].color, marginBottom: '4px' }}>
                  {tips[activeTab].category}
                </div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#e8eeff' }}>
                  {tips[activeTab].title}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#8090b0', lineHeight: 1.75, margin: 0 }}>
              {tips[activeTab].body}
            </p>
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: '14px 16px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <p style={{ fontSize: '11px', color: '#3a4560', lineHeight: 1.65, margin: 0 }}>
              ⚠️ <strong style={{ color: '#5a6a8a' }}>Not financial or gambling advice.</strong> All AI signals are probabilistic — not guarantees. CrashTracker is an analytics & discipline tool. We share data and strategy ideas to help you play more consciously, not to promise profits.{' '}
              <strong style={{ color: '#5a6a8a' }}>If gambling stops feeling fun, please stop immediately and seek help.</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {tips.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                style={{
                  width: activeTab === i ? '20px' : '6px', height: '6px',
                  borderRadius: '3px', border: 'none', cursor: 'pointer',
                  backgroundColor: activeTab === i ? '#00e5a0' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.25s',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab < tips.length - 1 ? (
              <button
                onClick={() => setActiveTab(activeTab + 1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 20px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00e5a0, #38bdf8)',
                  color: '#060a14', fontWeight: 800, fontSize: '13px',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 20px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00e5a0, #38bdf8)',
                  color: '#060a14', fontWeight: 800, fontSize: '13px',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Got it, let&apos;s go! ✓
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  ) : null;

  return (
    <>
      {/* ── Bubble Button in header ── */}
      <button
        onClick={() => setOpen(true)}
        title="Safe Play Tips"
        style={{
          position: 'relative',
          background: showBubble
            ? 'linear-gradient(135deg, rgba(0,229,160,0.12), rgba(56,189,248,0.12))'
            : 'transparent',
          border: showBubble
            ? '1px solid rgba(0,229,160,0.25)'
            : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: '6px',
          color: showBubble ? '#00e5a0' : '#5a6a8a',
          fontSize: '13px', fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <ShieldCheck size={14} />
        <span className="sp-label">Safe Play</span>
        {/* Blinking notification dot */}
        <span style={{
          position: 'absolute', top: '-4px', right: '-4px',
          width: '9px', height: '9px',
          borderRadius: '50%', backgroundColor: '#00e5a0',
          boxShadow: '0 0 8px #00e5a0',
          animation: 'safePulse 1.4s ease-in-out infinite',
          display: showBubble || open ? 'block' : 'none',
        }} />
      </button>

      {/* ── Portal: renders the overlay at document.body level ── */}
      {mounted && createPortal(modalContent, document.body)}

      <style>{`
        @keyframes safePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.5; }
        }
        @media (max-width: 520px) { .sp-label { display: none; } }
      `}</style>
    </>
  );
}
