'use client'

import React, { useState } from 'react'
import { X, Calendar, Shield, Trash2, Power, Loader2, Check, Clock, Activity, Wifi, WifiOff } from 'lucide-react'

export interface UserActivityData {
  last_seen_at: string
  total_seconds_spent: number
  is_online: boolean
}

export interface UserProps {
  id: string
  email: string
  is_admin: boolean
  created_at: string
  subscription?: {
    status: string
    current_period_end?: string
  }
  activity?: UserActivityData | null
}

interface ModalProps {
  user: UserProps
  onClose: () => void
  onRefresh: () => void
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function UserSubscriptionModal({ user, onClose, onRefresh }: ModalProps) {
  const [loading, setLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const handleAction = async (action: string, data: any = {}) => {
    setLoading(true)
    setActionSuccess(null)
    try {
      if (action === 'toggle_admin') {
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: user.id, is_admin: !user.is_admin })
        })
        if (!res.ok) throw new Error((await res.json()).error)
      } else if (action === 'delete') {
        if (!confirm('Are you ABSOLUTELY sure you want to delete this user?')) { setLoading(false); return; }
        const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error((await res.json()).error)
        onClose()
      } else {
        // Subscription actions
        const res = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: user.id, action, ...data })
        })
        if (!res.ok) throw new Error((await res.json()).error)
      }
      
      setActionSuccess('Action completed successfully')
      setTimeout(() => setActionSuccess(null), 3000)
      onRefresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isSubActive = user.subscription?.status === 'active' && 
                      user.subscription?.current_period_end && 
                      new Date(user.subscription.current_period_end) > new Date();

  const isOnline = user.activity?.is_online ?? false
  const totalSeconds = user.activity?.total_seconds_spent ?? 0
  const lastSeen = user.activity?.last_seen_at

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[480px] bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden border border-gray-100 flex flex-col">
        
        {/* Header */}
        <div className="bg-[#1a1d27] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                {user.email.charAt(0).toUpperCase()}
              </div>
              {/* Online indicator */}
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1d27] ${isOnline ? 'bg-emerald-400' : 'bg-gray-500'}`} />
            </div>
            <div>
              <div className="font-bold text-sm truncate max-w-[240px]">{user.email}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <Wifi size={10} /> ONLINE NOW
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                    <WifiOff size={10} /> {lastSeen ? timeAgo(lastSeen) : 'Never seen'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-[#f9fafb] text-sm text-gray-700 flex-1 overflow-y-auto relative">
          {actionSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg flex items-center gap-2 text-xs font-bold">
              <Check size={16} /> {actionSuccess}
            </div>
          )}

          {/* Activity Stats */}
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider flex items-center gap-1.5">
              <Activity size={11} /> Activity Stats
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1">
                <Clock size={16} className="text-indigo-500" />
                <div className="font-bold text-gray-800 text-base leading-none">{formatDuration(totalSeconds)}</div>
                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Total Time</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400 shadow-emerald-400/60 shadow-md animate-pulse' : 'bg-gray-300'}`} />
                <div className={`font-bold text-base leading-none ${isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </div>
                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Status</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
                <div className="text-[11px] font-bold text-gray-700 leading-tight">
                  {lastSeen ? timeAgo(lastSeen) : '—'}
                </div>
                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Last Seen</div>
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">Subscription Status</h3>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800">
                  {isSubActive ? 'Active Subscription' : 'No Active Subscription'}
                </div>
                {isSubActive && (
                  <div className="text-xs text-gray-500 mt-1">
                    Expires: {new Date(user.subscription!.current_period_end!).toLocaleDateString()}
                  </div>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${isSubActive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {isSubActive ? 'PRO' : 'FREE'}
              </span>
            </div>
          </div>

          {/* Subscription Actions */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button 
              disabled={loading}
              onClick={() => handleAction('add_days', { days: 7 })}
              className="bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
            >
              <Calendar size={18} className="text-indigo-500" />
              <span className="font-bold text-xs">Add 7 Days</span>
            </button>
            <button 
              disabled={loading}
              onClick={() => handleAction('add_days', { days: 30 })}
              className="bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
            >
              <Calendar size={18} className="text-indigo-500" />
              <span className="font-bold text-xs">Add 30 Days</span>
            </button>
            <button 
              disabled={loading}
              onClick={() => handleAction('lifetime')}
              className="bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
            >
              <Calendar size={18} className="text-indigo-500" />
              <span className="font-bold text-xs">Lifetime Access</span>
            </button>
            <button 
              disabled={loading || !isSubActive}
              onClick={() => handleAction('revoke')}
              className="bg-white border border-gray-200 hover:border-rose-300 hover:bg-rose-50 p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Power size={18} className="text-rose-500" />
              <span className="font-bold text-xs text-rose-600">Revoke Access</span>
            </button>
          </div>

          {/* Account Actions */}
          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">Account Actions</h3>
            <div className="flex flex-col gap-2">
              <button 
                disabled={loading}
                onClick={() => handleAction('toggle_admin')}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <Shield size={16} className={user.is_admin ? 'text-purple-500' : 'text-gray-400'} />
                  {user.is_admin ? 'Revoke Admin Rights' : 'Grant Admin Rights'}
                </div>
              </button>
              <button 
                disabled={loading}
                onClick={() => handleAction('delete')}
                className="w-full flex items-center justify-between p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={16} />
                  Permanently Delete User
                </div>
              </button>
            </div>
          </div>
          
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 text-indigo-600">
              <Loader2 size={32} className="animate-spin mb-2" />
              <div className="font-bold text-xs uppercase tracking-wider">Processing...</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
