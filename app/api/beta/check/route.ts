/**
 * GET /api/beta/check?email=xxx
 * Returns the beta approval status for a given email.
 * Used by BetaGate.tsx on the client side.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ approved: false, status: null });

  const supabase = createClient();

  const { data } = await supabase
    .from('beta_testers')
    .select('status, invite_code')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (!data) {
    return NextResponse.json({ approved: false, status: 'not_found' });
  }

  const approved = data.status === 'approved' || data.status === 'active';
  return NextResponse.json({ approved, status: data.status, invite_code: data.invite_code });
}
