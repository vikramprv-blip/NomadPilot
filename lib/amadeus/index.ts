import { FlightOption, HotelOption, TripIntent } from '@/types';

// Switch to production when keys are ready
const AMADEUS_BASE = process.env.AMADEUS_ENV === 'production'
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

// ── In-memory cache (resets on cold start, good enough for edge functions) ──
const cache = new Map<string, { data: any; expires: number }>();

function getCached(key: string) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  cache.delete(key);
  return null;
}

function setCached(key: string, data: any, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// ── Token cache (tokens last 30 min, cache for 25 min) ─────────────────────
let tokenCache: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now()) return tokenCache.token;

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.AMADEUS_API_KEY!,
      client_secret: process.env.AMADEUS_API_SECRET!,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Amadeus auth failed: ${data.error_description}`);

  tokenCache = { token: data.access_token, expires: Date.now() + 25 * 60 * 1000 };
  return data.access_token;
}

// ── IATA lookup (cache for 24 hours — airport codes don't change) ───────────
export async function resolveIATA(token: string, query: string): Promise<string> {
  if (/^[A-Z]{3}$/.test(query.trim())) return query.trim();

  const cacheKey = `iata:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const CITY_MAP: Record<string, string> = {
    'billund': 'BLL', 'delhi': 'DEL', 'new delhi': 'DEL',
    'dubai': 'DXB', 'london': 'LHR', 'paris': 'CDG',
    'new york': 'JFK', 'tokyo': 'NRT', 'singapore': 'SIN',
    'bangkok': 'BKK', 'amsterdam': 'AMS', 'frankfurt': 'FRA',
    'munich': 'MUC', 'istanbul': 'IST', 'doha': 'DOH',
    'abu dhabi': 'AUH', 'mumbai': 'BOM', 'bangalore': 'BLR',
    'sydney': 'SYD', 'toronto': 'YYZ', 'chicago': 'ORD',
    'los angeles': 'LAX', 'miami': 'MIA', 'hong kong': 'HKG',
    'seoul': 'ICN', 'beijing': 'PEK', 'shanghai': 'PVG',
    'cairo': 'CAI', 'nairobi': 'NBO', 'johannesburg': 'JNB',
    'sao paulo': 'GRU', 'mexico city': 'MEX', 'madrid': 'MAD',
    'rome': 'FCO', 'milan': 'MXP', 'zurich': 'ZRH',
    'copenhagen': 'CPH', 'stockholm': 'ARN', 'oslo': 'OSL',
    'helsinki': 'HEL', 'warsaw': 'WAW', 'vienna': 'VIE',
    'brussels': 'BRU', 'lisbon': 'LIS', 'athens': 'ATH',
    'kuala lumpur': 'KUL', 'jakarta': 'CGK', 'manila': 'MNL',
    'karachi': 'KHI', 'lahore': 'LHE', 'islamabad': 'ISB',
    'colombo': 'CMB', 'dhaka': 'DAC', 'kathmandu': 'KTM',
    'riyadh': 'RUH', 'jeddah': 'JED', 'kuwait': 'KWI',
    'bahrain': 'BAH', 'muscat': 'MCT', 'amman': 'AMM',
    'beirut': 'BEY', 'tel aviv': 'TLV', 'casablanca': 'CMN',
    'lagos': 'LOS', 'accra': 'ACC', 'addis ababa': 'ADD',
    'chicago': 'ORD', 'atlanta': 'ATL', 'dallas': 'DFW',
    'san francisco': 'SFO', 'seattle': 'SEA', 'boston': 'BOS',
    'barcelona': 'BCN', 'manchester': 'MAN', 'birmingham': 'BHX',
    'glasgow': 'GLA', 'edinburgh': 'EDI', 'dublin': 'DUB',
  };

  const lower = query.toLowerCase().trim();
  if (CITY_MAP[lower]) {
    setCached(cacheKey, CITY_MAP[lower], 24 * 60 * 60 * 1000);
    return CITY_MAP[lower];
  }

  try {
    const res = await fetch(
      `${AMADEUS_BASE}/v1/reference-data/locations?keyword=${encodeURIComponent(query)}&subType=AIRPORT,CITY&page[limit]=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const iata = data.data?.[0]?.iataCode;
    if (iata) {
      setCached(cacheKey, iata, 24 * 60 * 60 * 1000);
      return iata;
    }
  } catch {}

  return query.toUpperCase().slice(0, 3);
}

// ── Flight Search (cache 15 min — prices don't change that fast) ────────────
export async function searchFlights(intent: TripIntent): Promise<FlightOption[]> {
  const token = await getAccessToken();

  const [originCode, destCode] = await Promise.all([
    resolveIATA(token, intent.origin),
    resolveIATA(token, intent.destination),
  ]);

  const cabinMap: Record<string, string> = {
    economy: 'ECONOMY', premium_economy: 'PREMIUM_ECONOMY',
    business: 'BUSINESS', first: 'FIRST',
  };

  const cacheKey = `flights:${originCode}:${destCode}:${intent.departureDate}:${intent.returnDate || ''}:${intent.travelers || 1}:${intent.preferences?.cabinClass || 'economy'}:${intent.currency || 'USD'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[Amadeus] Cache hit for ${cacheKey}`);
    return cached;
  }

  const params: Record<string, string> = {
    originLocationCode:      originCode,
    destinationLocationCode: destCode,
    departureDate:           intent.departureDate,
    adults:                  String(intent.travelers || 1),
    travelClass:             cabinMap[intent.preferences?.cabinClass || 'economy'] || 'ECONOMY',
    max:                     '20', // increased from 10 to show more airlines
    currencyCode:            intent.currency || 'USD',
  };

  if (intent.returnDate && intent.returnDate.trim()) {
    params.returnDate = intent.returnDate;
  }

  const res = await fetch(
    `${AMADEUS_BASE}/v2/shopping/flight-offers?${new URLSearchParams(params)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  if (!res.ok) {
    const errMsg = data.errors?.[0]?.detail || JSON.stringify(data.errors);
    throw new Error(`Flight search failed: ${errMsg}`);
  }

  // Airline name map for display
  const AIRLINE_NAMES: Record<string, string> = {
    EK: 'Emirates', EY: 'Etihad', QR: 'Qatar Airways',
    BA: 'British Airways', LH: 'Lufthansa', AF: 'Air France',
    KL: 'KLM', UA: 'United Airlines', AA: 'American Airlines',
    DL: 'Delta Air Lines', VS: 'Virgin Atlantic', SQ: 'Singapore Airlines',
    CX: 'Cathay Pacific', TK: 'Turkish Airlines', LX: 'Swiss',
    OS: 'Austrian Airlines', IB: 'Iberia', AZ: 'ITA Airways',
    SK: 'SAS', AY: 'Finnair', SN: 'Brussels Airlines',
    TP: 'TAP Air Portugal', U2: 'easyJet', FR: 'Ryanair',
    VY: 'Vueling', W6: 'Wizz Air', G3: 'Gol',
    AI: 'Air India', '6E': 'IndiGo', SG: 'SpiceJet',
    UK: 'Vistara', IX: 'Air India Express',
    QF: 'Qantas', NZ: 'Air New Zealand', NH: 'ANA',
    JL: 'Japan Airlines', MH: 'Malaysia Airlines',
    TG: 'Thai Airways', GA: 'Garuda Indonesia',
    SA: 'South African Airways', ET: 'Ethiopian Airlines',
    MS: 'EgyptAir', RJ: 'Royal Jordanian',
  };

  const results = (data.data || []).map((offer: any): FlightOption => {
    const itinerary = offer.itineraries[0];
    const seg       = itinerary.segments[0];
    const lastSeg   = itinerary.segments[itinerary.segments.length - 1];
    const carrier   = seg.carrierCode;
    return {
      id:             offer.id,
      airline:        AIRLINE_NAMES[carrier] || carrier,
      airlineCode:    carrier,
      flightNumber:   `${carrier}${seg.number}`,
      origin:         seg.departure.iataCode,
      destination:    lastSeg.arrival.iataCode,
      departure:      seg.departure.at,
      arrival:        lastSeg.arrival.at,
      duration:       itinerary.duration,
      stops:          itinerary.segments.length - 1,
      cabin:          offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin || 'ECONOMY',
      price:          parseFloat(offer.price.total),
      currency:       offer.price.currency,
      bookingClass:   offer.travelerPricings[0]?.fareDetailsBySegment[0]?.class || 'Y',
      loyaltyMiles:   Math.round(parseFloat(offer.price.total) * 5),
      co2kg:          Math.round(parseFloat(offer.price.total) * 0.8),
      deepLink:       buildDeepLink(carrier, seg, lastSeg, intent),
    };
  });

  // Cache for 15 minutes
  setCached(cacheKey, results, 15 * 60 * 1000);
  return results;
}

// ── Build direct booking deep links for major airlines ──────────────────────
function buildDeepLink(carrier: string, seg: any, lastSeg: any, intent: TripIntent): string {
  const from    = seg.departure.iataCode;
  const to      = lastSeg.arrival.iataCode;
  const depDate = intent.departureDate;
  const retDate = intent.returnDate || '';
  const pax     = intent.travelers || 1;

  const links: Record<string, string> = {
    EK: `https://www.emirates.com/english/book/flights/?fromCity=${from}&toCity=${to}&departureDate=${depDate}&returnDate=${retDate}&adults=${pax}`,
    EY: `https://www.etihad.com/en/fly-etihad/book?origin=${from}&destination=${to}&departureDate=${depDate}&adults=${pax}`,
    QR: `https://www.qatarairways.com/en/booking/flight-search.html?widget=QR&searchType=F&tripType=R&fromStation=${from}&toStation=${to}&departing=${depDate}&returning=${retDate}&adults=${pax}`,
    BA: `https://www.britishairways.com/travel/book/public/en_gb?eId=106007&from=${from}&to=${to}&depart=${depDate}&ret=${retDate}&adultcount=${pax}`,
    LH: `https://www.lufthansa.com/gb/en/flight-search?origin=${from}&destination=${to}&outwardDate=${depDate}&returnDate=${retDate}&adults=${pax}`,
    AF: `https://wwws.airfrance.fr/search/offers?pax=ADT:${pax}&cabins=M&segments=seg0:(orig:${from})_(dest:${to})_(dep:${depDate})`,
    KL: `https://www.klm.com/search/offers?pax=ADT:${pax}&cabins=M&segments=seg0:(orig:${from})_(dest:${to})_(dep:${depDate})`,
    UA: `https://www.united.com/ual/en/us/flight-search/book-a-flight/results/afs?f=${from}&t=${to}&d=${depDate}&tt=1&sc=7&px=${pax}`,
    AA: `https://www.aa.com/booking/choose-flights/1?locale=en_US&pax=${pax}&adult=${pax}&type=OneWay&searchType=Book&cabin=&carriers=AA&slices=[{"orig":"${from}","origNearby":false,"dest":"${to}","destNearby":false,"date":"${depDate}"}]`,
    DL: `https://www.delta.com/flight-search/book-a-flight#/results?cacheKeySuffix=fromAirportCode=${from}&toAirportCode=${to}&departureDate=${depDate}&paxCount=${pax}`,
  };

  // Fallback to Google Flights
  return links[carrier] ||
    `https://www.google.com/flights?hl=en#flt=${from}.${to}.${depDate};c:USD;e:1;s:0*0;sd:1;t:f`;
}

// ── Hotel Search (cache 30 min) ─────────────────────────────────────────────
export async function searchHotels(intent: TripIntent): Promise<HotelOption[]> {
  try {
    const token = await getAccessToken();
    const destCode = await resolveIATA(token, intent.destination);

    const checkIn  = intent.departureDate;
    const checkOut = intent.returnDate && intent.returnDate.trim()
      ? intent.returnDate
      : new Date(new Date(checkIn).getTime() + 3 * 86400000).toISOString().slice(0, 10);

    const cacheKey = `hotels:${destCode}:${checkIn}:${checkOut}:${intent.travelers || 1}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const listRes = await fetch(
      `${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${destCode}&ratings=3,4,5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const listData = await listRes.json();
    const hotelIds = (listData.data || []).slice(0, 20).map((h: any) => h.hotelId).join(',');
    if (!hotelIds) return [];

    const offersRes = await fetch(
      `${AMADEUS_BASE}/v3/shopping/hotel-offers?hotelIds=${hotelIds}&checkInDate=${checkIn}&checkOutDate=${checkOut}&adults=${intent.travelers || 1}&currencyCode=${intent.currency || 'USD'}&bestRateOnly=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const offersData = await offersRes.json();
    const nights = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000 || 1;

    const results = (offersData.data || []).slice(0, 5).map((item: any): HotelOption => {
      const offer = item.offers[0];
      const ppn   = parseFloat(offer?.price?.base || offer?.price?.total || '0');
      return {
        id:            item.hotel.hotelId,
        name:          item.hotel.name,
        stars:         parseInt(item.hotel.rating) || 3,
        address:       item.hotel.address?.lines?.join(', ') || '',
        checkIn,
        checkOut,
        pricePerNight: ppn,
        totalPrice:    ppn * nights,
        currency:      offer?.price?.currency || 'USD',
        rating:        parseFloat(item.hotel.rating || '3'),
        amenities:     item.hotel.amenities || [],
      };
    });

    setCached(cacheKey, results, 30 * 60 * 1000);
    return results;
  } catch (e) {
    console.warn('Hotel search failed, returning empty:', e);
    return [];
  }
}

// ── Flight Booking (no caching — always fresh) ──────────────────────────────
export async function createFlightOrder(offerId: string, travelerInfo: object) {
  const token = await getAccessToken();
  const res = await fetch(`${AMADEUS_BASE}/v1/booking/flight-orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { type: 'flight-order', flightOffers: [{ id: offerId }], travelers: [travelerInfo] },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Booking failed: ${JSON.stringify(data.errors)}`);
  return {
    pnr:                data.data.associatedRecords?.[0]?.reference || data.data.id,
    confirmationNumber: data.data.id,
  };
}
// force
