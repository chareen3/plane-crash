"use client";

import { useMemo, useState } from "react";
import {
  Target, Sparkles, TrendingUp, Calculator, BarChart3,
  Shield, Rocket, Moon, Gauge, Clock, Flame, Info,
} from "lucide-react";
import { type Translations, type LanguageCode } from "@/lib/locales";
import { type CrashStats } from "@/lib/stats";
import { type Prediction, type Round } from "../_lib/dashboard-types";
import { TargetHitRatesTable } from "./CrashHistoryTable";

interface TargetsPageProps {
  rounds: Round[];
  stats: CrashStats | null;
  prediction: Prediction | null;
  lang: LanguageCode;
  t: Translations;
}

const PRESET_TARGETS = [1.15, 1.2, 1.35, 1.5, 1.8, 2, 2.5, 3, 5, 10, 15, 20, 25, 30, 35];

function signalColor(signal: string) {
  switch (signal) {
    case 'SAFE': return '#00e5a0';
    case 'OK': return '#00d4ff';
    case 'RISKY': return '#ffd000';
    default: return '#ff3366';
  }
}

function computeLiveTarget(rounds: Round[], target: number) {
  if (!rounds.length || target <= 0) {
    return { hitRate: 0, recentHitRate: 0, lastHitAgo: -1, ev: -1, hits: 0 };
  }
  const values = rounds.map(r => Number(r.crash_point));
  const hits = values.filter(v => v >= target).length;
  const hitRate = Math.round((hits / values.length) * 100);
  const recent = values.slice(0, 20);
  const recentHits = recent.filter(v => v >= target).length;
  const recentHitRate = recent.length
    ? Math.round((recentHits / recent.length) * 100)
    : 0;
  const lastHitAgo = values.findIndex(v => v >= target);
  const ev = Number(((hitRate / 100) * target - 1).toFixed(3));
  return { hitRate, recentHitRate, lastHitAgo, ev, hits };
}

