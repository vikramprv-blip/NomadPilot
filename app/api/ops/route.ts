import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OpsAlert, BookingResult } from '@/types';
import { nanoid } from 'nanoid';

// In production, this would be triggered by webhooks from airlines / GDS
// Here we provide a polling endpoint + manual alert endpoint

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get('tripId');

  if (!tripId) {
    return NextResponse.json({ error: 'tripId required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: alerts, error } = await supabase
    .from('ops_alerts')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: alerts || [] });
}

export async function POST(req: NextRequest) {
  try {
    const { tripId, type, severity, message } = await req.json();
    const supabase = createClient();

    let autoResolved = false;
    let resolvedMessage = message;

    // Auto-resolution logic for minor delays
    if (type === 'delay' && severity === 'low') {
      autoResolved = true;
      resolvedMessage = `${message} — Auto-monitored. No action needed.`;
    }

    // Gate change — notify but no action
    if (type === 'gate_change') {
      autoResolved = true;
      resolvedMessage = `${message} — Notification sent to traveler.`;
    }

    const alert: OpsAlert = {
      id: nanoid(),
      tripId,
      type,
      severity,
      message: resolvedMessage,
      autoResolved,
      createdAt: new Date().toISOString(),
    };

    await supabase.from('ops_alerts').insert({
      id: alert.id,
      trip_id: tripId,
      type,
      severity,
      message: resolvedMessage,
      auto_resolved: autoResolved,
      created_at: alert.createdAt,
    });

    // For severe issues (cancellation, high severity), flag for human review
    if (severity === 'high' || type === 'cancellation') {
      await supabase
        .from('trips')
        .update({ needs_human_review: true })
        .eq('id', tripId);
    }

    return NextResponse.json({ alert });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
