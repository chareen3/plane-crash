import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Orbit, Bot, ShieldCheck, Zap, Activity, Coins } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#080c18] text-[#f0f4ff] overflow-x-hidden flex flex-col justify-between">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_30%,rgba(0,100,255,0.08)_0%,transparent_50%),radial-gradient(circle_at_100%_70%,rgba(80,0,180,0.08)_0%,transparent_50%)] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.05] bg-[#080c18]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-cyan-400">
              <Orbit className="animate-spin-slow" size={26} />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              CRASH TRACKER
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#5a6a8a]">
            <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</a>
            <a href="#about" className="hover:text-cyan-400 transition-colors">How it Works</a>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/app"
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-md hover:shadow-cyan-400/20 transition-all duration-300 hover:-translate-y-0.5"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-bold uppercase tracking-wider text-[#5a6a8a] hover:text-cyan-400 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/login?tab=signup"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-cyan-500/30 hover:border-cyan-400 bg-cyan-400/5 hover:bg-cyan-400/10 text-cyan-400 transition-all duration-300"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24 flex-grow flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6 animate-pulse">
          <Bot size={14} /> AI-Powered Predictive Analytics
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl mb-6">
          Predict the Next Crash Round <br className="hidden md:inline" />
          With <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">Real-Time Precision</span>
        </h1>

        <p className="text-base md:text-lg text-[#5a6a8a] max-w-2xl mb-10 leading-relaxed">
          Unlock predictive insights, confidence metrics, and calculated cashout targets. Stay ahead of volatility on Aviator, LuckyJet, and 1xbet with real-time Chrome Extension synchronization.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-20 justify-center">
          {user ? (
            <Link
              href="/app"
              className="px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-lg hover:shadow-cyan-400/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              Open Active Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login?tab=signup"
                className="px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-lg hover:shadow-cyan-400/20 transition-all duration-300 hover:-translate-y-0.5"
              >
                Access Dashboard Now
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 font-bold text-sm uppercase tracking-wider rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-[#f0f4ff] transition-all duration-300"
              >
                View Subscription Plans
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <section id="features" className="w-full pt-12 border-t border-white/[0.05]">
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#5a6a8a] mb-12">Core Platform Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl border border-white/[0.04] bg-[#0c1120] hover:border-cyan-500/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                <Zap size={22} />
              </div>
              <h3 className="text-base font-bold mb-2">Real-Time Signals</h3>
              <p className="text-xs text-[#5a6a8a] leading-relaxed">
                Instant calculations showing multipliers, risk classifications, and optimal cashout recommendations for the active round.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.04] bg-[#0c1120] hover:border-cyan-500/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-base font-bold mb-2">Multi-Tier Strategies</h3>
              <p className="text-xs text-[#5a6a8a] leading-relaxed">
                Choose between Conservative (Safe), Swing, or Moon plays depending on current game trends and local multipliers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.04] bg-[#0c1120] hover:border-cyan-500/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Activity size={22} />
              </div>
              <h3 className="text-base font-bold mb-2">Realtime Sync</h3>
              <p className="text-xs text-[#5a6a8a] leading-relaxed">
                Fully connected web dashboard syncing directly with your Chrome extension feed via database trigger channels.
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic Pricing Callout */}
        <section id="pricing" className="w-full py-20 mt-12">
          <div className="p-8 md:p-12 rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#0c1120] to-[#080c18] relative overflow-hidden max-w-3xl mx-auto">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
            <h2 className="text-2xl font-black mb-3">Single Simple Subscription</h2>
            <p className="text-xs text-[#5a6a8a] mb-6 max-w-md mx-auto">
              Get full, unrestricted access to the predictions dashboard. Cancel at any time.
            </p>
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="text-4xl md:text-5xl font-black text-cyan-400">8 USD</span>
              <span className="text-[#5a6a8a] text-sm">/ month</span>
              <span className="text-[#5a6a8a] mx-2">|</span>
              <span className="text-sm text-emerald-400 font-bold">≈ 2,700 LKR</span>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 font-bold text-xs uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md hover:shadow-cyan-400/20 transition-all duration-300"
            >
              Get Pro Plan Access <Coins size={14} />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-8 bg-[#080c18]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-[#3a4560] gap-4">
          <div className="flex items-center gap-2">
            <Orbit size={16} />
            <span>&copy; {new Date().getFullYear()} Crash Tracker. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-cyan-400">Privacy Policy</a>
            <a href="#" className="hover:text-cyan-400">Terms of Service</a>
            <a href="/pricing" className="hover:text-cyan-400">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
