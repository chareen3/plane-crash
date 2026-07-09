"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Orbit, Check, ArrowRight, Loader2, AlertCircle, Info, Landmark, HelpCircle, X } from 'lucide-react'

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [pendingPayment, setPendingPayment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Bank Transfer Modal States
  const [showBankModal, setShowBankModal] = useState(false)
  const [slipRef, setSlipRef] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [submittingBank, setSubmittingBank] = useState(false)
  const [bankError, setBankError] = useState<string | null>(null)
  const [bankSuccess, setBankSuccess] = useState(false)

  // Card checkout loading
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (currentUser) {
        // Fetch subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', currentUser.id)
          .single()

        setSubscription(sub)

        // Fetch any pending bank transfers
        const { data: pay } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('method', 'bank_transfer')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)

        if (pay && pay.length > 0) {
          setPendingPayment(pay[0])
        }
      }
      setLoading(false)
    }
    loadData()
  }, [supabase])

  const handleCardPayment = async () => {
    if (!user) {
      router.push('/login?redirectTo=/pricing')
      return
    }

    setCheckoutLoading(true)
    setCardError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate card checkout')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      setCardError(err.message)
      setCheckoutLoading(false)
    }
  }

  const handleBankTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmittingBank(true)
    setBankError(null)

    try {
      const response = await fetch('/api/payments/bank-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: slipRef,
          note: transferNote,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit bank details')
      }

      setBankSuccess(true)
      setPendingPayment({ id: 'temp', external_ref: slipRef, status: 'pending' })
      setTimeout(() => {
        setShowBankModal(false)
        setBankSuccess(false)
        setSlipRef('')
        setTransferNote('')
      }, 3500)
    } catch (err: any) {
      setBankError(err.message)
    } finally {
      setSubmittingBank(false)
    }
  }

  const features = [
    'Real-time AI Crash Multiplier signals',
    'Supports 1xbet, Aviator, and LuckyJet feeds',
    'Dynamic strategies (Safe, Swing, Moon target parameters)',
    'Real-time database integration via 24/7 cloud servers',
    'Comprehensive session statistics and evaluation logs',
    'Responsive desktop and mobile layout',
  ]

  const isSubscribed = subscription && 
    subscription.status === 'active' && 
    subscription.current_period_end && 
    new Date(subscription.current_period_end) > new Date()

  return (
    <div className="min-h-screen bg-[#080c18] text-[#f0f4ff] overflow-x-hidden flex flex-col justify-between relative">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_30%,rgba(0,100,255,0.08)_0%,transparent_50%),radial-gradient(circle_at_100%_70%,rgba(80,0,180,0.08)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.05] bg-[#080c18]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="CrashTracker" className="w-[26px] h-[26px] rounded-md object-cover" />
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              CRASH TRACKER
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/account/billing" className="text-xs font-bold uppercase tracking-wider text-[#5a6a8a] hover:text-cyan-400 transition-colors">
                  Billing
                </Link>
                <Link
                  href="/app"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 transition-all duration-300"
                >
                  Dashboard
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-cyan-500/30 hover:border-cyan-400 bg-cyan-400/5 text-cyan-400 transition-all duration-300"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-20 flex-grow w-full">
        {reason === 'unsubscribed' && (
          <div className="mb-10 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-xs flex items-start gap-3 max-w-2xl mx-auto">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Subscription Access Required:</span> The page you attempted to access requires an active Pro subscription. Upgrade below to unlock immediate access.
            </div>
          </div>
        )}

        {isSubscribed && (
          <div className="mb-10 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex items-start gap-3 max-w-2xl mx-auto">
            <Check size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Active Subscription Found:</span> You are currently subscribed to the Pro Plan. Feel free to navigate directly to the <Link href="/app" className="underline font-black">AI Predictions Dashboard</Link>.
            </div>
          </div>
        )}

        {pendingPayment && (
          <div className="mb-10 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs flex items-start gap-3 max-w-2xl mx-auto">
            <Info size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Manual Verification Pending:</span> We have received your bank transfer reference (<code className="font-mono bg-cyan-500/10 px-1 py-0.5 rounded">{pendingPayment.external_ref}</code>). Once our admins confirm your transaction, your account will be activated.
            </div>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-black mb-3">CHOOSE YOUR UPGRADE PATH</h1>
          <p className="text-xs text-[#5a6a8a]">Unlock the full real-time predictive dashboard with a single simple plan.</p>
        </div>

        {/* Pricing Layout */}
        <div className="grid md:grid-cols-5 gap-8 items-stretch max-w-4xl mx-auto">
          {/* Feature List */}
          <div className="md:col-span-3 flex flex-col justify-center p-6 space-y-6">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#5a6a8a]">What is included in Pro?</h2>
            <ul className="space-y-4">
              {features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-[#f0f4ff]/85 leading-relaxed">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing Upgrade Card */}
          <div className="md:col-span-2 p-8 rounded-2xl border border-cyan-500/25 bg-[#0c1120] flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
            <div>
              <span className="px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[10px] font-extrabold tracking-wider uppercase mb-4 inline-block">
                PRO MEMBERSHIP
              </span>
              <h3 className="text-xl font-bold mb-2">Pro Plan</h3>
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-black text-cyan-400">$8</span>
                <span className="text-xs text-[#5a6a8a]">/ month</span>
              </div>

              <div className="border-t border-white/[0.05] pt-4 mb-6">
                <div className="flex items-center justify-between text-xs text-[#5a6a8a] mb-2">
                  <span>Sri Lanka Price:</span>
                  <span className="text-emerald-400 font-bold">≈ 2,700 LKR</span>
                </div>
                <p className="text-[10px] text-[#3a4560] leading-relaxed">
                  * Card payments are billed in USD. Approximate LKR price matches local bank transfers.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {cardError && (
                <div className="p-2 rounded bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  <span>{cardError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCardPayment}
                disabled={loading || checkoutLoading || isSubscribed}
                className="w-full py-3 font-bold text-xs uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md hover:shadow-cyan-400/20 transition-all flex items-center justify-center gap-2 disabled:opacity-55"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Loading...
                  </>
                ) : (
                  <>
                    Pay with Card <ArrowRight size={14} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    router.push('/login?redirectTo=/pricing')
                  } else {
                    setShowBankModal(true)
                  }
                }}
                disabled={loading || isSubscribed}
                className="w-full py-3 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/[0.08] bg-[#080c18] hover:bg-white/[0.03] text-[#f0f4ff] transition-all flex items-center justify-center gap-2 disabled:opacity-55"
              >
                <Landmark size={14} /> Bank Transfer (LKR)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Bank Transfer Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-[#080c18]/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md p-6 rounded-2xl border border-white/[0.05] bg-[#0c1120] shadow-2xl relative">
            <button
              onClick={() => setShowBankModal(false)}
              className="absolute top-4 right-4 text-[#5a6a8a] hover:text-[#f0f4ff] transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Landmark className="text-cyan-400" size={18} /> Pay via Local Bank Transfer
            </h3>

            {bankSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold animate-bounce">
                  ✓
                </div>
                <h4 className="font-bold text-sm">Transfer Submitted!</h4>
                <p className="text-xs text-[#5a6a8a] max-w-xs mx-auto leading-relaxed">
                  We have logged your transaction reference. Our admin team will verify it and activate your account shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBankTransferSubmit} className="space-y-4">
                {/* Account Details */}
                <div className="p-4 rounded-xl bg-[#080c18] border border-white/[0.03] text-xs space-y-2.5">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-[#5a6a8a]">
                    Beneficiary Account Details
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-[#5a6a8a]">Bank Name:</span>
                    <span className="font-semibold text-right">Commercial Bank of Ceylon</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-[#5a6a8a]">Account Name:</span>
                    <span className="font-semibold text-right">Crash Predictions Private Ltd</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-[#5a6a8a]">Account Number:</span>
                    <span className="font-mono font-bold text-cyan-400 text-right">8010049281</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-[#5a6a8a]">Branch Name:</span>
                    <span className="font-semibold text-right">Colombo Main Branch</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 text-emerald-400">
                    <span>Required Amount:</span>
                    <span>2,700 LKR</span>
                  </div>
                </div>

                {bankError && (
                  <div className="p-2 rounded bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    <span>{bankError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5a6a8a] mb-1">
                      Transaction Slip Reference / ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TXN9281048 or Slip Number"
                      value={slipRef}
                      onChange={e => setSlipRef(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.05] bg-[#080c18] text-[#f0f4ff] placeholder-[#3a4560] text-xs focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5a6a8a] mb-1">
                      Optional Message / Sender Details
                    </label>
                    <textarea
                      placeholder="e.g. Sent from Account 102*****48"
                      value={transferNote}
                      onChange={e => setTransferNote(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.05] bg-[#080c18] text-[#f0f4ff] placeholder-[#3a4560] text-xs focus:outline-none focus:border-cyan-500/50 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingBank}
                  className="w-full py-3 font-bold text-xs uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md hover:shadow-cyan-400/20 transition-all flex items-center justify-center gap-2 disabled:opacity-55"
                >
                  {submittingBank ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Submitting...
                    </>
                  ) : (
                    'Confirm Transfer Sent'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-6 bg-[#080c18]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-[11px] text-[#3a4560] gap-4">
          <span className="flex items-center gap-1.5"><Orbit size={14} /> &copy; {new Date().getFullYear()} Crash Tracker.</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-cyan-400">Home</Link>
            <Link href="/login" className="hover:text-cyan-400">Account Access</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080c18] text-[#f0f4ff] flex items-center justify-center text-xs gap-2">
        <Loader2 className="animate-spin text-cyan-400" size={16} /> Loading pricing details...
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
