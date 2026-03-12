/**
 * Travelpayouts Integration
 * 
 * TWO things this does:
 * 1. Data API  — flight prices, cheapest dates, price trends (free, cached)
 * 2. Link API  — converts ANY partner URL into tracked affiliate link (earns commission)
 *
 * Setup — 3 env vars in Vercel:
 *   TP_TOKEN   — API token from travelpayouts.com/programs/100/tools/api
 *   TP_MARKER  — your partner marker (Travelpayouts account → Tools → Marker)
 *   TP_TRS     — your project TRS ID (project list after subscribing to a brand)
 */

const TP_TOKEN  = process.env.TP_TOKEN  || '';
const TP_MARKER = process.env.TP_MARKER || '';
const TP_TRS    = process.env.TP_TRS    || '';

const DATA_API = 'https://api.travelpayouts.com/v2';
const LINK_API = 'https://api.travelpayouts.com/v2/links';

export function hasTravelpayouts(): boolean {
  return !!(TP_TOKEN && TP_MARKER && TP_TRS);
}

// ─── LINK CONVERTER — THE MONEY MAKER ────────────────────────────────────────
// Pass any Booking.com, Kiwi, Hotels.com, Agoda, Aviasales URL
// Returns tracked affiliate link. Commission tracked automatically in your TP dashboard.
export async function toAffiliateLinks(
  urls: string[],
  subId?: string
): Promise<Record<string, string>> {
  if (!hasTravelpayouts()) {
    return Object.fromEntries(urls.map(u => [u, u]));
  }
  try {
    const res = await fetch(LINK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Access-Token': TP_TOKEN },
      body: JSON.stringify({
        trs:    Number(TP_TRS),
        marker: Number(TP_MARKER),
        shorten: false,
        links: urls.slice(0, 10).map(url => ({ url, ...(subId ? { sub_id: subId } : {}) })),
      }),
    });
    const data = await res.json();
    const result: Record<string, string> = {};
    (data?.result?.links || []).forEach((item: any, i: number) => {
      result[urls[i]] = item?.partner_url || item?.url || urls[i];
    });
    urls.forEach(u => { if (!result[u]) result[u] = u; });
    return result;
  } catch {
    return Object.fromEntries(urls.map(u => [u, u]));
  }
}

export async function toAffiliateLink(url: string, subId?: string): Promise<string> {
  const map = await toAffiliateLinks([url], subId);
  return map[url] || url;
}

// ─── CHEAPEST FLIGHTS for a route ────────────────────────────────────────────
export interface TPFlightPrice {
  origin: string; destination: string; departDate: string; returnDate: string | null;
  price: number; currency: string; airline: string; stops: number; link: string;
}

export async function getCheapestFlights(params: {
  origin: string; destination: string; currency?: string; limit?: number;
}): Promise<TPFlightPrice[]> {
  if (!TP_TOKEN) return [];
  try {
    const url = new URL(`${DATA_API}/prices/latest`);
    url.searchParams.set('origin', params.origin);
    url.searchParams.set('destination', params.destination);
    url.searchParams.set('currency', params.currency || 'USD');
    url.searchParams.set('limit', String(params.limit || 10));
    url.searchParams.set('show_to_affiliates', 'true');
    url.searchParams.set('sorting', 'price');
    const res  = await fetch(url.toString(), { headers: { 'X-Access-Token': TP_TOKEN } });
    const data = await res.json();
    if (!data?.success) return [];
    return (data.data || []).map((f: any): TPFlightPrice => ({
      origin: f.origin, destination: f.destination,
      departDate: f.depart_date, returnDate: f.return_date || null,
      price: f.value, currency: params.currency || 'USD',
      airline: f.airline || '', stops: f.number_of_changes || 0,
      link: `https://www.aviasales.com/search/${f.origin}${f.depart_date?.slice(5,7)}${f.depart_date?.slice(8,10)}${f.destination}1${TP_MARKER ? '?marker='+TP_MARKER : ''}`,
    }));
  } catch { return []; }
}

// ─── PRICE CALENDAR — cheapest per day in a month ────────────────────────────
export interface TPPriceCalendar { [date: string]: { price: number; airline: string; stops: number } }

export async function getPriceCalendar(params: {
  origin: string; destination: string; month: string; currency?: string;
}): Promise<TPPriceCalendar> {
  if (!TP_TOKEN) return {};
  try {
    const url = new URL(`${DATA_API}/prices/month-matrix`);
    url.searchParams.set('origin', params.origin);
    url.searchParams.set('destination', params.destination);
    url.searchParams.set('month', params.month);
    url.searchParams.set('currency', params.currency || 'USD');
    url.searchParams.set('show_to_affiliates', 'true');
    const res  = await fetch(url.toString(), { headers: { 'X-Access-Token': TP_TOKEN } });
    const data = await res.json();
    const cal: TPPriceCalendar = {};
    for (const [date, info] of Object.entries(data?.data || {})) {
      const d = info as any;
      cal[date] = { price: d.price, airline: d.airline || '', stops: d.transfers || 0 };
    }
    return cal;
  } catch { return {}; }
}

// ─── POPULAR DESTINATIONS from origin ────────────────────────────────────────
export interface TPDestination {
  destination: string; origin: string; departDate: string; price: number; link: string;
}

export async function getPopularDestinations(origin: string, currency = 'USD'): Promise<TPDestination[]> {
  if (!TP_TOKEN) return [];
  try {
    const url = new URL(`${DATA_API}/prices/latest`);
    url.searchParams.set('origin', origin);
    url.searchParams.set('currency', currency);
    url.searchParams.set('limit', '20');
    url.searchParams.set('show_to_affiliates', 'true');
    url.searchParams.set('sorting', 'price');
    const res  = await fetch(url.toString(), { headers: { 'X-Access-Token': TP_TOKEN } });
    const data = await res.json();
    return (data?.data || []).map((f: any): TPDestination => ({
      destination: f.destination, origin: f.origin, departDate: f.depart_date,
      price: f.value,
      link: `https://www.aviasales.com/search/${f.origin}${f.depart_date?.slice(5,7)}${f.depart_date?.slice(8,10)}${f.destination}1${TP_MARKER ? '?marker='+TP_MARKER : ''}`,
    }));
  } catch { return []; }
}
