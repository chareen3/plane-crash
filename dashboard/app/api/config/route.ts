import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Supabase anon key not found on server env' }, { status: 500 });
  }
  return NextResponse.json({ key });
}
