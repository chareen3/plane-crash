import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Read all settings from Supabase game_settings table
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_settings')
    .select('key, value');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten to { key: value } object
  const settings = Object.fromEntries(
    (data ?? []).map(r => [r.key, r.value])
  );
  return NextResponse.json(settings);
}

// Write one or more settings keys
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();

    // Upsert each key
    const upserts = Object.entries(body).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('game_settings')
      .upsert(upserts, { onConflict: 'key' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Return updated settings
    const { data: updated } = await supabase
      .from('game_settings').select('key, value');
    const settings = Object.fromEntries((updated ?? []).map(r => [r.key, r.value]));

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
