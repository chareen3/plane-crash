import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Using service role for server-side insertions if needed, but anon is fine based on RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Ensure data is an array
    const rounds = Array.isArray(data) ? data : [data];
    
    const formattedRounds = rounds.map(r => ({
      round_number: r.id, // extension uses 'id' for round number
      crash_point: r.crashPoint,
      created_at: r.crashTime || new Date().toISOString()
    }));

    const { data: insertedData, error } = await supabase
      .from('crash_rounds')
      .upsert(formattedRounds, { onConflict: 'round_number' })
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: insertedData });
  } catch (err: any) {
    console.error('API /rounds error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
