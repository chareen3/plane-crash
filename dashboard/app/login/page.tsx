"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Orbit, Lock, Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/app'
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login'

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [timezone, setTimezone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // Detect system timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimezone(tz || 'UTC')
    } catch {
      setTimezone('UTC')
    }
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (activeTab === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
      } else {
        router.push(redirectTo)
        router.refresh()
      }
    } else {
      // Sign Up flow with timezone metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            timezone,
            is_admin: false,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
      } else if (data?.user?.identities?.length === 0) {
        setError('This email is already registered. Please log in.')
        setLoading(false)
      } else {
        setInfo('Verification link sent! Please check your email to complete registration.')
        setLoading(false)
        setEmail('')
        setPassword('')
      }
    }
  }

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-white/[0.05] bg-[#0c1120] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/" className="flex items-center gap-2 mb-4 text-[#5a6a8a] hover:text-cyan-400 text-xs font-semibold self-start transition-colors">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <div className="text-cyan-400 mb-2">
          <Orbit className="animate-spin-slow" size={36} />
        </div>
        <h2 className="text-xl font-black tracking-tight">CRASH TRACKER ACCESS</h2>
        <p className="text-xs text-[#5a6a8a] mt-1">Authenticate to synchronize and view predictions.</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#080c18] border border-white/[0.03] mb-6">
        <button
          type="button"
          onClick={() => { setActiveTab('login'); setError(null); setInfo(null); }}
          className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'login'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-[#5a6a8a] hover:text-[#f0f4ff]'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('signup'); setError(null); setInfo(null); }}
          className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'signup'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-[#5a6a8a] hover:text-[#f0f4ff]'
          }`}
        >
          Register
        </button>
      </div>

      {/* Message Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {info && (
        <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{info}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#5a6a8a] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3a4560]" size={16} />
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.05] bg-[#080c18] text-[#f0f4ff] placeholder-[#3a4560] text-xs focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#5a6a8a] mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3a4560]" size={16} />
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.05] bg-[#080c18] text-[#f0f4ff] placeholder-[#3a4560] text-xs focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 mt-2 font-bold text-xs uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md hover:shadow-cyan-400/20 transition-all disabled:opacity-55 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Processing...
            </>
          ) : activeTab === 'login' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#080c18] text-[#f0f4ff] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_30%,rgba(0,100,255,0.08)_0%,transparent_50%),radial-gradient(circle_at_100%_70%,rgba(80,0,180,0.08)_0%,transparent_50%)] pointer-events-none" />
      <Suspense fallback={
        <div className="flex items-center justify-center text-[#5a6a8a] gap-2">
          <Loader2 className="animate-spin text-cyan-400" size={20} /> Loading credentials...
        </div>
      }>
        <AuthForm />
      </Suspense>
    </div>
  )
}
