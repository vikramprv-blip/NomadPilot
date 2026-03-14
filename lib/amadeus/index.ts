import { FlightOption, HotelOption, TripIntent } from '@/types';

const AMADEUS_BASE = 'https://test.api.amadeus.com';

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_API_KEY!,
      client_secret: process.env.AMADEUS_API_SECRET!,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Amadeus auth failed: ${data.error_description}`);
  return data.access_token;
}

// ─── City name → IATA code lookup ────────────────────────────────────────────
export async function resolveIATA(token: string, query: string): Promise<string> {
  // If already looks like an IATA code (2-3 uppercase letters), use as-is
  if (/^[A-Z]{3}$/.test(query.trim())) return query.trim();

  try {
    const res = await fetch(
      `${AMADEUS_BASE}/v1/reference-data/locations?keyword=${encodeURIComponent(query)}&subType=AIRPORT,CITY&page[limit]=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const iata = data.data?.[0]?.iataCode;
    if (iata) return iata;
  } catch {}

  // Fallback: common cities map
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
  };
  const lower = query.toLowerCase().trim();
  return CITY_MAP[lower] || query.toUpperCase().slice(0, 3);
}

// ─── Flight Search ────────────────────────────────────────────────────────────
export async function searchFlights(intent: TripIntent): Promise<FlightOption[]> {
  const token = await getAccessToken();

  // Resolve city names to IATA codes
  const [originCode, destCode] = await Promise.all([
    resolveIATA(token, intent.origin),
    resolveIATA(token, intent.destination),
  ]);

  const cabinMap: Record<string, string> = {
    economy: 'ECONOMY', premium_economy: 'PREMIUM_ECONOMY',
    business: 'BUSINESS', first: 'FIRST',
  };

  const params: Record<string, string> = {
    originLocationCode:      originCode,
    destinationLocationCode: destCode,
    departureDate:           intent.departureDate,
    adults:                  String(intent.travelers || 1),
    travelClass:             cabinMap[intent.preferences?.cabinClass || 'economy'] || 'ECONOMY',
    max:                     '10',
    currencyCode:            intent.currency || 'USD',
  };

  // Only add returnDate if it's a round trip and date exists
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

  return (data.data || []).map((offer: any): FlightOption => {
    const itinerary = offer.itineraries[0];
    const seg       = itinerary.segments[0];
    const lastSeg   = itinerary.segments[itinerary.segments.length - 1];
    return {
      id:           offer.id,
      airline:      seg.carrierCode,
      flightNumber: `${seg.carrierCode}${seg.number}`,
      origin:       seg.departure.iataCode,
      destination:  lastSeg.arrival.iataCode,
      departure:    seg.departure.at,
      arrival:      lastSeg.arrival.at,
      duration:     itinerary.duration,
      stops:        itinerary.segments.length - 1,
      cabin:        offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin || 'ECONOMY',
      price:        parseFloat(offer.price.total),
      currency:     offer.price.currency,
      bookingClass: offer.travelerPricings[0]?.fareDetailsBySegment[0]?.class || 'Y',
      loyaltyMiles: Math.round(parseFloat(offer.price.total) * 5),
      co2kg:        Math.round(parseFloat(offer.price.total) * 0.8),
    };
  });
}

// ─── Hotel Search ─────────────────────────────────────────────────────────────
export async function searchHotels(intent: TripIntent): Promise<HotelOption[]> {
  try {
    const token = await getAccessToken();
    const destCode = await resolveIATA(token, intent.destination);

    // Step 1: Hotel list by city
    const listRes = await fetch(
      `${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${destCode}&ratings=3,4,5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const listData = await listRes.json();
    const hotelIds = (listData.data || []).slice(0, 20).map((h: any) => h.hotelId).join(',');
    if (!hotelIds) return [];

    // Step 2: Hotel offers — need a valid checkout date
    const checkIn  = intent.departureDate;
    const checkOut = intent.returnDate && intent.returnDate.trim()
      ? intent.returnDate
      : new Date(new Date(checkIn).getTime() + 3 * 86400000).toISOString().slice(0, 10);

    const offersRes = await fetch(
      `${AMADEUS_BASE}/v3/shopping/hotel-offers?hotelIds=${hotelIds}&checkInDate=${checkIn}&checkOutDate=${checkOut}&adults=${intent.travelers || 1}&currencyCode=${intent.currency || 'USD'}&bestRateOnly=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const offersData = await offersRes.json();
    const nights = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000 || 1;

    return (offersData.data || []).slice(0, 5).map((item: any): HotelOption => {
      const offer = item.offers[0];
      const ppn   = parseFloat(offer?.price?.base || offer?.price?.total || '0');
      return {
        id:           item.hotel.hotelId,
        name:         item.hotel.name,
        stars:        parseInt(item.hotel.rating) || 3,
        address:      item.hotel.address?.lines?.join(', ') || '',
        checkIn,
        checkOut,
        pricePerNight: ppn,
        totalPrice:    ppn * nights,
        currency:      offer?.price?.currency || 'USD',
        rating:        parseFloat(item.hotel.rating || '3'),
        amenities:     item.hotel.amenities || [],
      };
    });
  } catch (e) {
    console.warn('Hotel search failed, returning empty:', e);
    return [];
  }
}

// ─── Flight Booking ───────────────────────────────────────────────────────────
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
