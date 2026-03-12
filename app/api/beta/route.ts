/**
 * Beta signup + traction API
 * POST /api/beta        — sign up for beta
 * GET  /api/beta        — traction stats (admin only)
 * POST /api/beta/event  — track an event
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── POST — beta signup ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, country, travel_type, how_heard, use_case, source } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
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

    // Insert new tester
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
      return NextResponse.json({ success: true, already: true, message: "Already signed up!" });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET — traction stats (admin) ──────────────────────────────────────────────
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
    { data: byCountry },
    { data: bySource },
    { data: dailySignups },
    { data: recentEvents },
  ] = await Promise.all([
    supabase.from('beta_testers').select('*', { count: 'exact', head: true }),
    supabase.from('beta_testers').select('*', { count: 'exact', head: true }).eq('status', 'waitlist'),
    supabase.from('beta_testers').select('*', { count: 'exact', head: true }).eq('status', 'invited'),
    supabase.from('beta_testers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('beta_testers').select('email,name,country,status,search_count,created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('beta_testers').select('country').not('country', 'is', null),
    supabase.from('beta_testers').select('how_heard').not('how_heard', 'is', null),
    supabase.from('beta_testers').select('created_at').order('created_at', { ascending: true }),
    supabase.from('beta_events').select('event,email,metadata,created_at').order('created_at', { ascending: false }).limit(50),
  ]);

  // Aggregate country breakdown
  const countryMap: Record<string, number> = {};
  (byCountry || []).forEach((r: any) => {
    countryMap[r.country] = (countryMap[r.country] || 0) + 1;
  });

  // Aggregate source breakdown
  const sourceMap: Record<string, number> = {};
  (bySource || []).forEach((r: any) => {
    const src = r.how_heard || 'unknown';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });

  // Daily signups for chart
  const dayMap: Record<string, number> = {};
  (dailySignups || []).forEach((r: any) => {
    const day = r.created_at?.slice(0, 10);
    if (day) dayMap[day] = (dayMap[day] || 0) + 1;
  });

  return NextResponse.json({
    summary: { total, waitlist, invited, active },
    recentSignups:  recent,
    byCountry:      Object.entries(countryMap).sort((a,b) => b[1]-a[1]).slice(0, 10),
    bySource:       Object.entries(sourceMap).sort((a,b) => b[1]-a[1]),
    dailySignups:   Object.entries(dayMap).map(([date, count]) => ({ date, count })),
    recentActivity: recentEvents,
  });
}
