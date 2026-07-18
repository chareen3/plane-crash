import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize admin client to bypass RLS policies
    const supabaseAdmin = createAdminClient();

    // Check existing subscription
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const now = new Date();

    // Check if they already have an active trial or active premium subscription
    if (
      sub &&
      (sub.status === 'active' || sub.status === 'trial') &&
      sub.current_period_end &&
      new Date(sub.current_period_end) > now
    ) {
      return NextResponse.json(
        { error: 'You already have an active subscription or trial.' },
        { status: 400 }
      );
    }

    // Set trial expiration to 30 days from now
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const { data: updatedSub, error: upsertError } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          status: 'trial',
          payment_method: 'none',
          current_period_end: trialEnd.toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, subscription: updatedSub });
  } catch (error: any) {
    console.error('Error claiming trial:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
