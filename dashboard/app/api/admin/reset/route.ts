import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseUser.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const table = body.table

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (table === 'all') {
      await supabaseAdmin.from('crash_rounds').delete().neq('round_number', -1);
      await supabaseAdmin.from('predictions').delete().neq('round_number', -1);
      await supabaseAdmin.from('round_summaries').delete().neq('round_number', -1);
    } else if (['crash_rounds', 'predictions', 'round_summaries'].includes(table)) {
      await supabaseAdmin.from(table).delete().neq('round_number', -1);
    } else {
      return NextResponse.json({ error: 'Invalid table specified' }, { status: 400 })
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
