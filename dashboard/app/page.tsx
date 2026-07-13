import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import {
  Orbit, Bot, ShieldCheck, Zap, Activity, Coins, TrendingUp, Brain,
  BarChart3, Layers, Clock, Target, Star, ChevronRight, AlertTriangle,
  Check, Flame, Globe, Lock, Cpu, Eye, Sparkles, ArrowRight
} from 'lucide-react'
import { ProductShowcase } from './components/ProductShowcase'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{ fontFamily: "'Inter', 'Noto Sans Sinhala', 'Noto Sans Tamil', sans-serif" }}
      className="min-h-screen bg-[#060a14] text-[#e8eeff] overflow-x-hidden">

      {/* ── Ambient Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-purple-600/[0.05] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/[0.04] rounded-full blur-3xl" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ══════════════════════ HEADER ══════════════════════ */}
      <header className="relative z-50 border-b border-white/[0.04] bg-[#060a14]/90 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CrashTracker" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              CrashTracker
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold tracking-widest uppercase">
              AI Pro
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#5a6a8a]">
            <a href="#product" className="hover:text-cyan-400 transition-colors">Product</a>
            <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/app"
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#060a14] shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all duration-200">
                Dashboard <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <Link href="/login"
                  className="hidden sm:block text-xs font-semibold text-[#5a6a8a] hover:text-cyan-400 transition-colors">
                  Log In
                </Link>
                <Link href="/login?tab=signup"
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#060a14] shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all duration-200">
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative z-10 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-6xl mx-auto px-6 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/25 bg-cyan-500/[0.06] text-cyan-300 text-xs font-bold tracking-widest uppercase mb-8 animate-pulse">
            <Bot size={13} />
            Live Telemetry • AI-Driven Analytics • Risk Assessment Dashboard
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-black text-[#e8eeff] mb-6 leading-tight tracking-tight">
            Stop Playing Blind. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Play Smart with Live AI Data.</span>
          </h1>

          {/* Sub headline in English */}
          <p className="text-base md:text-xl text-[#8090b0] max-w-3xl mx-auto mb-4 leading-relaxed">
            Don't lose your money to emotions. Our <strong className="text-cyan-400">AI Analytics Engine</strong> reads live game data, finds hidden patterns, and shows you the safest time to cash out.
          </p>
          <p className="text-sm text-[#5a6a8a] max-w-2xl mx-auto mb-12">
            Built for 1xBet Crash. Get live alerts to avoid bad losing streaks, understand the risks, and play with a clear winning strategy.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href={user ? "/app" : "/login?tab=signup"}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-2xl bg-[#00ffd5] text-[#060a14] hover:bg-[#33ffdd] shadow-sm hover:shadow-[#00ffd5]/15 hover:-translate-y-0.5 transition-all duration-200">
              <Sparkles size={16} />
              {user ? 'Open Dashboard' : 'Start Free — Try 7 Days'}
            </Link>
            <a href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-2xl border border-white/10 bg-transparent hover:bg-white/[0.03] text-[#8090b0] hover:text-[#e8eeff] hover:-translate-y-0.5 transition-all duration-200">
              <Eye size={16} />
              See How It Works
            </a>
          </div>

          {/* Social Proof Strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#5a6a8a]">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                {['KP', 'SM', 'RJ', 'TD'].map((initials, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-[9px] font-bold text-cyan-300">{initials}</div>
                ))}
              </div>
              <span><strong className="text-[#e8eeff]">500+</strong> Sri Lankan users</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
              <span><strong className="text-[#e8eeff]">4.9/5</strong> rating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity size={13} className="text-green-400" />
              <span>Live right now on <strong className="text-[#e8eeff]">1xBet LK</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ TRUST BAR ══════════════════════ */}
      <section className="relative z-10 border-y border-white/[0.04] bg-white/[0.01] py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Live AI Engines', value: '3 Simultaneous', icon: <Brain size={20} className="text-cyan-400" /> },
              { label: 'Rounds Processed Daily', value: '10,000+', icon: <BarChart3 size={20} className="text-purple-400" /> },
              { label: 'Rounds Analyzed', value: '50,000+', icon: <TrendingUp size={20} className="text-green-400" /> },
              { label: 'Telemetry Latency', value: '< 2 seconds', icon: <Zap size={20} className="text-yellow-400" /> },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                  {s.icon}
                </div>
                <div className="text-xl font-black text-[#e8eeff]">{s.value}</div>
                <div className="text-xs text-[#5a6a8a]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ PRODUCT SHOWCASE ══════════════════════ */}
      <ProductShowcase />

      {/* Mid-page CTA after screenshots */}
      <section className="relative z-10 pb-8">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm text-[#8090b0] mb-5">
            This is the same interface after you sign up — live risk scoring, target math, and pattern alerts.
          </p>
          <Link href={user ? '/app' : '/login?tab=signup'}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold uppercase tracking-wider rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#060a14] shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 transition-all">
            <Sparkles size={15} />
            {user ? 'Open Your Dashboard' : 'Start Free Trial — See It Live'}
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════ FEATURES ══════════════════════ */}
      <section id="features" className="relative z-10 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.05] text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
              Platform Features
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-[#e8eeff] mb-4">
              Everything You Need to Play <span className="text-cyan-400">Smarter</span>
            </h2>
            <p className="text-sm md:text-base text-[#5a6a8a] max-w-2xl mx-auto">
              Built specifically for the Sri Lanka 1xBet market. Every feature is designed to reduce impulsive decisions and replace them with data-driven confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Brain size={24} />,
                color: 'cyan',
                glow: 'cyan',
                title: 'AI Analytics Engine',
                badge: 'Core',
                desc: 'CrashTracker runs 3 real-time AI data engines in parallel — each analysing different statistical layers. The consensus evaluation is far stronger than any single data point alone.',
              },
              {
                icon: <Zap size={24} />,
                color: 'yellow',
                glow: 'yellow',
                title: 'Real-Time Risk Scoring',
                badge: 'Live',
                desc: 'Get instant risk ratings (LOW / MEDIUM / HIGH) and game state classification (Calm / Normal / Volatile) calculated within 2 seconds of each round starting. Play with systematic rules.',
              },
              {
                icon: <Target size={24} />,
                color: 'green',
                glow: 'green',
                title: 'Target Hit Rates & EV',
                badge: 'Math',
                desc: 'See empirical hit rates and Expected Value (EV) calculations for Conservative (1.5x), Swing (3.0x), and Moon (8.0x) targets. Play when the math is in your favor.',
              },
              {
                icon: <Activity size={24} />,
                color: 'purple',
                glow: 'purple',
                title: 'Live Extension Sync Link',
                badge: 'Telemetry',
                desc: 'Our lightweight browser extension reads live round results directly from your game screen and syncs them to your private dashboard in real-time — zero manual entry or delays.',
              },
              {
                icon: <Layers size={24} />,
                color: 'blue',
                glow: 'blue',
                title: 'Sequence & Streak Warnings',
                badge: 'Analytics',
                desc: 'Identifies high-risk streaks like "Instant Crash Streaks" (multiple rounds under 1.2x). It alerts you to sit out and protect your capital during hostile cycles.',
              },
              {
                icon: <BarChart3 size={24} />,
                color: 'pink',
                glow: 'pink',
                title: 'Performance & Win-Rate Tracker',
                badge: 'Tracking',
                desc: 'Track your session statistics, target success rates, and P&L logs. Pinpoint exactly which strategy (Conservative / Swing / Moon) is delivering the best long-term results.',
              },
              {
                icon: <Clock size={24} />,
                color: 'orange',
                glow: 'orange',
                title: 'Dead Hour Alerts',
                badge: 'Risk Guard',
                desc: 'Certain times of day exhibit high statistical volatility. CrashTracker identifies these dead hours, alerting you to reduce stakes or stop playing to preserve your bankroll.',
              },
              {
                icon: <Globe size={24} />,
                color: 'teal',
                glow: 'teal',
                title: 'Sri Lanka Calibrated',
                badge: 'Local',
                desc: 'Time-zone aware (Asia/Colombo), local LKR bank transfers, and statistics calibrated to local regional servers for maximum tracking accuracy.',
              },
              {
                icon: <Lock size={24} />,
                color: 'rose',
                glow: 'rose',
                title: 'Private & Secure',
                badge: 'Security',
                desc: 'Your credentials and telemetry are encrypted. The extension only reads public game data; it never accesses your wallet, places bets, or interferes with the game itself.',
              },
            ].map((f, i) => {
              const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
                cyan: { bg: 'rgba(0,212,255,0.08)', text: '#00d4ff', border: 'rgba(0,212,255,0.15)', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                yellow: { bg: 'rgba(255,208,0,0.08)', text: '#ffd000', border: 'rgba(255,208,0,0.15)', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
                green: { bg: 'rgba(0,229,160,0.08)', text: '#00e5a0', border: 'rgba(0,229,160,0.15)', badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
                purple: { bg: 'rgba(167,139,250,0.08)', text: '#a78bfa', border: 'rgba(167,139,250,0.15)', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                blue: { bg: 'rgba(59,130,246,0.08)', text: '#60a5fa', border: 'rgba(59,130,246,0.15)', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                pink: { bg: 'rgba(236,72,153,0.08)', text: '#f472b6', border: 'rgba(236,72,153,0.15)', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
                orange: { bg: 'rgba(249,115,22,0.08)', text: '#fb923c', border: 'rgba(249,115,22,0.15)', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                teal: { bg: 'rgba(20,184,166,0.08)', text: '#2dd4bf', border: 'rgba(20,184,166,0.15)', badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
                rose: { bg: 'rgba(244,63,94,0.08)', text: '#fb7185', border: 'rgba(244,63,94,0.15)', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
              }
              const c = colorMap[f.color]
              return (
                <div key={i}
                  className="group relative p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                      {f.icon}
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${c.badge}`}>
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#e8eeff] mb-2">{f.title}</h3>
                  <p className="text-xs text-[#5a6a8a] leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATISTICAL ENGINES ══════════════════════ */}
      <section className="relative z-10 py-20 border-y border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/[0.05] text-purple-400 text-xs font-bold tracking-widest uppercase mb-5">
                Advanced Analytics
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#e8eeff] mb-5 leading-tight">
                Not Just Guesses.<br />
                <span className="text-purple-400">AI-Driven Data Analysis</span><br />
                Working Together.
              </h2>
              <p className="text-sm text-[#5a6a8a] leading-relaxed mb-6">
                A single data point can be misleading. That's why CrashTracker runs <strong className="text-[#e8eeff]">3 specialized analytical models</strong> simultaneously on every round — each calculating a different mathematical layer. By cross-referencing their outputs, the dashboard provides a highly calibrated Risk Score so you bet with logic, not desperation.
              </p>
              <div className="space-y-3">
                {[
                  'Real-time sequence correlation across recent history',
                  'Streak, trend & momentum classification',
                  'Volatility phase analysis (CALM / NORMAL / VOLATILE)',
                  'Dead-hour and high-risk phase detection',
                  'Recovery cycle probabilities following crash clusters',
                  'Instant crash risk indexing (0–100)',
                ].map((pt, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-[#8090b0]">
                    <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <Check size={11} className="text-purple-400" />
                    </div>
                    {pt}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  name: 'Pattern Engine',
                  role: 'Sequence Tracking',
                  desc: 'Monitors historical clusters of multipliers and flags recurring patterns like instant crash streaks.',
                  color: '#a78bfa',
                  bg: 'rgba(167,139,250,0.06)',
                  border: 'rgba(167,139,250,0.15)',
                },
                {
                  name: 'Consensus Engine',
                  role: 'Risk Assessment',
                  desc: 'Classifies standard deviations to calculate volatility and determine risk states (Calm, Normal, Volatile).',
                  color: '#00d4ff',
                  bg: 'rgba(0,212,255,0.06)',
                  border: 'rgba(0,212,255,0.15)',
                },
                {
                  name: 'Math Engine',
                  role: 'Probability Engine',
                  desc: 'Computes empirical target hit rates and Expected Value (EV) over the active session history.',
                  color: '#00e5a0',
                  bg: 'rgba(0,229,160,0.06)',
                  border: 'rgba(0,229,160,0.15)',
                },
              ].map((m, i) => (
                <div key={i} className="p-5 rounded-2xl border"
                  style={{ background: m.bg, borderColor: m.border }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${m.color}15`, border: `1px solid ${m.color}25` }}>
                      <Cpu size={18} style={{ color: m.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: m.color }}>{m.name}</div>
                      <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider">{m.role}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: m.color }} />
                      <span className="text-[10px] font-bold" style={{ color: m.color }}>LIVE</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#5a6a8a] leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section id="how-it-works" className="relative z-10 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#e8eeff] mb-4">
              Setup in <span className="text-cyan-400">3 Minutes</span>
            </h2>
            <p className="text-sm text-[#5a6a8a]">No technical knowledge required. Works on any Windows or Mac browser.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-gradient-to-b from-cyan-500/20 via-purple-500/20 to-transparent -translate-x-1/2" />
            <div className="space-y-8">
              {[
                {
                  step: '01',
                  title: 'Create Your Account',
                  desc: 'Sign up with your email. Instant access — no credit card needed for the free trial.',
                  icon: <Lock size={20} />,
                  color: '#00d4ff',
                },
                {
                  step: '02',
                  title: 'Connect to Live Dedicated Servers',
                  desc: 'Our dedicated live servers automatically capture and sync live multiplier data directly from the game to your dashboard in real-time, requiring absolutely zero extensions on your end.',
                  icon: <Cpu size={20} />,
                  color: '#a78bfa',
                },
                {
                  step: '03',
                  title: 'Open Your Dashboard',
                  desc: 'Your dashboard lights up with real-time statistics, empirical hit rates, risk assessments, and sequence warning signals.',
                  icon: <Flame size={20} />,
                  color: '#00e5a0',
                },
              ].map((s, i) => (
                <div key={i} className={`flex items-start gap-6 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative z-10"
                    style={{ background: `${s.color}10`, border: `1px solid ${s.color}25`, color: s.color }}>
                    {s.icon}
                  </div>
                  <div className={`flex-1 p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02] ${i % 2 === 1 ? 'md:text-right' : ''}`}>
                    <div className="text-4xl font-black mb-2" style={{ color: `${s.color}20` }}>{s.step}</div>
                    <h3 className="text-lg font-bold text-[#e8eeff] mb-2">{s.title}</h3>
                    <p className="text-sm text-[#5a6a8a] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
      <section className="relative z-10 py-20 border-y border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-[#e8eeff] mb-3">
              What Sri Lankan Players Say
            </h2>
            <p className="text-sm text-[#5a6a8a]">Real feedback from real users. We don't guarantee their results — only our effort.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: 'Kasun P.',
                location: 'Colombo',
                text: 'Before this, I was playing blindly. Now I check the target hit rates and stick to a consistent LKR cashout system. My decisions are way more disciplined.',
                stars: 5,
              },
              {
                name: 'Nuwan R.',
                location: 'Kandy',
                text: 'The dead hour alert alone saved me from a bad session. It flagged the high-volatility phase so I closed the game and kept my profits.',
                stars: 5,
              },
              {
                name: 'Kavindu D.',
                location: 'Galle',
                text: 'The live server data sync is seamless. I just play, the dashboard updates itself. The AI-driven engine correlation lets me see target EV in real-time.',
                stars: 5,
              },
            ].map((t, i) => (
              <div key={i} className="p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
                <div className="flex gap-0.5 mb-4">
                  {Array(t.stars).fill(0).map((_, j) => (
                    <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-[#8090b0] leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-cyan-300">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#e8eeff]">{t.name}</div>
                    <div className="text-[11px] text-[#5a6a8a]">🇱🇰 {t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ PRICING ══════════════════════ */}
      <section id="pricing" className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/[0.1] text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">
              Premium Access
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#e8eeff] mb-3">
              VIP Access. Premium Analytics. <span className="text-amber-400">Play with System.</span>
            </h2>
            <p className="text-sm text-[#5a6a8a]">
              Everything included. No feature tiers. Cancel anytime.
            </p>
          </div>

          <div className="max-w-4xl mx-auto relative group">
            {/* Subtle Outer Glow (Cyan-Blue Theme) */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl blur opacity-15 group-hover:opacity-30 transition duration-500" />

            <div className="relative p-8 md:p-10 rounded-3xl border border-white/[0.08] bg-[#0c1120]/85 backdrop-blur-md shadow-2xl flex flex-col md:flex-row gap-10 items-stretch overflow-hidden">
              {/* Hologram/Reflective Light Effects */}
              <div className="absolute -top-32 -right-32 w-72 h-72 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-blue-500/[0.03] rounded-full blur-3xl pointer-events-none" />

              {/* Left: Info & Features (60% width) */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[9px] font-black tracking-wider uppercase inline-block">
                      ⚡ PRO ACCESS
                    </span>
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                      BEST VALUES INCLUDED
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-[#f0f4ff] mb-2 tracking-wide uppercase">Crash Tracker Pro</h3>
                  <p className="text-xs text-[#8090b0] mb-6 leading-relaxed">
                    Get full access to the real-time analytics suite. Configured specifically for the Sri Lankan player ecosystem.
                  </p>

                  {/* Features List */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-[#5a6a8a] mb-2">FEATURES INCLUDED:</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { text: 'Live AI Statistical Analysis', icon: <Cpu size={12} className="text-cyan-400" /> },
                        { text: 'Unlimited real-time probability data', icon: <Zap size={12} className="text-cyan-400" /> },
                        { text: 'Live chrome extension sync', icon: <Activity size={12} className="text-cyan-400" /> },
                        { text: 'Target Expected Value (EV) calculators', icon: <Target size={12} className="text-cyan-400" /> },
                        { text: 'Dead hour & streak warning alerts', icon: <AlertTriangle size={12} className="text-cyan-400" /> },
                        { text: 'Full session statistics & strategy tracker', icon: <BarChart3 size={12} className="text-cyan-400" /> },
                      ].map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-[11px] md:text-xs">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 border border-cyan-500/20">
                            {feature.icon}
                          </span>
                          <span className="text-[#e8eeff] font-medium leading-relaxed">{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.03] pt-4 mt-6">
                  <p className="text-[9px] text-[#5a6a8a] leading-relaxed">
                    * Local bank transfers are accepted directly in LKR. Card payments are billed in USD (approx. 2,700 LKR monthly or 22,000 LKR annually).
                  </p>
                </div>
              </div>

              {/* Vertical Divider for desktop */}
              <div className="hidden md:block w-px bg-white/[0.05] self-stretch" />

              {/* Right: Checkout & Price Options (40% width) */}
              <div className="w-full md:w-80 flex flex-col justify-between shrink-0">
                <div className="space-y-4">
                  <div className="text-[10px] uppercase font-extrabold tracking-widest text-[#5a6a8a] mb-2">CHOOSE YOUR SUBSCRIPTION</div>

                  {/* Monthly pricing box */}
                  <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.01]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-[#e8eeff] uppercase">Monthly Plan</span>
                      <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">60% OFF</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className="text-xl font-black text-[#e8eeff]">2,700 LKR</span>
                      <span className="text-[10px] line-through text-[#5a6a8a]">6,800 LKR</span>
                      <span className="text-[10px] text-[#5a6a8a]">/ mo</span>
                    </div>
                    <div className="text-[10px] text-[#8090b0] mt-0.5">approx. $8 USD</div>
                  </div>

                  {/* Annual pricing box */}
                  <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.02]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-[#e8eeff] uppercase">Annual Plan</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">SAVE 32%</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className="text-xl font-black text-cyan-400">22,000 LKR</span>
                      <span className="text-[10px] line-through text-[#5a6a8a]">81,600 LKR</span>
                      <span className="text-[10px] text-[#5a6a8a]">/ yr</span>
                    </div>
                    <div className="text-[10px] text-[#8090b0] mt-0.5">approx. $64 USD</div>
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <Link href="/pricing"
                    className="w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl bg-[#00ffd5] text-[#080c18] hover:bg-[#33ffdd] shadow-sm hover:shadow-[#00ffd5]/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2">
                    <Coins size={14} /> Get Access Now
                  </Link>

                  <Link href="/pricing#bank-transfer"
                    className="w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 bg-transparent hover:bg-white/[0.03] text-[#e8eeff] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2">
                    🏦 Bank Transfer (LKR)
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section id="faq" className="relative z-10 py-20 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-[#e8eeff] mb-3">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: 'Can any software truly predict when the game will crash?',
                a: 'No. Anyone claiming to predict the exact crash point is lying. Crash games use cryptographic random algorithms. However, we do not predict the future; we compute real-time probabilities and detect sequence patterns. Just like professional poker players do not know what card is next but bet on the mathematical odds, Crash Tracker helps you play the math, not the hype.',
              },
              {
                q: 'Why do most Crash players lose their entire bankroll?',
                a: 'Emotional tilt and greed. Players get greedy waiting for a 10x multiplier, or they double their bet to chase a loss (Martingale) right into an "Instant Crash Streak" (multiple consecutive rounds below 1.2x). Crash Tracker\'s AI Sequence Engine alerts you during these high-risk streaks so you can stay disciplined and walk away.',
              },
              {
                q: 'What is the mathematical advantage of using this dashboard?',
                a: 'The dashboard calculates the empirical hit rate and Expected Value (EV) of targets like 1.5x and 2.0x in real-time. If the math shows a negative EV based on current volatility, you don\'t bet. If it\'s a positive EV phase, you play. You shift your mindset from an emotional gambler to a logical statistician.',
              },
              {
                q: 'Does this tool violate 1xBet\'s rules or get me banned?',
                a: 'No. The Chrome extension is a telemetry reader. It only reads the public numbers displayed on your game screen and syncs them to your dashboard. It does not click, place bets, or alter the game\'s code. To the casino, you are simply playing normally while viewing statistics on a second monitor.',
              },
              {
                q: 'What is the difference between Calm, Normal, and Volatile phases?',
                a: 'The game goes through cycles. In "Volatile" phases or "Dead Hours", the probability of consecutive instant crashes (< 1.2x) is high. Crash Tracker\'s AI Consensus Engine measures this variance and flags the risk score, helping you know when to lower your stakes or close the tab entirely.',
              },
              {
                q: 'Can I cancel or change my plan anytime?',
                a: 'Yes, absolutely. You can cancel your subscription with a single click from your billing dashboard. There are no contracts, commitments, or hidden penalties. Your access remains active until the end of your paid billing period.',
              },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
                <div className="flex items-start gap-4">
                  <ChevronRight size={18} className="text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#e8eeff] mb-2">{item.q}</h3>
                    <p className="text-xs text-[#5a6a8a] leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="p-12 rounded-3xl border border-cyan-500/15 bg-gradient-to-b from-[#0c1525] to-[#080e1a] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,212,255,0.06),transparent_70%)] pointer-events-none" />
            <div className="relative">
              <div className="text-4xl mb-4">🚀</div>
              <h2 className="text-3xl md:text-4xl font-black text-[#e8eeff] mb-4">
                Ready to Play <span className="text-cyan-400">Smarter</span>?
              </h2>
              <p className="text-sm text-[#5a6a8a] max-w-xl mx-auto mb-8 leading-relaxed">
                Join 500+ Sri Lankan players who've replaced gut-feeling bets with systematic data. Remember — no probability is 100% — but being <em>informed</em> is always better than playing <em>blind</em>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={user ? "/app" : "/login?tab=signup"}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#060a14] shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-1 transition-all duration-300">
                  <Sparkles size={16} />
                  {user ? 'Open Dashboard' : 'Start Your Free Trial'}
                </Link>
                <Link href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-[#8090b0] hover:text-[#e8eeff] transition-all duration-300">
                  View Pricing Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="relative z-10 border-t border-white/[0.04] pt-16 pb-10 bg-[#040810]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="CrashTracker" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-black text-lg bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  CrashTracker
                </span>
              </div>
              <p className="text-xs text-[#3a4560] leading-relaxed mb-5 max-w-sm">
                Sri Lanka's most advanced Crash game analytics platform. Built to help you play with data, discipline, and clarity.
              </p>
              {/* Disclaimer box */}
              <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03]">
                <p className="text-[11px] text-[#5a4a30] leading-relaxed">
                  ⚠️ <strong className="text-amber-600/70">Disclaimer:</strong> CrashTracker is an analytical and informational tool only. <strong>No algorithm, software, or AI can predict Crash game outcomes with 100% accuracy.</strong> Crash events are randomly generated server-side. Past patterns do not guarantee future results. This platform does not encourage gambling. Always gamble responsibly and within your means. If gambling is causing you harm, seek help.
                </p>
              </div>
            </div>

            {/* Links */}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#3a4560] mb-4">Platform</div>
              <div className="space-y-3">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Dashboard', href: '/app' },
                  { label: 'Account & Billing', href: '/account/billing' },
                ].map((l, i) => (
                  <a key={i} href={l.href}
                    className="block text-xs text-[#3a4560] hover:text-cyan-400 transition-colors">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#3a4560] mb-4">Legal</div>
              <div className="space-y-3">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Responsible Gaming', href: '/responsible-gaming' },
                  { label: 'Refund Policy', href: '/refund' },
                ].map((l, i) => (
                  <a key={i} href={l.href}
                    className="block text-xs text-[#3a4560] hover:text-cyan-400 transition-colors">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/[0.03] flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-[#2a3248]">
            <div>© {new Date().getFullYear()} CrashTracker. Made in 🇱🇰 Sri Lanka. All rights reserved.</div>
            <div className="text-center md:text-right leading-relaxed max-w-sm">
              <strong className="text-amber-900/50">Remember:</strong> No one can predict the next crash with 100% certainty. Use this tool wisely. Play with discipline, not desperation.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
