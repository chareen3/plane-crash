"use client"

import Link from 'next/link'
import { Orbit, ArrowLeft, Heart } from 'lucide-react'

export default function ResponsibleGaming() {
  return (
    <div className="min-h-screen bg-[#080c18] text-[#f0f4ff] overflow-x-hidden relative flex flex-col justify-between">
      {/* Background Radial Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_30%,rgba(0,100,255,0.05)_0%,transparent_50%),radial-gradient(circle_at_100%_70%,rgba(0,255,213,0.03)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.05] bg-[#080c18]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="CrashTracker" className="w-[26px] h-[26px] rounded-md object-cover" />
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              CRASH TRACKER
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-1 text-xs text-[#8090b0] hover:text-cyan-400 transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-20 flex-grow w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Heart size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">RESPONSIBLE GAMING</h1>
            <p className="text-[10px] text-[#5a6a8a] uppercase font-bold tracking-wider mt-0.5">Player Safety & Awareness</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-xs md:text-sm text-[#8090b0] space-y-6 leading-relaxed">
          <p>
            At CrashTracker, we value player safety. While our platform provides analytical tools, historical crash logs, and target recommendations to help replace emotional bets with data, we recognize that gaming can become addictive. We encourage all players to understand the risks and practice safe play habits.
          </p>

          <hr className="border-white/[0.05] my-6" />

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">1. Core Truths About Crash Games</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#e8eeff]">The House Edge:</strong> Every crash-style game (including 1xBet Crash) has a built-in house advantage. No tool, software, or prediction engine can bypass this math or guarantee long-term wins.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Unpredictable Spikes:</strong> Crash rounds operate on random number generators. Even though historical streaks and volatility phases can provide informed risk guidance, they do not dictate the future.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Entertainment, Not Income:</strong> Gaming should only be seen as a form of entertainment, not as a shortcut to financial recovery or a steady income source.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">2. Guidelines for Safer Play</h2>
            <p>To keep your play healthy and under control, adhere to the following principles:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#e8eeff]">Set a Budget:</strong> Determine an amount you are entirely comfortable losing before you start playing. Never bet money allocated for rent, bills, or food.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Set Time Limits:</strong> It is easy to lose track of time. Decide in advance how long you will spend playing per day and log off when that limit is reached.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Don't Chase Losses:</strong> If you hit a losing streak, accept it and step away. Chasing losses almost always leads to larger, impulsive bets.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Take Regular Breaks:</strong> Step back periodically to clear your mind. Do not play under stress, fatigue, or the influence of alcohol.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">3. Recognizing Warning Signs</h2>
            <p>You may need to evaluate your gaming habits if you experience any of the following:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Spending more money or time playing than originally intended.</li>
              <li>Feeling restless, irritated, or anxious when attempting to log off.</li>
              <li>Neglecting family, relationships, or work responsibilities in order to play.</li>
              <li>Borrowing money, selling assets, or lying to others to fund your gaming.</li>
              <li>Viewing gaming as a way to escape stress or real-life problems.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">4. Seeking Help in Sri Lanka</h2>
            <p>
              If you or someone you know is struggling with gaming addiction, free, confidential support is available. Please reach out to professional counseling services:
            </p>
            <div className="p-5 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-4">
              <div>
                <strong className="text-[#e8eeff] block text-sm">Sri Lanka Sumithrayo</strong>
                <p className="text-xs text-[#8090b0] mt-1">Offering confidential emotional support and counseling for individuals in crisis.</p>
                <p className="text-xs text-cyan-400 font-bold mt-1">📞 Hotline: +94 11 269 6666 / +94 11 268 2535</p>
              </div>
              <hr className="border-white/[0.04]" />
              <div>
                <strong className="text-[#e8eeff] block text-sm">CCC Foundation Sri Lanka</strong>
                <p className="text-xs text-[#8090b0] mt-1">Providing free telephone counseling and emotional support across the country.</p>
                <p className="text-xs text-cyan-400 font-bold mt-1">📞 Helpline: 1333 (Toll-Free)</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-6 bg-[#080c18]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-[11px] text-[#3a4560] gap-4">
          <span className="flex items-center gap-1.5"><Orbit size={14} /> &copy; {new Date().getFullYear()} Crash Tracker. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-cyan-400">Home</Link>
            <Link href="/pricing" className="hover:text-cyan-400">Pricing</Link>
            <Link href="/privacy" className="hover:text-cyan-400">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
