import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reference, note } = await req.json()

    if (!reference || reference.trim() === '') {
      return NextResponse.json(
        { error: 'Transaction reference slip ID is required.' },
        { status: 400 }
      )
    }

    // Insert pending payment record
    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: 2700,
        currency: 'LKR',
        method: 'bank_transfer',
        status: 'pending',
        external_ref: reference.trim(),
      })
      .select()

    if (error) {
      // Check for PostgreSQL unique violation (code 23505) on unique_external_ref
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This transaction reference has already been submitted.' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, payment: data[0] })
  } catch (error: any) {
    console.error('Error submitting bank transfer details:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
