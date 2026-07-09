import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { validateEvent } from '@polar-sh/sdk/webhooks'

export async function POST(req: Request) {
  const rawBody = await req.text()
  
  // Convert standard NextRequest headers to simple key-value record
  const headersList = Object.fromEntries(req.headers.entries())
  const secret = process.env.POLAR_WEBHOOK_SECRET || ''

  let event: any

  try {
    event = validateEvent(rawBody, headersList, secret)
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error)
    return new Response('Invalid webhook signature', { status: 401 })
  }

  const supabase = createAdminClient()
  const { type, data } = event
  console.log(`Received Polar webhook event: ${type}`)

  try {
    if (
      type === 'subscription.created' ||
      type === 'subscription.active' ||
      type === 'subscription.updated'
    ) {
      const userId = data.metadata?.user_id
      if (!userId) {
        console.warn('Subscription event missing user_id in metadata')
        return NextResponse.json({ message: 'Missing user_id' }, { status: 200 })
      }

      const polarStatus = data.status
      const dbStatus = mapPolarStatus(polarStatus)
      const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end).toISOString() : null
      const currentPeriodStart = data.current_period_start ? new Date(data.current_period_start).toISOString() : null

      // Upsert subscription row
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          polar_customer_id: data.customer_id,
          polar_subscription_id: data.id,
          status: dbStatus,
          current_period_end: currentPeriodEnd,
          payment_method: 'polar_card',
        }, { onConflict: 'user_id' })

      if (subError) throw subError

      // Record successful payment if the status is active
      if (dbStatus === 'active' && currentPeriodStart) {
        const externalRef = `${data.id}_${data.current_period_start}`
        
        await supabase
          .from('payments')
          .insert({
            user_id: userId,
            amount: 8,
            currency: 'USD',
            method: 'polar_card',
            status: 'confirmed',
            external_ref: externalRef,
          })
          .select()
          .then(({ error: payError }) => {
            if (payError && payError.code !== '23505') { // Code 23505 is PostgreSQL unique constraint violation
              console.error('Failed to record card payment:', payError)
            }
          })
      }
    } else if (type === 'subscription.revoked' || type === 'subscription.canceled') {
      const userId = data.metadata?.user_id
      if (userId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('user_id', userId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error handling Polar webhook event:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function mapPolarStatus(status: string): 'active' | 'canceled' | 'past_due' | 'trial' | 'none' {
  switch (status) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'canceled'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'trialing':
      return 'trial'
    default:
      return 'none'
  }
}
