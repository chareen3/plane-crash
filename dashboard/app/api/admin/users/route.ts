import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// GET all users
export async function GET(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseUser.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Fetch all subscriptions
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('*');

    if (subsError) throw subsError;

    // Combine them
    const subsMap = new Map(subscriptions.map(s => [s.user_id, s]));
    
    const result = profiles.map(p => ({
      ...p,
      subscription: subsMap.get(p.id) || null
    }));

    return NextResponse.json({ users: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT to update is_admin status
export async function PUT(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseUser.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { targetUserId, is_admin } = body;

    if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    
    // Prevent removing your own admin status if you want to avoid locking yourself out
    if (targetUserId === user.id && is_admin === false) {
       return NextResponse.json({ error: 'Cannot revoke your own admin rights' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin })
      .eq('id', targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE to remove user
export async function DELETE(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseUser.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('id');

    if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });

    if (targetUserId === user.id) {
       return NextResponse.json({ error: 'Cannot delete your own account from admin panel' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete user from auth (will cascade to profiles/subscriptions if RLS/schema is set correctly)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (error) throw error;
    
    // Also explicitly delete profile just in case cascade is not set
    await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
    await supabaseAdmin.from('subscriptions').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('payments').delete().eq('user_id', targetUserId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
