import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 403 })
    }

    const { paymentId } = await req.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required.' }, { status: 400 })
    }

    // Fetch the payment details to get the user_id
    const { data: payment, error: fetchPayError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (fetchPayError || !payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: 'This payment is already processed.' },
        { status: 400 }
      )
    }

    const targetUserId = payment.user_id

    // Update payment record to confirmed
    const { error: updatePayError } = await supabase
      .from('payments')
      .update({ status: 'confirmed' })
      .eq('id', paymentId)

    if (updatePayError) throw updatePayError

    // Fetch user's current subscription to check for extensions
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    let newPeriodEnd: Date
    const now = new Date()

    if (sub && sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) > now) {
      // Extend existing subscription
      newPeriodEnd = new Date(sub.current_period_end)
      newPeriodEnd.setDate(newPeriodEnd.getDate() + 30)
    } else {
      // Start a new 30-day period
      newPeriodEnd = new Date()
      newPeriodEnd.setDate(newPeriodEnd.getDate() + 30)
    }

    // Upsert subscription
    const { error: upsertSubError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: targetUserId,
        status: 'active',
        payment_method: 'bank_transfer',
        current_period_end: newPeriodEnd.toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertSubError) throw upsertSubError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
