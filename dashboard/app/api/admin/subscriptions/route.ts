import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseUser.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { targetUserId, action, days } = body;

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (action === 'revoke') {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .delete()
        .eq('user_id', targetUserId);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Subscription revoked' });
    }

    if (action === 'add_days') {
      if (typeof days !== 'number' || days <= 0) {
        return NextResponse.json({ error: 'Invalid days provided' }, { status: 400 });
      }

      // Check existing subscription
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      let newPeriodEnd: Date;
      const now = new Date();

      if (sub && sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) > now) {
        // Extend existing subscription
        newPeriodEnd = new Date(sub.current_period_end);
      } else {
        // Start from now
        newPeriodEnd = new Date();
      }

      newPeriodEnd.setDate(newPeriodEnd.getDate() + days);

      const { error: upsertError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: targetUserId,
          status: 'active',
          payment_method: 'admin_granted',
          current_period_end: newPeriodEnd.toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      return NextResponse.json({ success: true, message: `Added ${days} days`, current_period_end: newPeriodEnd.toISOString() });
    }
    
    if (action === 'lifetime') {
      // Add 100 years
      const newPeriodEnd = new Date();
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 100);
      
      const { error: upsertError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: targetUserId,
          status: 'active',
          payment_method: 'admin_granted_lifetime',
          current_period_end: newPeriodEnd.toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;
      return NextResponse.json({ success: true, message: 'Granted lifetime access', current_period_end: newPeriodEnd.toISOString() });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
