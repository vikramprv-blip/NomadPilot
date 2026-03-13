/**
 * Price Alert API
 * POST   /api/price-alert  — create alert
 * GET    /api/price-alert  — list user alerts
 * DELETE /api/price-alert?id=xxx — remove alert
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ alerts: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination, date, targetPrice, currency = 'USD' } = await req.json();
    if (!origin || !destination || !date) {
      return NextResponse.json({ error: 'origin, destination, and date are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id:      user.id,
        email:        user.email,
        origin,
        destination,
        date,
        target_price: targetPrice || null,
        currency,
        last_price:   null,
        triggered:    false,
        active:       true,
        created_at:   new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ alert: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await supabase.from('price_alerts').delete().eq('id', id).eq('user_id', user.id);
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