export function TargetsPage({ rounds, stats, prediction, lang, t }: TargetsPageProps) {
  const [customTarget, setCustomTarget] = useState(1.5);
  const [stake, setStake] = useState(100);

  const L = {
    title: lang === 'si' ? 'ඉලක්ක මධ්‍යස්ථානය' : lang === 'ta' ? 'இலக்கு மையம்' : 'Targets Hub',
    desc: lang === 'si'
      ? 'ඓතිහාසික හිට් අනුපාත, EV සහ සජීවී යෝජනා — ඔබේ මුදල් ලබා ගැනීමේ ඉලක්කය තෝරන්න.'
      : lang === 'ta'
      ? 'வரலாற்று ஹிட் விகிதம், EV மற்றும் நேரடி பரிந்துரைகள் — உங்கள் கேஷ்அவுட் இலக்கைத் தேர்வு செய்யுங்கள்.'
      : 'Historical hit rates, EV, and live recommendations — pick your cashout target with data.',
    liveRec: lang === 'si' ? 'සජීවී යෝජනා' : lang === 'ta' ? 'நேரடி பரிந்துரைகள்' : 'Live Recommendations',
    safe: lang === 'si' ? 'ආරක්ෂිත' : lang === 'ta' ? 'பாதுகாப்பு' : 'Safe',
    swing: lang === 'si' ? 'ස්විං' : lang === 'ta' ? 'ஸ்விங்' : 'Swing',
    moon: lang === 'si' ? 'මූන්' : lang === 'ta' ? 'மூன்' : 'Moon',
    percentiles: lang === 'si' ? 'ප්‍රතිශතක මුදල් ලබා ගැනීම' : lang === 'ta' ? 'சதவீத கேஷ்அவுட்' : 'Percentile Cashouts',
    explorer: lang === 'si' ? 'ඉලක්ක ගවේෂකය' : lang === 'ta' ? 'இலக்கு ஆய்வாளர்' : 'Target Explorer',
    hitRate: lang === 'si' ? 'හිට් අනුපාතය' : lang === 'ta' ? 'ஹிட் விகிதம்' : 'Hit Rate',
    recent20: lang === 'si' ? 'මෑත 20' : lang === 'ta' ? 'சமீப 20' : 'Recent 20',
    expectedEV: lang === 'si' ? 'අපේක්ෂිත EV' : lang === 'ta' ? 'எதிர்பார்க்கும் EV' : 'Expected EV',
    lastHit: lang === 'si' ? 'අවසන් හිට්' : lang === 'ta' ? 'கடைசி ஹிட்' : 'Last Hit',
    mathProb: lang === 'si' ? 'ගණිතමය (~97% RTP)' : lang === 'ta' ? 'கணிதம் (~97% RTP)' : 'Math (~97% RTP)',
    bestEV: lang === 'si' ? 'හොඳම EV ඉලක්ක' : lang === 'ta' ? 'சிறந்த EV இலக்குகள்' : 'Best EV Targets',
    calculator: lang === 'si' ? 'බැංකු ගණක යන්ත්‍රය' : lang === 'ta' ? 'பேங்க்ரோல் கால்குலேட்டர்' : 'Bankroll Calculator',
    stake: lang === 'si' ? 'ඔට්ටු ප්‍රමාණය' : lang === 'ta' ? 'பந்தய அளவு' : 'Stake amount',
    ifWin: lang === 'si' ? 'ජයග්‍රහණයේදී' : lang === 'ta' ? 'வென்றால்' : 'If win',
    ifLose: lang === 'si' ? 'පරාජයේදී' : lang === 'ta' ? 'தோற்றால்' : 'If lose',
    expected: lang === 'si' ? 'අපේක්ෂිත / වටය' : lang === 'ta' ? 'எதிர்பார்ப்பு / சுற்று' : 'Expected / round',
    gapWatch: lang === 'si' ? 'ගැප් නිරීක්ෂණය' : lang === 'ta' ? 'இடைவெளி கண்காணிப்பு' : 'Gap Watch',
    gapNote: lang === 'si'
      ? 'දිගු හිස් කාලය “නිසැක” නොවේ — RNG ස්වාධීනයි. තොරතුරු පමණි.'
      : lang === 'ta'
      ? 'நீண்ட இடைவெளி “உறுதி” அல்ல — RNG சுயாதீனம். தகவல் மட்டும்.'
      : 'Long gaps are not “due” — outcomes are independent. Info only.',
    noData: lang === 'si' ? 'වට ග්‍රහණය කරන්න' : lang === 'ta' ? 'சுற்றுகளைப் பிடிக்கவும்' : 'Capture rounds to unlock target analytics',
    rounds: lang === 'si' ? 'වට' : lang === 'ta' ? 'சுற்றுகள்' : 'rounds',
    now: t.now,
    never: t.never,
    rAgo: t.rAgo,
    sample: lang === 'si' ? 'නියැදිය' : lang === 'ta' ? 'மாதிரி' : 'Sample',
    signal: lang === 'si' ? 'සංඥාව' : lang === 'ta' ? 'சிக்னல்' : 'Signal',
    profit: lang === 'si' ? 'ලාභය' : lang === 'ta' ? 'லாபம்' : 'Profit',
    presets: lang === 'si' ? 'ක්ෂණික තේරීම්' : lang === 'ta' ? 'விரைவு தேர்வு' : 'Quick presets',
  };

  const liveSafe = prediction?.should_bet && prediction.cashout_target
    ? prediction.cashout_target
    : stats?.suggestedCashout ?? stats?.conservativeCashout ?? 1.5;
  const liveSwing = prediction?.swing_target
    ?? stats?.aggressiveCashout
    ?? (liveSafe * 1.4);
  const liveMoon = Math.min(3, Math.max(liveSwing, stats?.p50SafeCashout ?? 2.2));

  const explorer = useMemo(
    () => computeLiveTarget(rounds, customTarget),
    [rounds, customTarget],
  );

  const mathProb = customTarget > 0 ? Math.round((0.97 / customTarget) * 1000) / 10 : 0;
  const expectedProfit = stake * explorer.ev;
  const winPayout = stake * customTarget;
  const winProfit = winPayout - stake;

  const bestEV = useMemo(() => {
    if (!stats?.targets?.length) return [];
    return [...stats.targets]
      .filter(tRow => tRow.target <= 5 && tRow.signal !== 'RARE')
      .sort((a, b) => b.ev - a.ev)
      .slice(0, 6);
  }, [stats]);

  const gapRows = useMemo(() => {
    if (!stats?.targets?.length) return [];
    return [1.2, 1.5, 2, 3, 5]
      .map(target => stats.targets.find(x => Math.abs(x.target - target) < 0.01))
      .filter(Boolean) as CrashStats['targets'];
  }, [stats]);

  const percentiles = stats
    ? [
        { label: 'p90', value: stats.p90SafeCashout, note: '~90% hist. floor' },
        { label: 'p80', value: stats.p80SafeCashout, note: '~80% hist.' },
        { label: 'p70', value: stats.p70SafeCashout, note: '~70% hist.' },
        { label: 'p65', value: stats.p65SafeCashout, note: '~65% hist.' },
        { label: 'p60', value: stats.p60SafeCashout, note: '~60% hist.' },
        { label: 'p50', value: stats.p50SafeCashout, note: 'Median' },
      ]
    : [];

  const recCards = [
    {
      key: 'safe',
      label: L.safe,
      icon: <Shield size={18} />,
      value: liveSafe,
      color: '#00e5a0',
      sub: prediction?.should_bet
        ? (lang === 'si' ? 'සජීවී BET සංඥාව' : lang === 'ta' ? 'நேரடி BET சிக்னல்' : 'Live BET signal')
        : (lang === 'si' ? 'සංඛ්‍යාන යෝජනාව' : lang === 'ta' ? 'புள்ளியியல் பரிந்துரை' : 'Stats suggestion'),
    },
    {
      key: 'swing',
      label: L.swing,
      icon: <Rocket size={18} />,
      value: liveSwing,
      color: '#ffd000',
      sub: lang === 'si' ? 'විකල්ප ඉහළ ඉලක්කය' : lang === 'ta' ? 'விருப்ப உயர் இலக்கு' : 'Optional higher exit',
    },
    {
      key: 'moon',
      label: L.moon,
      icon: <Moon size={18} />,
      value: liveMoon,
      color: '#a78bfa',
      sub: lang === 'si' ? 'තොරතුරු පමණි (≤3.00x)' : lang === 'ta' ? 'தகவல் மட்டும் (≤3.00x)' : 'Informational only (≤3.00x)',
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Target size={26} color="#00ffd5" /> {L.title}
          </h2>
          <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, maxWidth: '640px' }}>{L.desc}</p>
        </div>
        <div style={{ fontSize: '11px', color: '#666', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', borderRadius: '10px' }}>
          {L.sample}: <strong style={{ color: '#a78bfa' }}>{rounds.length}</strong> {L.rounds}
          {stats?.volatilityRegime ? (
            <span style={{ marginLeft: 10 }}>· Regime <strong style={{ color: '#ffd000' }}>{stats.volatilityRegime}</strong></span>
          ) : null}
        </div>
      </div>

      {rounds.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: '#888' }}>
          <Target size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>{L.noData}</div>
        </div>
      ) : (
        <>
          {/* Live recommendations */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} color="#a78bfa" /> {L.liveRec}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {recCards.map(card => {
              const live = computeLiveTarget(rounds, Number(card.value));
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setCustomTarget(Number(Number(card.value).toFixed(2)))}
                  className="glass-card"
                  style={{
                    padding: '18px',
                    textAlign: 'left',
                    border: `1px solid ${card.color}33`,
                    background: `linear-gradient(145deg, ${card.color}12, transparent)`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: card.color, textTransform: 'uppercase' }}>
                      {card.icon} {card.label}
                    </span>
                    <span style={{ fontSize: 10, color: live.ev >= 0 ? '#00e5a0' : '#ff3366' }}>
                      EV {live.ev >= 0 ? '+' : ''}{live.ev.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {Number(card.value).toFixed(2)}x
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                    {L.hitRate} <strong style={{ color: '#fff' }}>{live.hitRate}%</strong>
                    <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                    {card.sub}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Percentiles */}
          <div className="glass-card" style={{ padding: '18px', marginBottom: '20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gauge size={14} color="#00d4ff" /> {L.percentiles}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              {percentiles.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setCustomTarget(Number(p.value.toFixed(2)))}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 10, color: '#666', fontWeight: 700 }}>{p.label}</div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#00d4ff' }}>
                    {p.value.toFixed(2)}x
                  </div>
                  <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{p.note}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Target explorer */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={14} color="#00ffd5" /> {L.explorer}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 40, fontWeight: 800, color: '#fff' }}>
                  {customTarget.toFixed(2)}x
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: `${signalColor(explorer.hitRate >= 80 ? 'SAFE' : explorer.hitRate >= 55 ? 'OK' : explorer.hitRate >= 25 ? 'RISKY' : 'RARE')}18`,
                  color: signalColor(explorer.hitRate >= 80 ? 'SAFE' : explorer.hitRate >= 55 ? 'OK' : explorer.hitRate >= 25 ? 'RISKY' : 'RARE'),
                }}>
                  {explorer.hitRate >= 80 ? 'SAFE' : explorer.hitRate >= 55 ? 'OK' : explorer.hitRate >= 25 ? 'RISKY' : 'RARE'}
                </span>
              </div>

              <input
                type="range"
                min={1.05}
                max={35}
                step={customTarget >= 10 ? 1 : 0.05}
                value={customTarget}
                onChange={e => setCustomTarget(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#00ffd5', marginBottom: 14 }}
              />

              <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>{L.presets}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                {PRESET_TARGETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCustomTarget(p)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: `1px solid ${Math.abs(customTarget - p) < 0.001 ? '#00ffd5' : 'rgba(255,255,255,0.08)'}`,
                      background: Math.abs(customTarget - p) < 0.001 ? 'rgba(0,255,213,0.15)' : 'transparent',
                      color: Math.abs(customTarget - p) < 0.001 ? '#00ffd5' : '#888',
                      cursor: 'pointer',
                    }}
                  >
                    {p}x
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: L.hitRate, value: `${explorer.hitRate}%`, color: '#00e5a0' },
                  { label: L.recent20, value: `${explorer.recentHitRate}%`, color: explorer.recentHitRate >= explorer.hitRate ? '#00e5a0' : '#ffd000' },
                  { label: L.expectedEV, value: `${explorer.ev >= 0 ? '+' : ''}${explorer.ev.toFixed(3)}`, color: explorer.ev >= 0 ? '#00e5a0' : '#ff3366' },
                  { label: L.mathProb, value: `${mathProb}%`, color: '#a78bfa' },
                  {
                    label: L.lastHit,
                    value: explorer.lastHitAgo === 0 ? L.now : explorer.lastHitAgo < 0 ? L.never : `${explorer.lastHitAgo}${L.rAgo}`,
                    color: '#ffd000',
                  },
                  { label: L.sample, value: `${explorer.hits}/${rounds.length}`, color: '#fff' },
                ].map(cell => (
                  <div key={cell.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>{cell.label}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: cell.color }}>{cell.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bankroll + Best EV */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-card" style={{ padding: '18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calculator size={14} color="#ffd000" /> {L.calculator}
                </div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>{L.stake}</label>
                <input
                  type="number"
                  min={1}
                  value={stake}
                  onChange={e => setStake(Math.max(1, Number(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: 16,
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>{L.ifWin}</span>
                    <strong style={{ color: '#00e5a0' }}>+{winProfit.toFixed(2)} ({winPayout.toFixed(2)} total)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>{L.ifLose}</span>
                    <strong style={{ color: '#ff3366' }}>-{stake.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 8 }}>
                    <span style={{ color: '#888' }}>{L.expected}</span>
                    <strong style={{ color: expectedProfit >= 0 ? '#00e5a0' : '#ff3366' }}>
                      {expectedProfit >= 0 ? '+' : ''}{expectedProfit.toFixed(2)}
                    </strong>
                  </div>
                  <div style={{ fontSize: 10, color: '#555', display: 'flex', gap: 4, alignItems: 'flex-start', marginTop: 4 }}>
                    <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                    {lang === 'si'
                      ? 'EV = (hitRate × target) − 1. නිවාස වාසිය තිබේ.'
                      : lang === 'ta'
                      ? 'EV = (hitRate × target) − 1. வீட்டு நன்மை உள்ளது.'
                      : 'EV = (hitRate × target) − 1. House edge remains.'}
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '18px', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={14} color="#00e5a0" /> {L.bestEV}
                </div>
                {bestEV.length === 0 ? (
                  <div style={{ color: '#666', fontSize: 12 }}>—</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {bestEV.map((row, i) => (
                      <button
                        key={row.target}
                        type="button"
                        onClick={() => setCustomTarget(row.target)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.06)',
                          background: i === 0 ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ width: 18, fontSize: 11, color: '#555', fontWeight: 700 }}>#{i + 1}</span>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: '#fff', minWidth: 48 }}>{row.target.toFixed(2)}x</span>
                        <span style={{ fontSize: 11, color: '#888', flex: 1 }}>{row.hitRate}% hit</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: row.ev >= 0 ? '#00e5a0' : '#ff3366' }}>
                          {row.ev >= 0 ? '+' : ''}{row.ev.toFixed(2)}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: signalColor(row.signal) }}>{row.signal}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gap watch */}
          <div className="glass-card" style={{ padding: '18px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} color="#ffd000" /> {L.gapWatch}
            </div>
            <p style={{ fontSize: 11, color: '#555', marginBottom: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Info size={12} /> {L.gapNote}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {gapRows.map(row => (
                <button
                  key={row.target}
                  type="button"
                  onClick={() => setCustomTarget(row.target)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: '#fff', fontSize: 16 }}>{row.target.toFixed(1)}x</span>
                    {row.lastHitAgo === 0 && <Flame size={12} color="#ff3366" />}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                    {L.lastHit}:{' '}
                    <strong style={{ color: '#ffd000' }}>
                      {row.lastHitAgo === 0 ? L.now : row.lastHitAgo < 0 ? L.never : `${row.lastHitAgo}${L.rAgo}`}
                    </strong>
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                    Max gap {row.longestGap}r · {row.hitRate}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Full table */}
          <TargetHitRatesTable rounds={rounds} stats={stats} t={t} />
        </>
      )}
    </div>
  );
}
