import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email, event, metadata } = await req.json();
    if (!email || !event) return NextResponse.json({ ok: false });

    const supabase = createClient();

    // Find tester
    const { data: tester } = await supabase
      .from('beta_testers')
      .select('id, status, search_count, booking_count')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!tester) return NextResponse.json({ ok: false, reason: 'not found' });

    // Log event
    await supabase.from('beta_events').insert({
      tester_id: tester.id,
      email:     email.toLowerCase().trim(),
      event,
      metadata:  metadata || {},
    });

    // Update tester stats
    const updates: any = { last_active: new Date().toISOString() };
    if (event === 'search')         updates.search_count  = (tester.search_count  || 0) + 1;
    if (event === 'booking_saved')  updates.booking_count = (tester.booking_count || 0) + 1;
    if (event === 'first_search' && tester.status === 'invited') {
      updates.status       = 'active';
      updates.activated_at = new Date().toISOString();
    }

    await supabase.from('beta_testers').update(updates).eq('id', tester.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
