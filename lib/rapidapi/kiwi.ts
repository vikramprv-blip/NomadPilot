/**
 * Kiwi.com Cheap Flights via RapidAPI (emir12/kiwi-com-cheap-flights)
 * Much broader flight coverage than Amadeus test environment
 */

const BASE    = 'https://kiwi-com-cheap-flights.p.rapidapi.com';
const HEADERS = {
  'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY!,
  'X-RapidAPI-Host': 'kiwi-com-cheap-flights.p.rapidapi.com',
};

export interface KiwiFlight {
  id:          string;
  airline:     string;
  flightNumber: string;
  origin:      string;
  destination: string;
  departure:   string;
  arrival:     string;
  duration:    string;
  stops:       number;
  cabin:       string;
  price:       number;
  currency:    string;
  deepLink:    string;  // direct booking link with affiliate
}

export async function searchKiwiFlights(params: {
  origin:      string;   // IATA
  destination: string;   // IATA
  date:        string;   // YYYY-MM-DD
  returnDate?: string;
  adults:      number;
  cabin?:      string;
  currency?:   string;
}): Promise<KiwiFlight[]> {
  try {
    const url = new URL(`${BASE}/flights`);
    url.searchParams.set('fly_from',      params.origin);
    url.searchParams.set('fly_to',        params.destination);
    url.searchParams.set('date_from',     formatKiwiDate(params.date));
    url.searchParams.set('date_to',       formatKiwiDate(params.date));
    if (params.returnDate) {
      url.searchParams.set('return_from', formatKiwiDate(params.returnDate));
      url.searchParams.set('return_to',   formatKiwiDate(params.returnDate));
    }
    url.searchParams.set('adults',        String(params.adults));
    url.searchParams.set('curr',          params.currency || 'USD');
    url.searchParams.set('limit',         '10');
    url.searchParams.set('sort',          'price');
    if (params.cabin) url.searchParams.set('selected_cabins', kiwiCabin(params.cabin));

    const res  = await fetch(url.toString(), { headers: HEADERS });
    const data = await res.json();

    return (data?.data || []).slice(0, 10).map((f: any): KiwiFlight => {
      const route    = f?.route?.[0] || {};
      const lastRoute = f?.route?.[f.route.length - 1] || {};
      const durationMin = f?.duration?.departure || 0;
      return {
        id:           f?.id || String(Math.random()),
        airline:      route?.airline || 'XX',
        flightNumber: `${route?.airline || 'XX'}${route?.flight_no || ''}`,
        origin:       f?.flyFrom || params.origin,
        destination:  f?.flyTo   || params.destination,
        departure:    f?.local_departure || '',
        arrival:      f?.local_arrival   || '',
        duration:     durationMin ? `PT${Math.floor(durationMin/60)}H${durationMin%60}M` : '',
        stops:        Math.max(0, (f?.route?.length || 1) - 1),
        cabin:        params.cabin || 'economy',
        price:        f?.price || 0,
        currency:     params.currency || 'USD',
        deepLink:     f?.deep_link || `https://www.kiwi.com/en/booking?token=${f?.booking_token}`,
      };
    });
  } catch (err) {
    console.error('[Kiwi API]', err);
    return [];
  }
}

// dd/mm/yyyy format that Kiwi expects
function formatKiwiDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function kiwiCabin(cabin: string): string {
  const map: Record<string, string> = {
    economy: 'M', premium_economy: 'W', business: 'C', first: 'F',
  };
  return map[cabin.toLowerCase()] || 'M';
}
