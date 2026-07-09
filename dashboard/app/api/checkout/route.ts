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

    const accessToken = process.env.POLAR_ACCESS_TOKEN || ''
    const productPriceId = process.env.POLAR_PRICE_ID || ''

    if (!accessToken || !productPriceId) {
      return NextResponse.json(
        { error: 'Polar configuration is missing in server environment variables.' },
        { status: 500 }
      )
    }

    const polar = new Polar({
      accessToken,
      server: process.env.POLAR_ENV === 'sandbox' ? 'sandbox' : 'production'
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${appUrl}/account/billing?success=true`

    const checkout = await polar.checkouts.create({
      products: [productPriceId],
      successUrl,
      customerEmail: user.email || undefined,
      metadata: {
        user_id: user.id
      }
    })

    return NextResponse.json({ url: checkout.url })
  } catch (error: any) {
    console.error('Error creating Polar checkout:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
