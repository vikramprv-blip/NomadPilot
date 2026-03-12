import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'open';

    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    return NextResponse.json({ tickets: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId, reply, status } = await req.json();

    // Append admin reply to conversation
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('conversation')
      .eq('id', ticketId)
      .single();

    const conversation = [
      ...(ticket?.conversation || []),
      { role: 'agent', content: reply, agent: user.email, timestamp: new Date().toISOString() },
    ];

    const { data } = await supabase
      .from('support_tickets')
      .update({
        conversation,
        status: status || 'in_progress',
        updated_at: new Date().toISOString(),
        assigned_to: user.email,
      })
      .eq('id', ticketId)
      .select()
      .single();

    // Save notification for user
    if (data?.user_id) {
      await supabase.from('notifications').insert({
        user_id: data.user_id,
        title: '💬 Support reply from NomadPilot',
        body: reply.slice(0, 100),
        type: 'support',
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ticket: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
