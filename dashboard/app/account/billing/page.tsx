"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Orbit, CreditCard, Landmark, Loader2, AlertCircle, LogOut, ArrowLeft, RefreshCw, Calendar, CheckCircle } from 'lucide-react'

export default function BillingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Cancel action states
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  const supabase = createClient()

  const loadData = async () => {
    setLoading(true)
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

      // Fetch payment history
      const { data: pay } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      setPayments(pay || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to the predictions dashboard.')) {
      return
    }

    setCancelling(true)
    setCancelError(null)

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      setCancelSuccess(true)
      await loadData()
    } catch (err: any) {
      setCancelError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return 'N/A'
    const date = new Date(iso)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const isSubscribed = subscription && 
    subscription.status === 'active' && 
    subscription.current_period_end && 
    new Date(subscription.current_period_end) > new Date()

  // Find customer portal link
  const customerPortalUrl = process.env.NEXT_PUBLIC_POLAR_CUSTOMER_PORTAL_URL || 'https://polar.sh'

  return (
    <div className="min-h-screen bg-[#080c18] text-[#f0f4ff] overflow-x-hidden flex flex-col justify-between relative">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_30%,rgba(0,100,255,0.08)_0%,transparent_50%),radial-gradient(circle_at_100%_70%,rgba(80,0,180,0.08)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.05] bg-[#080c18]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-cyan-400">
              <Orbit className="animate-spin-slow" size={26} />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              CRASH TRACKER
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/10 hover:border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold transition-all hover:bg-red-500/10"
          >
            <LogOut size={13} /> Log Out
          </button>
        </div>
      </header>

      {/* Main Billing Grid */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex-grow w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={isSubscribed ? '/app' : '/pricing'}
              className="w-8 h-8 rounded-lg border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.05] flex items-center justify-center text-[#5a6a8a] hover:text-[#f0f4ff] transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-xl font-black uppercase tracking-tight">Billing & Account</h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs text-[#5a6a8a] hover:text-cyan-400 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh details
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center text-[#5a6a8a] text-xs gap-2">
            <Loader2 className="animate-spin text-cyan-400" size={16} /> Fetching account state...
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left: Current Subscription Details */}
            <div className="md:col-span-2 space-y-6">
              <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c1120] space-y-6">
                <div>
                  <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#5a6a8a] mb-2">Account Owner</h2>
                  <p className="text-sm font-bold text-white">{user?.email}</p>
                </div>

                <div className="border-t border-white/[0.03] pt-6">
                  <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#5a6a8a] mb-3">Subscription Status</h2>
                  
                  {isSubscribed ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase border border-emerald-500/20">
                          Active
                        </div>
                        <div className="text-xs text-[#5a6a8a] flex items-center gap-1">
                          via {subscription.payment_method === 'polar_card' ? (
                            <span className="flex items-center gap-1 text-cyan-400"><CreditCard size={12} /> Polar Card</span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-400"><Landmark size={12} /> Bank Transfer</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#5a6a8a]">
                        <Calendar size={14} className="text-cyan-400" />
                        <span>Access valid until: <strong className="text-white">{formatDateTime(subscription.current_period_end)}</strong></span>
                      </div>

                      {/* Cancel error display */}
                      {cancelError && (
                        <div className="p-2.5 rounded border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-center gap-1.5">
                          <AlertCircle size={14} />
                          <span>{cancelError}</span>
                        </div>
                      )}

                      {cancelSuccess && (
                        <div className="p-2.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex items-center gap-1.5">
                          <CheckCircle size={14} />
                          <span>Subscription cancelled successfully!</span>
                        </div>
                      )}

                      {/* Subscription Action buttons */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        {subscription.payment_method === 'polar_card' && (
                          <a
                            href={customerPortalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-lg text-xs font-bold transition-all"
                          >
                            Manage on Polar
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          className="px-4 py-2 border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {cancelling ? (
                            <>
                              <Loader2 className="animate-spin" size={12} /> Cancelling...
                            </>
                          ) : (
                            'Cancel Access'
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-0.5 rounded bg-white/[0.05] text-[#5a6a8a] text-xs font-bold uppercase border border-white/[0.05]">
                          No Active Plan
                        </div>
                      </div>
                      <p className="text-xs text-[#5a6a8a] leading-relaxed">
                        You do not have an active predictions subscription. Purchase access to view live AI crash feeds.
                      </p>
                      <div className="pt-2">
                        <Link
                          href="/pricing"
                          className="inline-flex px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 rounded-lg text-xs font-bold hover:shadow-cyan-400/10 shadow-md transition-all"
                        >
                          Upgrade to Pro
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Payment Logs History */}
            <div className="space-y-4">
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#5a6a8a]">Payment History</h2>
              
              {payments.length === 0 ? (
                <div className="p-6 rounded-2xl border border-white/[0.03] bg-[#0c1120] text-center text-xs text-[#3a4560]">
                  No past transactions found.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((pay) => (
                    <div key={pay.id} className="p-4 rounded-xl border border-white/[0.03] bg-[#0c1120] text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {pay.amount} {pay.currency}
                        </span>
                        <div className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                          pay.status === 'confirmed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : pay.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {pay.status}
                        </div>
                      </div>
                      <div className="text-[10px] text-[#5a6a8a] flex justify-between">
                        <span>Method: {pay.method === 'polar_card' ? 'Card' : 'Bank Transfer'}</span>
                        <span>{formatDateTime(pay.created_at)}</span>
                      </div>
                      {pay.external_ref && (
                        <div className="text-[9px] font-mono text-[#3a4560] border-t border-white/[0.02] pt-1.5 flex justify-between overflow-hidden">
                          <span>Ref:</span>
                          <span className="truncate max-w-[140px]" title={pay.external_ref}>{pay.external_ref}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-6 bg-[#080c18]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-[11px] text-[#3a4560] gap-4">
          <span className="flex items-center gap-1.5"><Orbit size={14} /> &copy; {new Date().getFullYear()} Crash Tracker.</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-cyan-400">Landing Page</Link>
            {isSubscribed && <Link href="/app" className="hover:text-cyan-400">Dashboard</Link>}
          </div>
        </div>
      </footer>
    </div>
  )
}
