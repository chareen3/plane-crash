"use client"

import Link from 'next/link'
import { Orbit, ArrowLeft, Coins } from 'lucide-react'

export default function RefundPolicy() {
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
            <Coins size={20} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">REFUND POLICY</h1>
            <p className="text-[10px] text-[#5a6a8a] uppercase font-bold tracking-wider mt-0.5">Billing & Cancellations</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-xs md:text-sm text-[#8090b0] space-y-6 leading-relaxed">
          <p>
            Thank you for subscribing to CrashTracker. We aim to provide real-time game telemetry, historical charts, and predictive analysis parameters to help you evaluate crash rounds data-driven. Please read our refund policy below.
          </p>

          <hr className="border-white/[0.05] my-6" />

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">1. General Terms (No Refunds)</h2>
            <p>
              Due to the digital nature of our Services and the immediate delivery of predictive telemetry, server sync logs, and active status privileges:
            </p>
            <div className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.01] text-xs space-y-2">
              <p>
                <strong className="text-cyan-400">All monthly and annual subscription sales are final.</strong> We do not offer refunds, pro-rated refunds, or credits for partial billing periods or unused dashboard access.
              </p>
              <p>
                Once an account access key is activated or a bank transfer submission is verified, the full value of the selected billing period is deemed consumed.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">2. Bank Transfer Submissions</h2>
            <p>
              For payments made via local bank transfer in Sri Lankan Rupees (LKR):
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Please double-check transaction amounts (LKR 2,700 for monthly or LKR 22,000 for annual) prior to sending. Overpayments cannot be partially refunded, though they may be credited to extend your active subscription duration.</li>
              <li>Bank transfer requests are processed and activated within 24 hours. If your transaction reference is rejected by our admins due to mismatching details or duplicate slip submissions, access will not be activated.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">3. Subscription Cancellation</h2>
            <p>
              You can cancel your subscription at any time. When you cancel:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your account access remains active until the end of your current paid billing period (monthly or annual).</li>
              <li>You will not be billed again in future billing cycles.</li>
              <li>Cancellations can be made directly in the billing dashboard or by emailing our support team.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">4. Technical Outages or Issues</h2>
            <p>
              If a major technical outage occurs on our server side that prevents predictions for more than 48 consecutive hours, please contact support. We may, at our sole discretion, extend your active subscription time as compensation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#e8eeff] uppercase tracking-wide">5. Contact Support</h2>
            <p>
              For disputes, double billing errors, or help with cancellation, please email us at <span className="text-cyan-400">billing@crashtracker.space</span>. We will review your request and get back to you within 2 business days.
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
