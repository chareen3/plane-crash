'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, Search, MoreHorizontal } from 'lucide-react'
import UserSubscriptionModal, { UserProps } from '../components/UserSubscriptionModal'

export default function UsersPage() {
  const [users, setUsers] = useState<UserProps[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProps | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok && data.users) {
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all registered users and their access levels.</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
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
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="p-4 w-[40%]">User</th>
                <th className="p-4 w-[20%]">Role</th>
                <th className="p-4 w-[25%]">Subscription</th>
                <th className="p-4 text-right w-[15%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Loading Users...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSubActive = u.subscription?.status === 'active' && 
                                      u.subscription?.current_period_end && 
                                      new Date(u.subscription.current_period_end) > new Date();

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedUser(u)}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{u.email}</div>
                            <div className="text-xs text-gray-500">Joined {new Date(u.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.is_admin ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {u.is_admin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isSubActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          <span className={`text-xs font-bold ${isSubActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {isSubActive ? 'Active Pro' : 'Free / Expired'}
                          </span>
                        </div>
                      </td>
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

      {selectedUser && (
        <UserSubscriptionModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onRefresh={() => {
            fetchUsers()
            // We can keep it open or close it. We'll close it to force UI update if needed, but the user state needs updating.
            setSelectedUser(null) 
          }} 
        />
      )}
    </div>
  )
}
