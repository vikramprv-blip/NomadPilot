import { NextRequest, NextResponse } from 'next/server';
import { toAffiliateLink, hasTravelpayouts } from '@/lib/travelpayouts';

export async function POST(req: NextRequest) {
  try {
    const { url, subId } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
    const affiliateUrl = await toAffiliateLink(url, subId);
    return NextResponse.json({ affiliateUrl, tracked: hasTravelpayouts() && affiliateUrl !== url });
  } catch (err: any) {
    return NextResponse.json({ affiliateUrl: '', error: err.message }, { status: 500 });
  }
}
