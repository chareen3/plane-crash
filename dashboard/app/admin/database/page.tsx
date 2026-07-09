'use client'

import React, { useState } from 'react'
import { Database, AlertTriangle, Loader2 } from 'lucide-react'

export default function DatabasePage() {
  const [resettingTable, setResettingTable] = useState<string | null>(null)
  
  const handleResetTable = async (table: string) => {
    if (!confirm(`Are you absolutely sure you want to completely clear the ${table} table? This cannot be undone.`)) {
      return
    }

    setResettingTable(table)
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table })
      })
      
      const data = await res.json()
      if (res.ok) {
        alert(`Successfully cleared ${table} table.`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`)
    } finally {
      setResettingTable(null)
    }
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Management</h1>
          <p className="text-sm text-gray-500 mt-1">Nuke specific tables or clear system cache.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 max-w-3xl">
        <div className="mb-6 pb-6 border-b border-gray-100 flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Danger Zone</h3>
            <p className="text-sm text-gray-500 mt-1">
              These actions will permanently delete records from the database. Make sure you know what you are doing before proceeding.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Predictions Reset */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-bold text-gray-800 text-sm">Clear AI Predictions Cache</h4>
              <p className="text-xs text-gray-500 mt-1">Deletes all cached AI predictions from the database. Will force AI to regenerate on next request.</p>
            </div>
            <button
              onClick={() => handleResetTable('predictions')}
              disabled={resettingTable !== null}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-rose-600 hover:border-rose-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {resettingTable === 'predictions' ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              Nuke Predictions
            </button>
          </div>

          {/* Crash Rounds Reset */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-bold text-gray-800 text-sm">Clear Crash Rounds History</h4>
              <p className="text-xs text-gray-500 mt-1">Deletes all recorded crash points. Do not do this while live rounds are actively running.</p>
            </div>
            <button
              onClick={() => handleResetTable('crash_rounds')}
              disabled={resettingTable !== null}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-rose-600 hover:border-rose-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {resettingTable === 'crash_rounds' ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              Nuke History
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
