'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Password updated successfully' }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const rawTz = String(formData.get('timezone') || '').trim()
  if (!rawTz) {
    return { error: 'Please select a timezone' }
  }

  // Basic IANA validation
  try {
    Intl.DateTimeFormat(undefined, { timeZone: rawTz })
  } catch {
    return { error: 'Invalid timezone selected' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ timezone: rawTz })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/app/settings')
  revalidatePath('/app')
  return { success: 'Profile updated successfully' }
}
