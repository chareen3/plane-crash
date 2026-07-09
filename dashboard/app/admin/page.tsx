"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Orbit, Landmark, Check, Loader2, AlertCircle, ShieldAlert, ArrowLeft, RefreshCw, Trash2, Database, Users, Settings as SettingsIcon, Power } from 'lucide-react'

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

  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  const [settings, setSettings] = useState({ maintenanceMode: false })
  const [savingSettings, setSavingSettings] = useState(false)

  // Confirm action states
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  
  // Database reset state
  const [resettingTable, setResettingTable] = useState<string | null>(null)

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

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok && data.users) {
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok) {
        setSettings(data)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    }
  }, [])

  useEffect(() => {
    async function init() {
      await verifyAdmin()
    }
    init()
  }, [verifyAdmin])

  useEffect(() => {
    if (isAdmin) {
      fetchPendingPayments()
      fetchUsers()
      fetchSettings()
    }
  }, [isAdmin, fetchPendingPayments, fetchUsers, fetchSettings])

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

  const handleResetTable = async (table: string) => {
    if (!confirm(`Are you sure you want to clear ${table}? This action cannot be undone.`)) return

    setResettingTable(table)
    setConfirmError(null)
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to reset table')
      alert(`Successfully cleared ${table}`)
    } catch (err: any) {
      setConfirmError(err.message)
    } finally {
      setResettingTable(null)
    }
  }

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'revoke' : 'grant'} admin rights for this user?`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, is_admin: !currentStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you ABSOLUTELY sure you want to delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const handleToggleMaintenance = async () => {
    setSavingSettings(true);
    try {
      const newVal = !settings.maintenanceMode;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: newVal })
      });
      const data = await res.json();
      if (res.ok) setSettings(data.settings);
      else throw new Error(data.error);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
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
            <img src="/logo.png" alt="CrashTracker" className="w-[26px] h-[26px] rounded-md object-cover" />
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

        {/* Global Settings Section */}
        <div className="mt-12 pt-12 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <SettingsIcon size={16} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-cyan-400">Global Settings</h2>
          </div>
          
          <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c1120] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm mb-1 text-white">Maintenance Mode</h3>
              <p className="text-xs text-[#5a6a8a]">When active, prevents normal users from placing bets or seeing predictions.</p>
            </div>
            <button
              onClick={handleToggleMaintenance}
              disabled={savingSettings}
              className={`px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
                settings?.maintenanceMode 
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20' 
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
              {settings?.maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
            </button>
          </div>
        </div>

        {/* User Management Section */}
        <div className="mt-12 pt-12 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg border border-purple-500/20 bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Users size={16} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-purple-400">User Management</h2>
          </div>
          
          {loadingUsers ? (
            <div className="py-10 flex items-center justify-center text-[#5a6a8a] text-xs gap-2">
              <Loader2 className="animate-spin text-purple-400" size={16} /> Loading users...
            </div>
          ) : (
            <div className="border border-white/[0.05] rounded-2xl bg-[#0c1120] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-[#080c18]/50 text-[#5a6a8a] uppercase tracking-wider font-extrabold">
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-bold text-white">{u.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                            u.is_admin ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-[#080c18] border border-white/[0.05] text-[#5a6a8a]'
                          }`}>
                            {u.is_admin ? 'ADMIN' : 'USER'}
                          </span>
                        </td>
                        <td className="p-4 text-[#5a6a8a]">
                          {formatDateTime(u.created_at)}
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                            className="px-3 py-1.5 bg-[#080c18] hover:bg-white/[0.05] border border-white/[0.05] text-[#5a6a8a] hover:text-white font-bold uppercase text-[9px] tracking-wider rounded-lg transition-colors"
                          >
                            {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold uppercase text-[9px] tracking-wider rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Database Management Section */}
        <div className="mt-12 pt-12 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg border border-rose-500/20 bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Database size={16} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-rose-400">Database Management</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c1120] space-y-4">
              <div>
                <h3 className="font-bold text-sm mb-1">Clear Crash History</h3>
                <p className="text-xs text-[#5a6a8a]">Deletes all records from the `crash_rounds` table.</p>
              </div>
              <button
                onClick={() => handleResetTable('crash_rounds')}
                disabled={resettingTable !== null}
                className="w-full px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resettingTable === 'crash_rounds' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Clear crash_rounds
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c1120] space-y-4">
              <div>
                <h3 className="font-bold text-sm mb-1">Clear AI Predictions</h3>
                <p className="text-xs text-[#5a6a8a]">Deletes all records from the `predictions` table.</p>
              </div>
              <button
                onClick={() => handleResetTable('predictions')}
                disabled={resettingTable !== null}
                className="w-full px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resettingTable === 'predictions' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Clear predictions
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c1120] space-y-4">
              <div>
                <h3 className="font-bold text-sm mb-1">Clear Round Summaries</h3>
                <p className="text-xs text-[#5a6a8a]">Deletes all records from the `round_summaries` table.</p>
              </div>
              <button
                onClick={() => handleResetTable('round_summaries')}
                disabled={resettingTable !== null}
                className="w-full px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resettingTable === 'round_summaries' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Clear round_summaries
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-4">
              <div>
                <h3 className="font-bold text-sm mb-1 text-rose-400">Nuke All Game Data</h3>
                <p className="text-xs text-[#5a6a8a]">Clears all three tables simultaneously.</p>
              </div>
              <button
                onClick={() => handleResetTable('all')}
                disabled={resettingTable !== null}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold uppercase text-[10px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resettingTable === 'all' ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                Nuke All Data
              </button>
            </div>
          </div>
        </div>
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
