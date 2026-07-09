import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Supabase service role key not found on server env' }, { status: 500 });
  }
  return NextResponse.json({ key });
}
