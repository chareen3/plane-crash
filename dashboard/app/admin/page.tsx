"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Orbit, Landmark, Check, Loader2, AlertCircle, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react'

interface PendingPayment {
  id: string
  user_id: string
  amount: number
  currency: string
  method: string
  status: string
  external_ref: string
  created_at: string
  email?: string
}

export default function AdminPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  // Confirm action states
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const supabase = createClient()

  // Verify Admin authorization
  const verifyAdmin = useCallback(async () => {
    setCheckingAuth(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_admin) {
      router.push('/')
      return
    }

    setIsAdmin(true)
    setCheckingAuth(false)
  }, [supabase, router])

  // Fetch pending bank transfers
  const fetchPendingPayments = useCallback(async () => {
    setLoadingPayments(true)
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('method', 'bank_transfer')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError

      if (paymentsData && paymentsData.length > 0) {
        // Fetch emails for user profiles
        const userIds = [...new Set(paymentsData.map(p => p.user_id))]
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)

        if (profilesError) throw profilesError

        const profileMap = new Map(profilesData?.map(p => [p.id, p.email]))
        const formatted = paymentsData.map(p => ({
          ...p,
          email: profileMap.get(p.user_id) || 'Unknown Email',
        }))
        setPayments(formatted)
      } else {
        setPayments([])
      }
    } catch (err: any) {
      console.error('Error fetching admin payments:', err)
    } finally {
      setLoadingPayments(false)
    }
  }, [supabase])

  useEffect(() => {
    async function init() {
      await verifyAdmin()
    }
    init()
  }, [verifyAdmin])

  useEffect(() => {
    if (isAdmin) {
      fetchPendingPayments()
    }
  }, [isAdmin, fetchPendingPayments])

  const handleConfirmPayment = async (paymentId: string) => {
    setConfirmingId(paymentId)
    setConfirmError(null)

    try {
      const response = await fetch('/api/admin/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment')
      }

      // Success - remove from list or reload
      await fetchPendingPayments()
    } catch (err: any) {
      setConfirmError(err.message)
    } finally {
      setConfirmingId(null)
    }
  }

  const formatDateTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#080c18] text-[#f0f4ff] flex items-center justify-center text-xs gap-2">
        <Loader2 className="animate-spin text-cyan-400" size={16} /> Verifying admin credentials...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080c18] text-[#f0f4ff] overflow-x-hidden flex flex-col justify-between relative">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_30%,rgba(0,100,255,0.08)_0%,transparent_50%),radial-gradient(circle_at_100%_70%,rgba(80,0,180,0.08)_0%,transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.05] bg-[#080c18]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-cyan-400">
              <Orbit className="animate-spin-slow" size={26} />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              CRASH TRACKER
            </span>
          </Link>

          <span className="px-3 py-1 rounded-md border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[10px] font-extrabold tracking-wider uppercase">
            ADMIN SYSTEM
          </span>
        </div>
      </header>

      {/* Main Panel */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 flex-grow w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="w-8 h-8 rounded-lg border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.05] flex items-center justify-center text-[#5a6a8a] hover:text-[#f0f4ff] transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-xl font-black uppercase tracking-tight">Pending Bank Transfers</h1>
          </div>
          <button
            onClick={fetchPendingPayments}
            disabled={loadingPayments}
            className="text-xs text-[#5a6a8a] hover:text-cyan-400 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loadingPayments ? 'animate-spin' : ''} /> Reload list
          </button>
        </div>

        {confirmError && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-start gap-2.5 max-w-xl">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Confirmation Error:</span> {confirmError}
            </div>
          </div>
        )}

        {loadingPayments ? (
          <div className="py-20 flex items-center justify-center text-[#5a6a8a] text-xs gap-2">
            <Loader2 className="animate-spin text-cyan-400" size={16} /> Querying payments...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 rounded-2xl border border-white/[0.03] bg-[#0c1120] text-center max-w-xl mx-auto space-y-3">
            <div className="text-cyan-400 text-2xl">✓</div>
            <h2 className="font-bold text-sm">Inbox Fully Cleared</h2>
            <p className="text-xs text-[#5a6a8a]">
              There are no pending bank transfers requiring verification at the moment.
            </p>
          </div>
        ) : (
          <div className="border border-white/[0.05] rounded-2xl bg-[#0c1120] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-[#080c18]/50 text-[#5a6a8a] uppercase tracking-wider font-extrabold">
                    <th className="p-4">Customer Email</th>
                    <th className="p-4">Transaction Slip Reference</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Submitted Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 font-bold text-white">{pay.email}</td>
                      <td className="p-4">
                        <code className="font-mono bg-[#080c18] border border-white/[0.05] px-2 py-1 rounded text-cyan-400 text-[11px]">
                          {pay.external_ref}
                        </code>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">
                        {pay.amount} {pay.currency}
                      </td>
                      <td className="p-4 text-[#5a6a8a]">
                        {formatDateTime(pay.created_at)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleConfirmPayment(pay.id)}
                          disabled={confirmingId !== null}
                          className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-bold uppercase text-[10px] tracking-wider rounded-lg shadow-md hover:shadow-emerald-500/10 transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {confirmingId === pay.id ? (
                            <>
                              <Loader2 className="animate-spin" size={12} /> Confirming...
                            </>
                          ) : (
                            <>
                              <Check size={12} strokeWidth={3} /> Confirm
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-6 bg-[#080c18]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-[11px] text-[#3a4560] gap-4">
          <span className="flex items-center gap-1.5"><Orbit size={14} /> &copy; {new Date().getFullYear()} Crash Tracker.</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-cyan-400">Landing Page</Link>
            <Link href="/app" className="hover:text-cyan-400">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
