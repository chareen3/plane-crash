import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import {
  Orbit, Bot, ShieldCheck, Zap, Activity, Coins, TrendingUp, Brain,
  BarChart3, Layers, Clock, Target, Star, ChevronRight, AlertTriangle,
  Check, Flame, Globe, Lock, Cpu, Eye, Sparkles, ArrowRight
} from 'lucide-react'

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
            AI-Powered • Real-Time • Multi-Model Engine
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            <span className="block text-[#e8eeff]">Stop Gambling Blind.</span>
            <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent mt-1">
              Play with an Unfair Edge.
            </span>
          </h1>

          {/* Sub headline in English */}
          <p className="text-base md:text-xl text-[#8090b0] max-w-3xl mx-auto mb-4 leading-relaxed">
            The house always has an advantage—until now. Our <strong className="text-cyan-400">Triple-AI Engine</strong> instantly analyzes real-time crash patterns, volatility, and historical streaks to calculate high-probability cashout targets.
          </p>
          <p className="text-sm text-[#5a6a8a] max-w-2xl mx-auto mb-12">
            Why lose thousands guessing? For less than the cost of a single bad bet (Rs. 2,700/mo), arm yourself with the most advanced predictive tool built for Sri Lankan 1xBet & Aviator players. No installation required — our servers run 24/7.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href={user ? "/app" : "/login?tab=signup"}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#060a14] shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-1 transition-all duration-300">
              <Sparkles size={16} />
              {user ? 'Open Dashboard' : 'Start Free — Try 7 Days'}
            </Link>
            <a href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-[#8090b0] hover:text-[#e8eeff] transition-all duration-300">
              <Eye size={16} />
              See How It Works
            </a>
          </div>

          {/* Social Proof Strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#5a6a8a]">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                {['🇱🇰','🇱🇰','🇱🇰','🇱🇰'].map((f, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center text-[10px]">{f}</div>
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
              { label: 'AI Models Running', value: '3 Simultaneous', icon: <Brain size={20} className="text-cyan-400" /> },
              { label: 'Predictions Per Day', value: '1,000+', icon: <BarChart3 size={20} className="text-purple-400" /> },
              { label: 'Rounds Analyzed', value: '50,000+', icon: <TrendingUp size={20} className="text-green-400" /> },
              { label: 'Response Time', value: '< 2 seconds', icon: <Zap size={20} className="text-yellow-400" /> },
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

      {/* ══════════════════════ HONEST MESSAGE ══════════════════════ */}
      <section className="relative z-10 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="p-6 md:p-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] flex flex-col md:flex-row items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300 mb-2">
                🎯 Our Honest Promise to You
              </h3>
              <p className="text-sm text-[#8090b0] leading-relaxed">
                <strong className="text-[#e8eeff]">No tool, algorithm, or AI can predict Crash game outcomes with 100% accuracy.</strong> The house always has an edge. CrashTracker does NOT guarantee wins — it gives you <strong className="text-amber-300">statistically-informed signals</strong>, real-time pattern analysis, and smarter cashout timing to help you make <em>better decisions</em>, not guaranteed ones. Play responsibly. Only bet what you can afford to lose.
              </p>
            </div>
          </div>
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
                title: 'Triple AI Model Engine',
                badge: 'Core',
                desc: 'CrashTracker runs 3 AI models in parallel — each analysing different patterns. The consensus signal is far stronger than any single model alone. Powered by Claude, GPT-4o, and DeepSeek.',
              },
              {
                icon: <Zap size={24} />,
                color: 'yellow',
                glow: 'yellow',
                title: 'Real-Time Crash Signals',
                badge: 'Live',
                desc: 'Get instant risk ratings (LOW / MEDIUM / HIGH) and cashout targets calculated within 2 seconds of each round starting. No delay. No guessing.',
              },
              {
                icon: <Target size={24} />,
                color: 'green',
                glow: 'green',
                title: 'Multi-Tier Cashout Targets',
                badge: 'Strategy',
                desc: 'Receive Conservative (1.5–2x), Swing (3–5x), and Moon (8–15x) targets for every round. Choose your risk level and stick to a system.',
              },
              {
                icon: <Activity size={24} />,
                color: 'purple',
                glow: 'purple',
                title: '24/7 Server Sync',
                badge: 'Automation',
                desc: 'Our secure cloud infrastructure silently reads game data directly from 1xBet servers and syncs it to your private dashboard in real-time — no manual data entry ever needed.',
              },
              {
                icon: <Layers size={24} />,
                color: 'blue',
                glow: 'blue',
                title: 'Pattern & Streak Detection',
                badge: 'Analytics',
                desc: 'Detects hot/cold streaks, dead hours, volatility phases, and recovery cycles. Automatically skips rounds where the AI identifies high-risk low-reward conditions.',
              },
              {
                icon: <BarChart3 size={24} />,
                color: 'pink',
                glow: 'pink',
                title: 'Performance Dashboard',
                badge: 'Tracking',
                desc: 'Track your win rate, AI accuracy, P&L per session, and identify which strategy (Conservative / Swing / Moon) is performing best for your play style.',
              },
              {
                icon: <Clock size={24} />,
                color: 'orange',
                glow: 'orange',
                title: 'Dead Hour Alerts',
                badge: 'Risk Guard',
                desc: 'Some hours of the day are statistically more volatile. CrashTracker alerts you and suppresses aggressive signals during known dead hours to protect your bankroll.',
              },
              {
                icon: <Globe size={24} />,
                color: 'teal',
                glow: 'teal',
                title: 'Sri Lanka Optimised',
                badge: 'Local',
                desc: 'Time-zone aware (Asia/Colombo), Sinhala & Tamil font support, LKR pricing, and analysis calibrated to 1xBet LK server patterns — not generic global data.',
              },
              {
                icon: <Lock size={24} />,
                color: 'rose',
                glow: 'rose',
                title: 'Private & Secure',
                badge: 'Security',
                desc: 'Your game data stays private. End-to-end encrypted, secured by Supabase Auth. No data is ever sold or shared. Your edge stays yours.',
              },
            ].map((f, i) => {
              const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
                cyan:   { bg: 'rgba(0,212,255,0.08)',   text: '#00d4ff', border: 'rgba(0,212,255,0.15)',   badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                yellow: { bg: 'rgba(255,208,0,0.08)',   text: '#ffd000', border: 'rgba(255,208,0,0.15)',   badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
                green:  { bg: 'rgba(0,229,160,0.08)',   text: '#00e5a0', border: 'rgba(0,229,160,0.15)',   badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
                purple: { bg: 'rgba(167,139,250,0.08)', text: '#a78bfa', border: 'rgba(167,139,250,0.15)', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                blue:   { bg: 'rgba(59,130,246,0.08)',  text: '#60a5fa', border: 'rgba(59,130,246,0.15)',  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                pink:   { bg: 'rgba(236,72,153,0.08)',  text: '#f472b6', border: 'rgba(236,72,153,0.15)',  badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
                orange: { bg: 'rgba(249,115,22,0.08)',  text: '#fb923c', border: 'rgba(249,115,22,0.15)',  badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                teal:   { bg: 'rgba(20,184,166,0.08)',  text: '#2dd4bf', border: 'rgba(20,184,166,0.15)',  badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
                rose:   { bg: 'rgba(244,63,94,0.08)',   text: '#fb7185', border: 'rgba(244,63,94,0.15)',   badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
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

      {/* ══════════════════════ AI MODELS ══════════════════════ */}
      <section className="relative z-10 py-20 border-y border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/[0.05] text-purple-400 text-xs font-bold tracking-widest uppercase mb-5">
                Multi-Model AI
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#e8eeff] mb-5 leading-tight">
                Not One AI.<br/>
                <span className="text-purple-400">Three AI Minds</span><br/>
                Working Together.
              </h2>
              <p className="text-sm text-[#5a6a8a] leading-relaxed mb-6">
                A single AI model can be wrong. That's why CrashTracker runs <strong className="text-[#e8eeff]">Claude Sonnet, GPT-4o, and DeepSeek</strong> simultaneously on every round — each with its own analysis strategy. When all three agree, you get the highest confidence signals. When they disagree, the system flags it as uncertain and reduces stake recommendations automatically.
              </p>
              <div className="space-y-3">
                {[
                  'Pattern recognition across last 200 rounds',
                  'Streak & momentum analysis',
                  'Volatility phase classification (CALM / NORMAL / VOLATILE)',
                  'Hot/dead hour detection by time-of-day',
                  'Recovery cycle prediction after crash streaks',
                  'Instant crash risk scoring (0–100)',
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
                  name: 'Claude Sonnet',
                  role: 'Pattern & Reasoning',
                  desc: 'Excels at long-context pattern analysis and nuanced reasoning about volatility cycles.',
                  color: '#a78bfa',
                  bg: 'rgba(167,139,250,0.06)',
                  border: 'rgba(167,139,250,0.15)',
                },
                {
                  name: 'GPT-4o',
                  role: 'Signal Consensus',
                  desc: 'Provides strategy recommendations and validates signals from the other models for consensus confidence.',
                  color: '#00d4ff',
                  bg: 'rgba(0,212,255,0.06)',
                  border: 'rgba(0,212,255,0.15)',
                },
                {
                  name: 'DeepSeek R1',
                  role: 'Mathematical Analysis',
                  desc: 'Specialised in statistical calculations — probability distributions, expected value, and risk-adjusted targets.',
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
                  title: 'Activate the Data Link',
                  desc: 'Create your account and instantly connect. Our 24/7 dedicated servers continuously feed live 1xBet data directly into our AI models with zero latency. No extensions required.',
                  icon: <Cpu size={20} />,
                  color: '#a78bfa',
                },
                {
                  step: '03',
                  title: 'Open Your Dashboard',
                  desc: 'Your private dashboard lights up with live AI signals, cashout targets, and risk ratings — round by round, automatically.',
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
                text: 'Before this, I was playing blindly. Now I wait for the LOW risk signal and cash out at the target. My decisions are way more disciplined.',
                stars: 5,
              },
              {
                name: 'Nuwan R.',
                location: 'Kandy',
                text: 'The dead hour alert alone saved me from a bad session. It told me to stop during what I used to think were good hours.',
                stars: 5,
              },
              {
                name: 'Kavindu D.',
                location: 'Galle',
                text: 'The server sync is seamless. I just play, the dashboard updates itself. The 3 AI models thing is crazy — you can see all three thinking.',
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
            <div className="inline-block px-3 py-1 rounded-full border border-green-500/20 bg-green-500/[0.05] text-green-400 text-xs font-bold tracking-widest uppercase mb-4">
              Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#e8eeff] mb-3">
              One Plan. Full Access. <span className="text-green-400">No Limits.</span>
            </h2>
            <p className="text-sm text-[#5a6a8a]">
              Everything included. No feature tiers. Cancel anytime.
            </p>
          </div>

          <div className="relative p-8 md:p-12 rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#0c1525] to-[#080e1a] overflow-hidden">
            {/* Glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/[0.06] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/[0.06] rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              {/* Left: Pricing */}
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/25 text-cyan-300 text-xs font-bold tracking-widest uppercase mb-6">
                  ⚡ PRO PLAN — MOST POPULAR
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-5xl md:text-6xl font-black text-cyan-400">$8</span>
                  <div className="mb-2">
                    <div className="text-sm text-[#5a6a8a]">USD / month</div>
                    <div className="text-base font-bold text-green-400">≈ 2,700 LKR / month</div>
                  </div>
                </div>
                <p className="text-xs text-[#5a6a8a] mb-8">
                  That's less than 90 LKR per day — less than a cup of tea, for full AI-powered signals.
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    { text: 'All 3 AI Models (Claude + GPT-4o + DeepSeek)', icon: <Brain size={14} className="text-cyan-400" />, bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                    { text: 'Unlimited real-time predictions', icon: <Zap size={14} className="text-yellow-400" />, bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                    { text: '24/7 Dedicated Server Connection', icon: <Cpu size={14} className="text-purple-400" />, bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { text: 'Conservative, Swing & Moon strategies', icon: <Target size={14} className="text-emerald-400" />, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { text: 'Dead hour alerts & skip signals', icon: <AlertTriangle size={14} className="text-orange-400" />, bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                    { text: 'Full performance & win-rate analytics', icon: <BarChart3 size={14} className="text-blue-400" />, bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                    { text: 'Priority support (Sinhala & English)', icon: <Star size={14} className="text-pink-400" />, bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
                    { text: 'Cancel anytime — no contracts', icon: <ShieldCheck size={14} className="text-green-400" />, bg: 'bg-green-500/10', border: 'border-green-500/20' },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3.5 text-[13px] md:text-sm text-[#8090b0] bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] p-2.5 rounded-xl transition-colors">
                      <div className={`w-7 h-7 rounded-lg ${feature.bg} border ${feature.border} flex items-center justify-center shrink-0`}>
                        {feature.icon}
                      </div>
                      <span className="font-medium text-[#e8eeff]">{feature.text}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/pricing"
                    className="flex items-center justify-center gap-2 px-7 py-4 text-sm font-bold uppercase tracking-wider rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#060a14] shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 transition-all duration-200">
                    <Coins size={15} />
                    Get Full Access
                  </Link>
                  <Link href="/pricing#bank-transfer"
                    className="flex items-center justify-center gap-2 px-7 py-4 text-sm font-bold uppercase tracking-wider rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-[#8090b0] hover:text-[#e8eeff] transition-all duration-200">
                    🏦 Pay via Bank Transfer
                  </Link>
                </div>
              </div>

              {/* Right: Payment Methods */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-[#5a6a8a] mb-3">Payment Methods</div>
                {[
                  {
                    icon: '💳',
                    title: 'International Card (USD)',
                    desc: 'Visa, MasterCard, or any debit/credit card. Secure checkout via Polar.sh.',
                    badge: 'Instant',
                    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                  },
                  {
                    icon: '🏦',
                    title: 'Sri Lanka Bank Transfer (LKR)',
                    desc: 'Pay via HNB, BOC, Sampath, or any local bank. Manual confirmation within 24 hours.',
                    badge: '24h',
                    badgeColor: 'bg-green-500/10 text-green-400 border-green-500/20',
                  },
                ].map((pm, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{pm.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-[#e8eeff]">{pm.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pm.badgeColor}`}>{pm.badge}</span>
                        </div>
                        <p className="text-xs text-[#5a6a8a] leading-relaxed">{pm.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-center">
                  <p className="text-xs text-[#5a6a8a]">
                    🔒 Payments secured by Polar.sh • SSL encrypted
                  </p>
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
                q: 'Is this guaranteed to make me money?',
                a: 'No. Absolutely not. No system can guarantee wins in a random-number-based game. CrashTracker is an analytical tool that helps you make more structured, data-informed decisions — not a money-printing machine. Please gamble responsibly.',
              },
              {
                q: 'Which platforms are supported?',
                a: 'Currently optimised for 1xBet Crash (LK server), LuckyJet, and Aviator. Our 24/7 cloud servers read live game data automatically.',
              },
              {
                q: 'Do I need to be a programmer to set this up?',
                a: 'No. Just create an account, and your dashboard starts updating automatically. No coding, configuration, or downloads required.',
              },
              {
                q: 'Can I pay in Sri Lankan Rupees?',
                a: 'Yes. We accept bank transfers in LKR directly to our HNB account. After payment, your account is activated within 24 hours. We also accept international cards in USD.',
              },
              {
                q: 'What are the three AI models?',
                a: 'Claude Sonnet (pattern reasoning), GPT-4o (consensus & strategy), and DeepSeek R1 (mathematical analysis). All three analyse each round independently, and the combined signal gives you a confidence score.',
              },
              {
                q: 'Can I cancel my subscription?',
                a: 'Yes, cancel anytime with one click from your billing page. No contracts, no penalties. Your access continues until the end of your current billing period.',
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
                Join 500+ Sri Lankan players who've replaced gut-feeling bets with AI-powered discipline. Remember — no prediction is 100% — but being <em>informed</em> is always better than being <em>blind</em>.
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
                Sri Lanka's most advanced AI-powered Crash game analytics platform. Built to help you play with data, discipline, and clarity.
              </p>
              {/* Disclaimer box */}
              <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03]">
                <p className="text-[11px] text-[#5a4a30] leading-relaxed">
                  ⚠️ <strong className="text-amber-600/70">Disclaimer:</strong> CrashTracker is an analytical and informational tool only. <strong>No algorithm or AI can predict Crash game outcomes with 100% accuracy.</strong> Past patterns do not guarantee future results. This platform does not encourage gambling. Always gamble responsibly and within your means. If gambling is causing you harm, seek help.
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

            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#3a4560] mb-4">Legal</div>
              <div className="space-y-3">
                {[
                  { label: 'Privacy Policy', href: '#' },
                  { label: 'Terms of Service', href: '#' },
                  { label: 'Responsible Gaming', href: '#' },
                  { label: 'Refund Policy', href: '#' },
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
