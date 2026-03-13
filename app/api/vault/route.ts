/**
 * Vault CRUD API
 * All routes require authenticated session.
 * Sensitive data arrives already encrypted — server never sees plaintext.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getUser(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function logAccess(supabase: any, userId: string, action: string, itemId?: string, req?: NextRequest) {
  try {
    await supabase.from('vault_access_log').insert({
      user_id:    userId,
      action,
      item_id:    itemId || null,
      ip_address: req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || null,
      user_agent: req?.headers.get('user-agent')?.slice(0, 200) || null,
    });
  } catch { /* ignore logging errors */ }
}

// GET — list vault items (metadata only, no sensitive_data)
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const user     = await getUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('vault_items')
    .select('id, item_type, label, metadata, expires_at, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

// POST — add vault item (encrypted payload from client)
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const user     = await getUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { item_type, label, sensitive_data, iv, salt, metadata, expires_at } = await req.json();
  if (!item_type || !label || !sensitive_data || !iv || !salt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('vault_items')
    .insert({ user_id: user.id, item_type, label, sensitive_data, iv, salt, metadata: metadata || {}, expires_at: expires_at || null })
    .select('id, item_type, label, metadata, expires_at, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAccess(supabase, user.id, 'add_item', data.id, req);
  return NextResponse.json({ item: data });
}

// DELETE — remove vault item
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const user     = await getUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const { error } = await supabase
    .from('vault_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAccess(supabase, user.id, 'delete_item', id, req);
  return NextResponse.json({ success: true });
}
