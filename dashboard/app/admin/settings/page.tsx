'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Power, Loader2, Settings as SettingsIcon } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({ maintenanceMode: false })
  const [savingSettings, setSavingSettings] = useState(false)

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
    fetchSettings()
  }, [fetchSettings])

  const handleToggleMaintenance = async () => {
    setSavingSettings(true)
    try {
      const newVal = !settings.maintenanceMode
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: newVal })
      })
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings)
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure global application state and maintenance controls.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-3xl">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-indigo-100 bg-indigo-50 flex items-center justify-center text-indigo-500">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">System Controls</h2>
          </div>
        </div>
        
        <div className="p-6 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-bold text-sm text-gray-800 mb-1">Maintenance Mode</h3>
            <p className="text-xs text-gray-500 max-w-md leading-relaxed">
              When active, this prevents normal users from placing bets or seeing predictions. 
              The system will return a global "SKIP" signal with a maintenance message.
            </p>
          </div>
          <button
            onClick={handleToggleMaintenance}
            disabled={savingSettings}
            className={`px-5 py-2.5 font-bold uppercase text-[11px] tracking-wider rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
              settings?.maintenanceMode 
                ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100' 
                : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            {settings?.maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
          </button>
        </div>
      </div>
    </div>
  )
}
