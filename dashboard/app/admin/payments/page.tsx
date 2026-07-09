'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, Check } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface PendingPayment {
  id: string
  user_id: string
  amount: number
  currency: string
  status: string
  created_at: string
  external_ref?: string
  email?: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      
      if (error) throw error

      if (paymentsData && paymentsData.length > 0) {
        const userIds = [...new Set(paymentsData.map(p => p.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)
        
        const merged = paymentsData.map(p => ({
          ...p,
          email: profiles?.find(pr => pr.id === p.user_id)?.email || 'Unknown User'
        }))
        setPayments(merged)
      } else {
        setPayments([])
      }
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleConfirmPayment = async (paymentId: string) => {
    setConfirmingId(paymentId)
    try {
      const res = await fetch('/api/admin/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      })
      const data = await res.json()
      if (res.ok) {
        await fetchPayments()
      } else {
        alert(data.error)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Payments</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve pending bank transfers to grant subscription access.</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-4 w-[35%]">Customer</th>
                <th className="p-4 w-[25%]">Reference ID</th>
                <th className="p-4 w-[15%]">Amount</th>
                <th className="p-4 w-[15%]">Date</th>
                <th className="p-4 text-right w-[10%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Querying Records...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400 text-sm">
                    No pending payments found. Inbox is clear.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{p.email}</td>
                    <td className="p-4">
                      <code className="font-mono bg-gray-100 border border-gray-200 px-2 py-1 rounded text-gray-700 text-[11px]">
                        {p.external_ref}
                      </code>
                    </td>
                    <td className="p-4 font-bold text-emerald-600">
                      {p.amount} {p.currency}
                    </td>
                    <td className="p-4 text-gray-500 text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        disabled={confirmingId !== null}
                        onClick={() => handleConfirmPayment(p.id)}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs ml-auto disabled:opacity-50"
                      >
                        {confirmingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Confirm
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
