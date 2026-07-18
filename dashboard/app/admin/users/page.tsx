'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Search, MoreHorizontal, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import UserSubscriptionModal, { UserProps } from '../components/UserSubscriptionModal'

type FilterTab = 'all' | 'online' | 'pro' | 'free'

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

export default function UsersPage() {
  const [users, setUsers] = useState<UserProps[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedUser, setSelectedUser] = useState<UserProps | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok && data.users) {
        setUsers(data.users)
        setLastRefreshed(new Date())
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => fetchUsers(true), 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchUsers])

  const onlineCount = users.filter(u => u.activity?.is_online).length

  const filteredUsers = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    const isSubActive = (u.subscription?.status === 'active' || u.subscription?.status === 'trial') &&
      u.subscription?.current_period_end &&
      new Date(u.subscription.current_period_end) > new Date()
    if (filter === 'online') return u.activity?.is_online
    if (filter === 'pro') return isSubActive
    if (filter === 'free') return !isSubActive
    return true
  })

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All Users' },
    { key: 'online', label: `Online (${onlineCount})` },
    { key: 'pro', label: 'Pro' },
    { key: 'free', label: 'Free' },
  ]

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users &amp; Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all registered users and their access levels.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Online badge */}
          {onlineCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">{onlineCount} online</span>
            </div>
          )}
          {/* Refresh button */}
          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="mb-5 flex items-center gap-4 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Last refreshed */}
        <span className="text-[11px] text-gray-400 ml-auto">
          Updated {timeAgo(lastRefreshed.toISOString())}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-4 w-[35%]">User</th>
                <th className="p-4 w-[15%]">Status</th>
                <th className="p-4 w-[15%]">Role</th>
                <th className="p-4 w-[20%]">Subscription</th>
                <th className="p-4 w-[10%]">Time Spent</th>
                <th className="p-4 text-right w-[5%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Loading Users...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSubActive = (u.subscription?.status === 'active' || u.subscription?.status === 'trial') &&
                    u.subscription?.current_period_end &&
                    new Date(u.subscription.current_period_end) > new Date();
                  const isTrial = u.subscription?.status === 'trial';
                  const isOnline = u.activity?.is_online ?? false
                  const totalSeconds = u.activity?.total_seconds_spent ?? 0
                  const lastSeen = u.activity?.last_seen_at

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedUser(u)}
                    >
                      {/* User */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs">
                              {u.email.charAt(0).toUpperCase()}
                            </div>
                            {/* Online dot on avatar */}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{u.email}</div>
                            <div className="text-xs text-gray-500">Joined {new Date(u.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>

                      {/* Online Status */}
                      <td className="p-4">
                        {isOnline ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-700">Online</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <WifiOff size={12} />
                            <span className="text-xs font-medium">
                              {lastSeen ? timeAgo(lastSeen) : 'Never'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.is_admin
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {u.is_admin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>

                      {/* Subscription */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isSubActive ? (isTrial ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-gray-300'}`} />
                          <span className={`text-xs font-bold ${isSubActive ? (isTrial ? 'text-amber-600' : 'text-emerald-700') : 'text-gray-500'}`}>
                            {isSubActive ? (isTrial ? 'Active Trial' : 'Active Pro') : 'Free / Expired'}
                          </span>
                        </div>
                      </td>

                      {/* Time Spent */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-bold">
                            {totalSeconds > 0 ? formatDuration(totalSeconds) : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <button
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {selectedUser && (
        <UserSubscriptionModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={() => {
            fetchUsers()
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}
