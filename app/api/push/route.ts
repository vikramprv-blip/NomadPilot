import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Save push subscription for a user
export async function POST(req: NextRequest) {
  try {
    const { userId, subscription, type } = await req.json();

    if (type === 'subscribe') {
      const supabase = createClient();
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        subscription: JSON.stringify(subscription),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      return NextResponse.json({ success: true });
    }

    if (type === 'send') {
      // In production: use web-push library to send actual push notifications
      // For now, return the notification payload that the client can show
      const { title, body, icon, url } = req.body as any;
      return NextResponse.json({ 
        success: true,
        notification: { title, body, icon: icon || '/NP_Logo.jpg', url: url || '/' }
      });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Get notification history for a user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ notifications: [] });

    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ notifications: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
