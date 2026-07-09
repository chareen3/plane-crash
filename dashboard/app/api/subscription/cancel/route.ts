import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { Polar } from '@polar-sh/sdk'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's subscription
    const { data: sub, error: fetchSubError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchSubError || !sub) {
      return NextResponse.json({ error: 'No active subscription found.' }, { status: 404 })
    }

    if (sub.status !== 'active') {
      return NextResponse.json({ error: 'Subscription is already inactive.' }, { status: 400 })
    }

    if (sub.payment_method === 'polar_card') {
      const accessToken = process.env.POLAR_ACCESS_TOKEN || ''
      const polarSubscriptionId = sub.polar_subscription_id

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Polar API configuration is missing.' },
          { status: 500 }
        )
      }

      if (!polarSubscriptionId) {
        return NextResponse.json(
          { error: 'Polar subscription ID is missing on your account profile.' },
          { status: 400 }
        )
      }

      const polar = new Polar({
        accessToken,
        server: process.env.POLAR_ENV === 'sandbox' ? 'sandbox' : 'production'
      })

      // Cancel at period end in Polar
      await polar.subscriptions.update({
        id: polarSubscriptionId,
        subscriptionUpdate: {
          cancelAtPeriodEnd: true,
        },
      })

      // Also update database status
      const { error: dbError } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', user.id)

      if (dbError) throw dbError
    } else if (sub.payment_method === 'bank_transfer') {
      // For bank transfer, cancel immediately by setting status to canceled and expiring period end
      const { error: dbError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          current_period_end: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (dbError) throw dbError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
