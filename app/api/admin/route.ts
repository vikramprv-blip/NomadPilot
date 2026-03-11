import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());

async function verifyAdmin(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'overview';

    if (type === 'overview') {
      // Get all stats in parallel
      const [usersRes, tripsRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at, plan', { count: 'exact' }),
        supabase.from('my_trips').select('id, type, created_at, partner_name', { count: 'exact' }),
        supabase.from('subscriptions').select('id, plan, status, amount, created_at'),
      ]);

      const users = usersRes.data || [];
      const trips = tripsRes.data || [];
      const subs  = subsRes.data  || [];

      const revenue = subs
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      // Recent 30 days
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
      const newUsers = users.filter(u => u.created_at > cutoff).length;
      const newTrips = trips.filter(t => t.created_at > cutoff).length;

      const planBreakdown = { free: 0, premium: 0, pro: 0, elite: 0 } as Record<string, number>;
      users.forEach(u => { if (u.plan) planBreakdown[u.plan] = (planBreakdown[u.plan] || 0) + 1; });

      const partnerBreakdown: Record<string, number> = {};
      trips.forEach(t => { partnerBreakdown[t.partner_name] = (partnerBreakdown[t.partner_name] || 0) + 1; });

      return NextResponse.json({
        totalUsers:  usersRes.count  || 0,
        totalTrips:  tripsRes.count  || 0,
        activeSubscriptions: subs.filter(s => s.status === 'active').length,
        monthlyRevenue: revenue,
        newUsers,
        newTrips,
        planBreakdown,
        partnerBreakdown,
        recentUsers: users.slice(0, 10),
        recentTrips: trips.slice(0, 10),
      });
    }

    if (type === 'users') {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return NextResponse.json({ users: data || [] });
    }

    if (type === 'subscriptions') {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return NextResponse.json({ subscriptions: data || [] });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
