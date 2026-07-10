import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the RPC function which properly increments total_seconds_spent
    const { error } = await supabase.rpc('upsert_user_activity', {
      p_user_id: user.id,
      p_seconds_to_add: 60
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Heartbeat] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
