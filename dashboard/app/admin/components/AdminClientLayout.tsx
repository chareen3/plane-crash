'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CreditCard, Settings, Database, ArrowLeft, Orbit } from 'lucide-react'

const navItems = [
  { href: '/app', icon: <ArrowLeft size={18} />, label: 'Back to App' },
  { href: '/admin/users', icon: <Users size={18} />, label: 'Users & Subscriptions' },
  { href: '/admin/payments', icon: <CreditCard size={18} />, label: 'Pending Payments' },
  { href: '/admin/database', icon: <Database size={18} />, label: 'Database' },
  { href: '/admin/settings', icon: <Settings size={18} />, label: 'Global Settings' },
]

export default function AdminClientLayout({ children, userEmail }: { children: React.ReactNode, userEmail: string }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-[#f4f7f9] text-[#1a1d27] font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR (Dark) */}
      <aside className="w-[240px] bg-[#1a1d27] text-[#9ca3af] flex flex-col flex-shrink-0 h-full">
        <div className="p-6 flex items-center gap-2 text-white font-bold text-lg border-b border-white/5">
          <Orbit size={20} className="text-cyan-400" />
          <span>Admin Panel</span>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="text-xs truncate font-medium text-white">
            {userEmail}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-white border-r border-gray-200 shadow-sm relative z-10">
        {children}
      </main>

      {/* RIGHT PANEL (Stats) */}
      <aside className="w-[300px] bg-[#f8f9fa] border-l border-gray-200 flex-shrink-0 h-full overflow-y-auto hidden lg:flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Quick Overview</h2>
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-[4px] border-emerald-500 border-r-gray-100 flex items-center justify-center">
                <span className="font-bold text-emerald-600 text-xs">ON</span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-800">System</div>
                <div className="text-xs text-gray-500">Running smoothly</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Helpful Tips</h2>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-xs text-gray-600 leading-relaxed mb-4">
            Use the <strong>Users & Subscriptions</strong> tab to quickly add or revoke subscription days for users.
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-xs text-gray-600 leading-relaxed">
            Toggle <strong>Maintenance Mode</strong> in Global Settings to pause all traffic and predictions instantly.
          </div>
        </div>
      </aside>
    </div>
  )
}
