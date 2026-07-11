"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Orbit, Lock, Mail, Loader2, AlertCircle, ArrowLeft, Zap, Shield, TrendingUp, Brain, Target, Flame } from 'lucide-react'

const tips = [
  {
    icon: <Brain size={20} />,
    title: "AI-Powered Analysis",
    desc: "Our neural engine analyzes 50+ rounds in real-time to detect patterns and predict outcomes.",
    color: "#a78bfa"
  },
  {
    icon: <Shield size={20} />,
    title: "Risk Assessment",
    desc: "Get instant risk scores for each round with color-coded safety indicators.",
    color: "#00e5a0"
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Live Statistics",
    desc: "Track win rates, EV per bet, and historical performance across all sessions.",
    color: "#00ffd5"
  },
  {
    icon: <Target size={20} />,
    title: "Smart Cashout Targets",
    desc: "Statistically optimized cashout points based on your risk tolerance.",
    color: "#ffd000"
  }
]

const quotes = [
  { text: "The best predictor of the future is the past.", author: "Peter Drucker" },
  { text: "In God we trust, all others bring data.", author: "W. Edwards Deming" },
  { text: "The goal is to turn data into information, and information into insight.", author: "Carly Fiorina" },
  { text: "Without data, you're just another person with an opinion.", author: "W. Edwards Deming" },
  { text: "Statistics is the grammar of science.", author: "Karl Pearson" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" }
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
    }, 5000)
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length)
    }, 4000)
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
      {/* Left Panel - Form */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <Link href="/" className="back-link">
            <ArrowLeft size={14} />
            <span>Back to home</span>
          </Link>

          <div className="login-header">
            <div className="login-logo">
              <img
                src="https://images.dwncdn.net/images/t_app-icon-l/p/4855e891-8e6b-48b7-b768-507340e6ac23/418101296/crash-predictor-aviator-logo"
                alt="CrashAI"
                className="login-logo-img"
              />
            </div>
            <h1 className="login-title">CRASHAI ACCESS</h1>
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
                'Sign In'
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
                {activeTab === 'login' ? 'Register' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Tips & Quotes */}
      <div className="login-info-panel">
        <div className="info-panel-content">
          {/* Animated Background */}
          <div className="info-bg-pattern" />
          
          {/* Logo */}
          <div className="info-logo">
            <Orbit size={48} color="#00ffd5" />
            <span className="info-logo-text">CrashAI</span>
          </div>

          {/* Main Quote */}
          <div className="main-quote-container">
            <div className="quote-mark">"</div>
            <p className="main-quote">{quotes[currentQuote].text}</p>
            <p className="quote-author">— {quotes[currentQuote].author}</p>
          </div>

          {/* Tips Carousel */}
          <div className="tips-container">
            <h3 className="tips-title">
              <Zap size={16} color="#ffd000" />
              Why CrashAI?
            </h3>
            <div className="tip-card" style={{ borderColor: tips[currentTip].color + '40' }}>
              <div className="tip-icon" style={{ color: tips[currentTip].color, background: tips[currentTip].color + '15' }}>
                {tips[currentTip].icon}
              </div>
              <div className="tip-content">
                <h4 className="tip-title">{tips[currentTip].title}</h4>
                <p className="tip-desc">{tips[currentTip].desc}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="info-stats">
            <div className="info-stat">
              <div className="info-stat-value">50+</div>
              <div className="info-stat-label">Rounds Analyzed</div>
            </div>
            <div className="info-stat">
              <div className="info-stat-value">99.9%</div>
              <div className="info-stat-label">Uptime</div>
            </div>
            <div className="info-stat">
              <div className="info-stat-value">&lt;100ms</div>
              <div className="info-stat-label">Latency</div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="trust-badges">
            <div className="trust-badge">
              <Shield size={12} />
              <span>Encrypted</span>
            </div>
            <div className="trust-badge">
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
          <span>Loading...</span>
        </div>
      }>
        <AuthForm />
      </Suspense>
    </div>
  )
}
