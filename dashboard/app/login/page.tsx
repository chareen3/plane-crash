"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Orbit, Lock, Mail, Loader2, AlertCircle, ArrowLeft, Zap, Shield, TrendingUp, Brain, Target, Flame, BarChart3, Activity, ChevronRight } from 'lucide-react'

const tips = [
  {
    icon: <Brain size={24} />,
    title: "AI-Powered Analysis",
    desc: "Neural engine processes 50+ rounds in real-time to detect hidden patterns.",
    color: "#a78bfa"
  },
  {
    icon: <Shield size={24} />,
    title: "Risk Scoring",
    desc: "Instant risk assessment with color-coded safety indicators for every round.",
    color: "#00e5a0"
  },
  {
    icon: <TrendingUp size={24} />,
    title: "Win Rate Tracking",
    desc: "Monitor your performance with detailed EV calculations per bet.",
    color: "#00ffd5"
  },
  {
    icon: <Target size={24} />,
    title: "Smart Targets",
    desc: "Statistically optimized cashout points tailored to your risk profile.",
    color: "#ffd000"
  }
]

const quotes = [
  { text: "Statistics is the grammar of science.", author: "Karl Pearson" },
  { text: "The goal is to turn data into insight.", author: "Carly Fiorina" },
  { text: "Without data, you're just another person with an opinion.", author: "W. Edwards Deming" },
  { text: "In God we trust, all others bring data.", author: "W. Edwards Deming" },
  { text: "The best predictor of the future is the past.", author: "Peter Drucker" },
  { text: "Success is not final, failure is not fatal.", author: "Winston Churchill" },
]

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
  const [currentQuote, setCurrentQuote] = useState(0)
  const [currentTip, setCurrentTip] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimezone(tz || 'UTC')
    } catch {
      setTimezone('UTC')
    }
  }, [])

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length)
    }, 6000)
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length)
    }, 5000)
    return () => {
      clearInterval(quoteInterval)
      clearInterval(tipInterval)
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
    <div className="login-splitview">
      {/* ═══ LEFT PANEL - FORM ═══ */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <Link href="/" className="back-link">
            <ArrowLeft size={14} />
            <span>Back to home</span>
          </Link>

          <div className="login-header">
            <div className="login-logo-wrap">
              <div className="login-logo-glow" />
              <img
                src="https://images.dwncdn.net/images/t_app-icon-l/p/4855e891-8e6b-48b7-b768-507340e6ac23/418101296/crash-predictor-aviator-logo"
                alt="CrashTracker"
                className="login-logo-img"
              />
            </div>
            <h1 className="login-title">CRASH<span className="title-accent">TRACKER</span></h1>
            <p className="login-subtitle">
              {activeTab === 'login' 
                ? 'Sign in to access your neural prediction dashboard'
                : 'Create an account to start predicting crash outcomes'}
            </p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(null); setInfo(null); }}
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setError(null); setInfo(null); }}
              className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            >
              Register
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="auth-message error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="auth-message success">
              <AlertCircle size={16} />
              <span>{info}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={16} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={16} />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Processing...
                </>
              ) : activeTab === 'login' ? (
                'Sign In to Dashboard'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">
              {activeTab === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
                className="footer-link"
              >
                {activeTab === 'login' ? 'Register Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL - INFO ═══ */}
      <div className="login-info-panel">
        <div className="info-panel-content">
          {/* Animated Background Elements */}
          <div className="info-bg-grid" />
          <div className="info-bg-orb info-bg-orb-1" />
          <div className="info-bg-orb info-bg-orb-2" />
          
          {/* Header */}
          <div className="info-header">
            <div className="info-logo">
              <Orbit size={36} color="#00ffd5" />
              <span className="info-logo-text">CrashTracker</span>
            </div>
            <p className="info-tagline">Neural crash prediction engine</p>
          </div>

          {/* Quote Card */}
          <div className="quote-card">
            <div className="quote-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
            </div>
            <p className="quote-text">{quotes[currentQuote].text}</p>
            <p className="quote-author">— {quotes[currentQuote].author}</p>
          </div>

          {/* Feature Tip */}
          <div className="feature-card">
            <div className="feature-header">
              <Zap size={16} color="#ffd000" />
              <span>WHY CRASHTRACKER?</span>
            </div>
            <div className="feature-content" key={currentTip}>
              <div className="feature-icon" style={{ color: tips[currentTip].color, background: tips[currentTip].color + '15' }}>
                {tips[currentTip].icon}
              </div>
              <div className="feature-info">
                <h4 className="feature-title">{tips[currentTip].title}</h4>
                <p className="feature-desc">{tips[currentTip].desc}</p>
              </div>
              <ChevronRight size={16} color="#555" className="feature-arrow" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-value">50+</div>
              <div className="stat-label">Rounds Analyzed</div>
              <BarChart3 size={14} className="stat-icon" />
            </div>
            <div className="stat-box">
              <div className="stat-value">99.9%</div>
              <div className="stat-label">Uptime</div>
              <Activity size={14} className="stat-icon" />
            </div>
            <div className="stat-box">
              <div className="stat-value">&lt;100ms</div>
              <div className="stat-label">Latency</div>
              <Zap size={14} className="stat-icon" />
            </div>
          </div>

          {/* Trust Badges */}
          <div className="trust-row">
            <div className="trust-badge">
              <Shield size={12} />
              <span>Encrypted</span>
            </div>
            <div className="trust-badge live">
              <Flame size={12} />
              <span>Real-time</span>
            </div>
            <div className="trust-badge">
              <Target size={12} />
              <span>AI-Powered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <Suspense fallback={
        <div className="login-loading">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading CrashTracker...</span>
        </div>
      }>
        <AuthForm />
      </Suspense>
    </div>
  )
}
