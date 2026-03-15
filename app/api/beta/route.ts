/**
 * Beta signup + traction API
 * POST /api/beta        — sign up for beta
 * GET  /api/beta        — traction stats (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password, country, travel_type, how_heard, use_case, source } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const supabase = createClient();

    // Check if already signed up
    const { data: existing } = await supabase
      .from('beta_testers')
      .select('id, status, invite_code')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        already: true,
        status: existing.status,
        invite_code: existing.invite_code,
        message: `You're already on the list! Status: ${existing.status}`,
      });
    }

    // Create Supabase auth account so they can sign in later
    const { error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: { data: { full_name: name || '' } },
    });

    if (authError && !authError.message.includes('already registered')) {
      throw authError;
    }

    // Insert into beta_testers waitlist
    const { data, error } = await supabase
      .from('beta_testers')
      .insert({
        email:       email.toLowerCase().trim(),
        name:        name || null,
        country:     country || null,
        travel_type: travel_type || null,
        how_heard:   how_heard || null,
        use_case:    use_case || null,
        source:      source || req.headers.get('referer') || 'organic',
        status:      'waitlist',
      })
      .select('id, invite_code')
      .single();

    if (error) throw error;

    // Log signup event
    await supabase.from('beta_events').insert({
      tester_id: data.id,
      email:     email.toLowerCase().trim(),
      event:     'signup',
      metadata:  { country, travel_type, how_heard, source },
    });

    return NextResponse.json({
      success:     true,
      invite_code: data.invite_code,
      message:     "You're on the waitlist! We'll email you with your invite.",
    });

  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ success: true, already: true, message: 'Already signed up!' });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  const [
    { count: total },
    { count: waitlist },
    { count: invited },
    { count: active },
    { data: recent },
  ] = await Promise.all([
    supabase.from('beta_testers').select('*', { count: 'exact', head: true }),
    supabase.from('beta_testers').select('*', { count: 'exact', head: true }).eq('status', 'waitlist'),
    supabase.from('beta_testers').select('*', { count: 'exact', head: true }).eq('status', 'invited'),
    supabase.from('beta_testers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('beta_testers').select('email,name,country,status,created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  return NextResponse.json({ summary: { total, waitlist, invited, active }, recentSignups: recent });
}
