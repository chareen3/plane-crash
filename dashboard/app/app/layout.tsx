import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_admin === true

  // Check if user has active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .single()

  const now = new Date()
  const isActive = 
    (subscription && 
     subscription.status === 'active' && 
     subscription.current_period_end && 
     new Date(subscription.current_period_end) > now) || 
    isAdmin

  if (!isActive) {
    redirect('/pricing?reason=unsubscribed')
  }

  return <>{children}</>;
}
