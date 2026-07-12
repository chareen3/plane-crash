"use client"

import Link from 'next/link'
import { Orbit, ArrowLeft, Shield } from 'lucide-react'

export default function PrivacyPolicy() {
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
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">PRIVACY POLICY</h1>
            <p className="text-[10px] text-[#5a6a8a] uppercase font-bold tracking-wider mt-0.5">Last Updated: July 2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-xs md:text-sm text-[#8090b0] space-y-6 leading-relaxed">
          <p>
            At CrashTracker, we are committed to protecting your privacy. This Privacy Policy describes how we collect, use, store, and share your personal information when you use our website, dashboard, and browser extension services.
          </p>

          <hr className="border-white/[0.05] my-6" />

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">1. Information We Collect</h2>
            <p>We collect information to provide a better user experience and to secure our services:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#e8eeff]">Account Information:</strong> When you register on CrashTracker, we collect your email address. This is used for login authentication, sending payment receipts, and billing notifications.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Payment Verification Data:</strong> For local bank transfers in Sri Lanka, we collect the transaction slip reference number or ID that you submit. We do not process or store credit card details directly; all card transactions are processed securely by our checkout merchant, Polar.sh.
              </li>
              <li>
                <strong className="text-[#e8eeff]">Extension & Telemetry Data:</strong> Our browser extension collects anonymous metrics and connection status to synchronize historical and current round data from live feeds directly with your dashboard. No personal browsing history is accessed or stored.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">2. How We Use Your Information</h2>
            <p>We process your personal information for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To create, manage, and verify your subscription account.</li>
              <li>To process manual bank transfer claims and activate premium access.</li>
              <li>To provide and maintain the live server synchronization of rounds.</li>
              <li>To communicate important service announcements, security alerts, and support requests.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">3. Information Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We only share information with third-party service providers (such as Supabase for database storage and Polar.sh for payment processing) to the extent necessary to deliver the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">4. Security Measures</h2>
            <p>
              We implement industry-standard encryption, SSL protocols, and secure cloud storage keys to safeguard your email address and active session states against unauthorized access, modification, or disclosure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">5. Your Rights and Data Erasure</h2>
            <p>
              You have the right to request access to the personal data we hold about you or request its deletion. To request complete deletion of your account and all associated transaction records, please contact our support team.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">6. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with the updated "Last Updated" date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">7. Contact Us</h2>
            <p>
              If you have any questions or concerns regarding your privacy, please reach out to us at <span className="text-cyan-400">support@crashtracker.space</span>.
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
            <Link href="/terms" className="hover:text-cyan-400">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
