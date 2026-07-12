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
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annually'>('monthly')

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
        body: JSON.stringify({ priceType: billingInterval }),
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
          planInterval: billingInterval,
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
    'Real-time telemetry and risk rating feed',
    'Supports 1xBet Crash live feeds',
    'Target hit rates and Expected Value (EV) calculators',
    'Real-time live telemetry via dedicated servers',
    'Comprehensive session statistics and strategy logs',
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
              <span className="font-bold">Active Subscription Found:</span> You are currently subscribed to the Pro Plan. Feel free to navigate directly to the <Link href="/app" className="underline font-black">Real-Time Analytics Dashboard</Link>.
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

        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.05] text-cyan-400 text-[10px] font-black tracking-widest uppercase mb-3">
            Upgrade Account
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">CHOOSE YOUR PLAN</h1>
          <p className="text-xs text-[#8090b0] max-w-sm mx-auto">Get full access to the real-time telemetry and strategy dashboard with a simple plan.</p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-[#0c1120] border border-white/[0.08] p-1 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-cyan-500 text-[#080c18] shadow-md shadow-cyan-500/10'
                  : 'text-[#8090b0] hover:text-[#f0f4ff]'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('annually')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                billingInterval === 'annually'
                  ? 'bg-cyan-500 text-[#080c18] shadow-md shadow-cyan-500/10'
                  : 'text-[#8090b0] hover:text-[#f0f4ff]'
              }`}
            >
              Annual Billing
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-black">
                SAVE 32%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Layout - Landscape Pass Card */}
        <div className="max-w-4xl mx-auto relative group">
          {/* Subtle Outer Glow (Cyan-Indigo Theme) */}
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
                  {billingInterval === 'annually' && (
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                      BEST VALUE
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-black text-[#f0f4ff] mb-2 tracking-wide uppercase">Crash Tracker Pro</h3>
                <p className="text-xs text-[#8090b0] mb-6 leading-relaxed">
                  Get full access to the real-time analytics suite. Configured specifically for the Sri Lankan player ecosystem.
                </p>

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-[#5a6a8a] mb-2">FEATURES INCLUDED:</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-[11px] md:text-xs">
                        <span className="w-4 h-4 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 border border-cyan-500/20">
                          <Check size={9} strokeWidth={4} />
                        </span>
                        <span className="text-[#e8eeff] font-medium leading-relaxed">{feat}</span>
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

            {/* Right: Checkout & Price (40% width) */}
            <div className="w-full md:w-80 flex flex-col justify-between shrink-0">
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-[#5a6a8a] mb-2">SUBSCRIPTION PRICING</div>
                
                {/* LKR Pricing */}
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-4xl md:text-5xl font-black text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                    {billingInterval === 'annually' ? '22,000 LKR' : '2,700 LKR'}
                  </span>
                  <span className="text-sm line-through text-[#5a6a8a]">
                    {billingInterval === 'annually' ? '81,600 LKR' : '6,800 LKR'}
                  </span>
                  <span className="text-xs text-[#5a6a8a] font-bold">
                    {billingInterval === 'annually' ? '/ yr' : '/ mo'}
                  </span>
                </div>

                {/* USD Secondary */}
                <div className="flex items-baseline gap-1.5 mb-6 text-xs text-[#8090b0]">
                  <span>Convert to USD:</span>
                  <span className="font-bold text-cyan-300">
                    {billingInterval === 'annually' ? '$64 USD' : '$8 USD'}
                  </span>
                  <span className="line-through text-[#5a6a8a]">
                    {billingInterval === 'annually' ? '$240 USD' : '$20 USD'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.02] mb-6 text-center">
                  <p className="text-[11px] text-cyan-300 leading-relaxed font-semibold">
                    {billingInterval === 'annually' 
                      ? 'Save 10,400 LKR (32%) compared to the monthly plan!'
                      : "That's less than 90 LKR per day!"}
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
                  className="w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl bg-[#00ffd5] text-slate-950 hover:bg-[#33ffdd] shadow-sm hover:shadow-[#00ffd5]/15 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-55 cursor-pointer"
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
                  className="w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 bg-transparent hover:bg-white/[0.03] text-[#e8eeff] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-55 cursor-pointer"
                >
                  <Landmark size={14} /> Bank Transfer (LKR)
                </button>
              </div>
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
                    <span className="font-semibold text-right">Commercial Bank | Sri Lanka</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-[#5a6a8a]">Account Name:</span>
                    <span className="font-semibold text-right">Crash Tracker Private Ltd</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-[#5a6a8a]">Account Number:</span>
                    <span className="font-mono font-bold text-cyan-400 text-right">8005328624</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-[#5a6a8a]">Branch Name:</span>
                    <span className="font-semibold text-right">Colombo Main Branch</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 text-emerald-400">
                    <span>Required Amount:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] line-through text-[#5a6a8a] font-normal">
                        {billingInterval === 'annually' ? '81,600 LKR' : '6,800 LKR'}
                      </span>
                      <span>
                        {billingInterval === 'annually' ? '22,000 LKR' : '2,700 LKR'}
                      </span>
                    </span>
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
          <div className="flex flex-wrap gap-4 justify-center md:justify-end">
            <Link href="/" className="hover:text-cyan-400">Home</Link>
            <Link href="/login" className="hover:text-cyan-400">Account Access</Link>
            <Link href="/privacy" className="hover:text-cyan-400">Privacy</Link>
            <Link href="/terms" className="hover:text-cyan-400">Terms</Link>
            <Link href="/responsible-gaming" className="hover:text-cyan-400">Responsible Gaming</Link>
            <Link href="/refund" className="hover:text-cyan-400">Refunds</Link>
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
