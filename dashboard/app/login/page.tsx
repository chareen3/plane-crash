"use client"

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Orbit, Lock, Mail, Loader2, AlertCircle, ArrowLeft, Zap, Shield, TrendingUp, Brain, Target, Flame, BarChart3, Activity, ChevronRight, ChevronLeft, Star, Quote, Phone } from 'lucide-react'

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

const testimonials = [
  // Sri Lanka - More feedback
  {
    name: "Kavindu Perera",
    country: "Sri Lanka",
    flag: "🇱🇰",
    role: "Professional Trader",
    rating: 5,
    text: "CrashTracker changed my game completely! The AI predictions are spot-on. I've increased my win rate by 40% in just 2 weeks.",
    highlight: "40% win rate increase"
  },
  {
    name: "Dinesh Fernando",
    country: "Sri Lanka",
    flag: "🇱🇰",
    role: "数据分析专家",
    rating: 5,
    text: "මේ tool එක හරියටම work කරනවා. Real-time predictions නිසා මට ගොඩක් help වුණා. මාසයකට ලක්ෂයකට වැඩි සල්ලි හොයනවා!",
    highlight: "Monthly LKR 100K+ earnings"
  },
  {
    name: "Nipun Silva",
    country: "Sri Lanka",
    flag: "🇱🇰",
    role: "Casino Player",
    rating: 5,
    text: "The pattern detection feature is incredible. I can see crash trends before they happen. Best investment I've made this year!",
    highlight: "Pattern detection expert"
  },
  {
    name: "Shanika Wijesinghe",
    country: "Sri Lanka",
    flag: "🇱🇰",
    role: "Data Analyst",
    rating: 5,
    text: "As a data analyst, I appreciate the statistical accuracy. The risk scoring system is more reliable than any other tool I've tried.",
    highlight: "Statistically accurate"
  },
  {
    name: "Amal Jayawardena",
    country: "Sri Lanka",
    flag: "🇱🇰",
    role: "Full-time Gambler",
    rating: 5,
    text: "අවුරුද්දකට වැඩි කාලයක් මම මේ tool එක use කරනවා. මට කවදාවත් මේ තරම් consistent results ලැබිලා නැහැ. CrashTracker is the real deal!",
    highlight: "1+ year user"
  },
  {
    name: "Tharindu Ratnayake",
    country: "Sri Lanka",
    flag: "🇱🇰",
    role: "Entrepreneur",
    rating: 5,
    text: "The AI coach feature saved me from so many bad bets. It's like having a personal advisor watching every round for you.",
    highlight: "AI Coach feature"
  },
  {
    name: "Chathura Bandara",
    country: "Sri Lanka",
    flag: "🇱🇰",
    role: "Weekend Player",
    rating: 5,
    text: "Weekend gambling වලදී මේ tool එක බොහොම ප්‍රයෝජනවත්. Simple interface එක නිසා ඉක්මනින් තීරණ ගන්න පුළුවන්.",
    highlight: "Simple interface"
  },
  // India
  {
    name: "Rajesh Kumar",
    country: "India",
    flag: "🇮🇳",
    role: "Software Engineer",
    rating: 5,
    text: "The real-time data sync is lightning fast. I've been using CrashTracker for 6 months and my profits have doubled!",
    highlight: "6 months, doubled profits"
  },
  {
    name: "Priya Sharma",
    country: "India",
    flag: "🇮🇳",
    role: "Business Owner",
    rating: 5,
    text: "Best crash prediction tool in the market. The win rate tracking helps me understand my performance over time.",
    highlight: "Best in market"
  },
  {
    name: "Vikram Patel",
    country: "India",
    flag: "🇮🇳",
    role: "Professional Bettor",
    rating: 5,
    text: "Smart cashout targets feature is a game-changer. I never miss optimal exit points anymore. Highly recommended!",
    highlight: "Never miss exits"
  },
  // Singapore
  {
    name: "Wei Chen Tan",
    country: "Singapore",
    flag: "🇸🇬",
    role: "Financial Analyst",
    rating: 5,
    text: "As someone who works with data daily, CrashTracker's analytics are impressive. The statistical models are spot-on accurate.",
    highlight: "Impressive analytics"
  },
  {
    name: "Michelle Lim",
    country: "Singapore",
    flag: "🇸🇬",
    role: "Part-time Player",
    rating: 5,
    text: "Even as a casual player, I find CrashTracker incredibly useful. The risk indicators make decision-making so much easier.",
    highlight: "Easy decisions"
  },
]

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <div className="testimonial-card">
      <div className="testimonial-header">
        <div className="testimonial-avatar">
          <span className="testimonial-flag">{testimonial.flag}</span>
        </div>
        <div className="testimonial-info">
          <div className="testimonial-name">{testimonial.name}</div>
          <div className="testimonial-role">{testimonial.role}</div>
        </div>
        <div className="testimonial-rating">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} size={12} fill="#ffd000" color="#ffd000" />
          ))}
        </div>
      </div>
      <div className="testimonial-text">
        <Quote size={14} className="testimonial-quote-icon" />
        {testimonial.text}
      </div>
      <div className="testimonial-highlight">{testimonial.highlight}</div>
    </div>
  )
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/app'
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login'

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mobile, setMobile] = useState('')
  const [timezone, setTimezone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimezone(tz || 'UTC')
    } catch {
      setTimezone('UTC')
    }
  }, [])

  // Auto-slide testimonials
  useEffect(() => {
    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 4000)
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length)
    }, 5000)
    return () => {
      clearInterval(testimonialInterval)
      clearInterval(tipInterval)
    }
  }, [])

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

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
            mobile,
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
        setMobile('')
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

            {activeTab === 'signup' && (
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <div className="input-wrapper">
                  <Phone className="input-icon" size={16} />
                  <input
                    type="tel"
                    required
                    placeholder="+94 77 123 4567"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            )}

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
          {/* Background Elements */}
          <div className="info-bg-grid" />
          <div className="info-bg-orb info-bg-orb-1" />
          <div className="info-bg-orb info-bg-orb-2" />
          
          {/* Header */}
          <div className="info-header">
            <div className="info-logo">
              <Orbit size={32} color="#00ffd5" />
              <span className="info-logo-text">CrashTracker</span>
            </div>
            <p className="info-tagline">Neural crash prediction engine</p>
          </div>

          {/* Feature Tip */}
          <div className="feature-card">
            <div className="feature-header">
              <Zap size={14} color="#ffd000" />
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
              <ChevronRight size={14} color="#555" className="feature-arrow" />
            </div>
          </div>

          {/* Testimonials Carousel */}
          <div className="testimonials-section">
            <div className="testimonials-header">
              <span className="testimonials-label">REAL USER FEEDBACK</span>
              <div className="testimonials-nav">
                <button onClick={prevTestimonial} className="testimonial-nav-btn">
                  <ChevronLeft size={14} />
                </button>
                <span className="testimonial-counter">{currentTestimonial + 1}/{testimonials.length}</span>
                <button onClick={nextTestimonial} className="testimonial-nav-btn">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            
            <div className="testimonials-carousel" ref={carouselRef}>
              <div 
                className="testimonials-track"
                style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="testimonial-slide">
                    <TestimonialCard testimonial={testimonial} />
                  </div>
                ))}
              </div>
            </div>

            {/* Dots */}
            <div className="testimonials-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`testimonial-dot ${index === currentTestimonial ? 'active' : ''}`}
                  onClick={() => setCurrentTestimonial(index)}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-value">50+</div>
              <div className="stat-label">Rounds Analyzed</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">&lt;100ms</div>
              <div className="stat-label">Latency</div>
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
