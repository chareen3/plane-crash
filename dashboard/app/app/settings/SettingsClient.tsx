'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, User, Lock, CreditCard, LogOut, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { updatePassword, updateProfile } from './actions'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsClient({ user, profile, subscription }: any) {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const onPasswordSubmit = async (formData: FormData) => {
    setLoading(true)
    setMessage(null)
    const res = await updatePassword(formData)
    setLoading(false)
    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else if (res.success) {
      setMessage({ type: 'success', text: res.success })
      const form = document.getElementById('password-form') as HTMLFormElement
      if (form) form.reset()
    }
  }

  const onProfileSubmit = async (formData: FormData) => {
    setLoading(true)
    setMessage(null)
    const res = await updateProfile(formData)
    setLoading(false)
    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else if (res.success) {
      setMessage({ type: 'success', text: res.success })
    }
  }

  return (
    <div className="dash-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
      
      {/* HEADER */}
      <header className="dash-topbar" style={{ padding: '20px 40px', borderBottom: '1px solid var(--border2)' }}>
        <Link href="/app" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
          <span style={{ fontWeight: 600 }}>Back to Dashboard</span>
        </Link>
      </header>

      {/* CONTENT */}
      <div style={{ maxWidth: '800px', margin: '40px auto', width: '100%', padding: '0 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Settings</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '32px' }}>Manage your account settings, security, and subscription.</p>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: message.type === 'success' ? 'rgba(0, 229, 160, 0.1)' : 'rgba(255, 51, 102, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(0, 229, 160, 0.2)' : 'rgba(255, 51, 102, 0.2)'}`,
            color: message.type === 'success' ? '#00e5a0' : '#ff3366'
          }}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          
          {/* TABS SIDEBAR */}
          <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button 
              onClick={() => { setActiveTab('profile'); setMessage(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                backgroundColor: activeTab === 'profile' ? 'var(--surface2)' : 'transparent',
                color: activeTab === 'profile' ? 'var(--text)' : 'var(--text-dim)',
                border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 500, fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              <User size={18} color={activeTab === 'profile' ? 'var(--accent)' : 'currentColor'} /> Profile
            </button>
            <button 
              onClick={() => { setActiveTab('security'); setMessage(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                backgroundColor: activeTab === 'security' ? 'var(--surface2)' : 'transparent',
                color: activeTab === 'security' ? 'var(--text)' : 'var(--text-dim)',
                border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 500, fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              <Lock size={18} color={activeTab === 'security' ? 'var(--accent)' : 'currentColor'} /> Security
            </button>
            <button 
              onClick={() => { setActiveTab('subscription'); setMessage(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                backgroundColor: activeTab === 'subscription' ? 'var(--surface2)' : 'transparent',
                color: activeTab === 'subscription' ? 'var(--text)' : 'var(--text-dim)',
                border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 500, fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              <CreditCard size={18} color={activeTab === 'subscription' ? 'var(--accent)' : 'currentColor'} /> Subscription
            </button>

            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '16px 0' }} />

            <button 
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                backgroundColor: 'transparent',
                color: 'var(--red)',
                border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 500, fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>

          {/* TAB CONTENT */}
          <div style={{ flex: 1, backgroundColor: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px' }}>
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Profile Information</h2>
                
                <form action={onProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>Email Address</label>
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      disabled 
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: '10px',
                        backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)',
                        fontSize: '14px', cursor: 'not-allowed'
                      }} 
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>Your email address cannot be changed at this time.</p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>Timezone</label>
                    <select 
                      name="timezone"
                      defaultValue={profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: '10px',
                        backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
                        fontSize: '14px', outline: 'none'
                      }}
                    >
                      <option value="Asia/Colombo">Asia/Colombo (Sri Lanka)</option>
                      <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
                      <option value="Europe/London">Europe/London (UK)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <button 
                      type="submit" 
                      disabled={loading}
                      style={{
                        padding: '12px 24px', borderRadius: '10px',
                        backgroundColor: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: '14px',
                        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1
                      }}
                    >
                      {loading && <Loader2 size={16} className="spin" />}
                      Save Profile Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Security Settings</h2>
                
                <form id="password-form" action={onPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>New Password</label>
                    <input 
                      type="password" 
                      name="password"
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: '10px',
                        backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
                        fontSize: '14px', outline: 'none'
                      }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>Confirm New Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword"
                      placeholder="Repeat your new password"
                      required
                      minLength={6}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: '10px',
                        backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
                        fontSize: '14px', outline: 'none'
                      }} 
                    />
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <button 
                      type="submit" 
                      disabled={loading}
                      style={{
                        padding: '12px 24px', borderRadius: '10px',
                        backgroundColor: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: '14px',
                        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1
                      }}
                    >
                      {loading && <Loader2 size={16} className="spin" />}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUBSCRIPTION TAB */}
            {activeTab === 'subscription' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Subscription Details</h2>
                
                <div style={{ 
                  padding: '24px', borderRadius: '16px', 
                  backgroundColor: 'var(--bg)', border: '1px solid var(--border)',
                  marginBottom: '24px'
                }}>
                  {profile?.is_admin ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e8eeff', marginBottom: '4px' }}>Admin Lifetime Access</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>You have permanent admin privileges to the platform.</p>
                      </div>
                    </div>
                  ) : subscription && subscription.status === 'active' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(0, 229, 160, 0.1)', color: '#00e5a0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e8eeff', marginBottom: '4px' }}>Pro Plan (Active)</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                          Your subscription is active until {new Date(subscription.current_period_end).toLocaleDateString()}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(255, 51, 102, 0.1)', color: '#ff3366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e8eeff', marginBottom: '4px' }}>No Active Subscription</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>You do not have an active subscription.</p>
                      </div>
                    </div>
                  )}
                </div>

                {!profile?.is_admin && (
                  <div style={{ marginTop: '24px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px', lineHeight: 1.5 }}>
                      To manage your billing details, update your payment method, or cancel your subscription, please visit the billing portal.
                    </p>
                    <a 
                      href="/pricing"
                      style={{
                        display: 'inline-block',
                        padding: '12px 24px', borderRadius: '10px',
                        backgroundColor: 'var(--surface2)', color: 'var(--text)', fontWeight: 600, fontSize: '14px',
                        border: '1px solid var(--border)', textDecoration: 'none', transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--surface2)'}
                    >
                      Go to Pricing / Billing
                    </a>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
