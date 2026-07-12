'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Power, Loader2, Settings as SettingsIcon, Moon, Gauge, ShieldAlert } from 'lucide-react'

interface GameSettings {
  maintenance_mode: boolean
  sleep_phase_enabled: boolean
  confidence_ceil: number
  max_cashout: number
  signal_mode: string
}

const defaults: GameSettings = {
  maintenance_mode: false,
  sleep_phase_enabled: true,
  confidence_ceil: 60,
  max_cashout: 3.00,
  signal_mode: 'normal',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GameSettings>(defaults)
  const [saving, setSaving] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok) setSettings({ ...defaults, ...data })
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const toggle = async (key: keyof GameSettings) => {
    setSaving(key)
    try {
      const newVal = !settings[key]
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newVal }),
      })
      const data = await res.json()
      if (res.ok) setSettings({ ...defaults, ...data.settings })
      else throw new Error(data.error)
    } catch (err: any) { alert(err.message) }
    finally { setSaving(null) }
  }

  const updateNumber = async (key: keyof GameSettings, value: number) => {
    setSaving(key)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      const data = await res.json()
      if (res.ok) setSettings({ ...defaults, ...data.settings })
      else throw new Error(data.error)
    } catch (err: any) { alert(err.message) }
    finally { setSaving(null) }
  }

  const ToggleRow = ({
    label, description, settingKey, icon: Icon, color,
  }: {
    label: string; description: string;
    settingKey: keyof GameSettings;
    icon: React.ElementType; color: string;
  }) => {
    const active = !!settings[settingKey]
    const isLoading = saving === settingKey
    return (
      <div className="p-6 flex items-center justify-between bg-gray-50/50 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon size={17} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-800">{label}</h3>
            <p className="text-xs text-gray-500 max-w-md leading-relaxed mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={() => toggle(settingKey)}
          disabled={!!saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            active ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            active ? 'translate-x-6' : 'translate-x-1'
          }`} />
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={12} className="animate-spin text-white" />
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 h-full flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Game Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Control prediction engine behaviour, safety modes, and signal parameters.</p>
      </div>

      {/* System Controls */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-3xl">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
            <ShieldAlert size={17} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">System Controls</h2>
            <p className="text-xs text-gray-500">Global on/off switches.</p>
          </div>
        </div>

        <ToggleRow
          label="Maintenance Mode"
          description="Blocks all users from seeing predictions. Returns a global SKIP signal with a maintenance message."
          settingKey="maintenance_mode"
          icon={Power}
          color="bg-rose-50 border border-rose-100 text-rose-500"
        />
        <ToggleRow
          label="Sleep Phase (Safety Lock)"
          description="When ON, predictions are skipped from 12 AM–5 AM Sri Lanka time (low player count hours). Turn OFF to run 24/7."
          settingKey="sleep_phase_enabled"
          icon={Moon}
          color="bg-violet-50 border border-violet-100 text-violet-500"
        />
      </div>

      {/* Prediction Engine */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-3xl">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Gauge size={17} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Prediction Engine</h2>
            <p className="text-xs text-gray-500">Fine-tune signal parameters.</p>
          </div>
        </div>

        <div className="p-6 flex items-center justify-between bg-gray-50/50 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-sm text-gray-800">Confidence Ceiling</h3>
            <p className="text-xs text-gray-500 mt-0.5">Max AI confidence shown to users (0–100). Default: 60.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={10} max={100} step={5}
              value={settings.confidence_ceil}
              onChange={e => setSettings(s => ({ ...s, confidence_ceil: +e.target.value }))}
              onBlur={e => updateNumber('confidence_ceil', +e.target.value)}
              className="w-20 text-center border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {saving === 'confidence_ceil' && <Loader2 size={14} className="animate-spin text-gray-400" />}
          </div>
        </div>

        <div className="p-6 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-semibold text-sm text-gray-800">Max Cashout Target</h3>
            <p className="text-xs text-gray-500 mt-0.5">Hard ceiling for tier_safe / tier_swing signals. Default: 3.00x.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1.5} max={10} step={0.5}
              value={settings.max_cashout}
              onChange={e => setSettings(s => ({ ...s, max_cashout: +e.target.value }))}
              onBlur={e => updateNumber('max_cashout', +e.target.value)}
              className="w-20 text-center border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-xs text-gray-400 font-mono">x</span>
            {saving === 'max_cashout' && <Loader2 size={14} className="animate-spin text-gray-400" />}
          </div>
        </div>
      </div>
    </div>
  )
}
