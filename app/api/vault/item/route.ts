import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('vault_items')
    .select('id, item_type, label, sensitive_data, iv, salt, metadata, expires_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Log access
  await supabase.from('vault_access_log').insert({
    user_id: user.id, action: 'view_item', item_id: id,
    ip_address: req.headers.get('x-forwarded-for') || null,
  }).catch(() => {});

  return NextResponse.json({ item: data });
}
