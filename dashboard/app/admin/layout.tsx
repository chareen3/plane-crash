import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminClientLayout from './components/AdminClientLayout'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (!profile || !profile.is_admin) {
    redirect('/')
  }

  return (
    <AdminClientLayout userEmail={user.email || 'Admin User'}>
      {children}
    </AdminClientLayout>
  );
}
