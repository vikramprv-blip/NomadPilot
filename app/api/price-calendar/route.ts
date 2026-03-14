/**
 * Price calendar — cheapest flight price for each day of a month
 * Used by the date picker to show green/amber/red pricing calendar
 * 
 * GET /api/price-calendar?origin=BLL&destination=DEL&month=2026-03
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPriceCalendar } from '@/lib/travelpayouts';

export async function GET(req: NextRequest) {
  const p           = req.nextUrl.searchParams;
  const origin      = p.get('origin')      || '';
  const destination = p.get('destination') || '';
  const month       = p.get('month')       || new Date().toISOString().slice(0, 7);
  const currency    = p.get('currency')    || 'USD';

  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination required' }, { status: 400 });
  }

  const calendar = await getPriceCalendar({ origin, destination, month, currency });
  return NextResponse.json({ origin, destination, month, currency, calendar });
}
