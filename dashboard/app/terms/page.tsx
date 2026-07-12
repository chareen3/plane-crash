"use client"

import Link from 'next/link'
import { Orbit, ArrowLeft, FileText } from 'lucide-react'

export default function TermsOfService() {
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
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">TERMS OF SERVICE</h1>
            <p className="text-[10px] text-[#5a6a8a] uppercase font-bold tracking-wider mt-0.5">Last Updated: July 2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-xs md:text-sm text-[#8090b0] space-y-6 leading-relaxed">
          <p>
            Welcome to CrashTracker. By accessing or using our website, live dashboard, browser extension, or subscription packages (collectively, the "Services"), you agree to be bound by these Terms of Service. Please read them carefully.
          </p>

          <hr className="border-white/[0.05] my-6" />

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">1. Acceptance of Terms</h2>
            <p>
              By signing up for an account, subscribing to a plan, or submitting transaction records, you confirm that you have read, understood, and agreed to these terms. If you do not agree, you must immediately cease all access and use of our Services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">2. Description of Service</h2>
            <p>
              CrashTracker provides mathematical analysis, statistical patterns, and historical round logs for crash-style games (such as 1xBet Crash).
            </p>
            <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] text-amber-300">
              <strong>⚠️ CRITICAL DISCLAIMER:</strong> CrashTracker is an informational and analytical tool. We do NOT guarantee winning results. No algorithm or formula can predict random multiplier crashes with 100% accuracy. The house always has an inherent mathematical edge. Users must evaluate signals at their own risk. We are not responsible for any financial losses incurred.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">3. Subscription and Billing</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#e8eeff]">Payments:</strong> Subscription access requires prepaid monthly or annual fees. Payments are processed securely via Polar.sh for cards, or manually via bank transfer in LKR.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Cancellation:</strong> You may cancel your subscription at any time. Upon cancellation, you will continue to have access to the dashboard until the end of your prepaid period. No automatic renewal charges will occur thereafter.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Account Access:</strong> A subscription grants single-user access. Sharing credentials or using automated scripts to scrape signals from the dashboard is strictly prohibited.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">4. Permitted and Prohibited Use</h2>
            <p>
              Our Services are for personal, informational use only. You agree not to distribute, resell, lease, or license the live prediction stream or analytical parameters to others. Reverse engineering the extension telemetry or attempting to intercept API calls is prohibited and will result in permanent account termination without a refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">5. Disclaimer of Warranties</h2>
            <p>
              OUR SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. CRASHTRACKER DOES NOT WARRANT THAT THE TELEMETRY OR SIGNAL STREAMS WILL BE UNINTERRUPTED, COMPLETELY ACCURATE, OR ERROR-FREE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">6. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL CRASHTRACKER, ITS ADMINS, OR PARTNERS BE LIABLE FOR ANY DIRECT, INDIRECT, PUNITIVE, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF CAPITAL, PROFITS, OR DATA arising out of or in connection with the use of the dashboard or signals.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">7. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of Sri Lanka, without regard to conflicts of law principles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">8. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. Your continued use of the dashboard after any changes constitutes acceptance of the new Terms of Service.
            </p>
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
