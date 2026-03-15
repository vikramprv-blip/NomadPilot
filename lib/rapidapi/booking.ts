/**
 * Booking.com via RapidAPI (DataCrawler/booking-com15)
 * Add to Vercel env: RAPIDAPI_KEY=your_key
 */

const BASE    = 'https://booking-com15.p.rapidapi.com/api/v1';
const HEADERS = {
  'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY!,
  'X-RapidAPI-Host': 'booking-com15.p.rapidapi.com',
};

export interface BookingHotel {
  id:            string;
  name:          string;
  stars:         number;
  rating:        number;   // 0–10
  reviewCount:   number;
  pricePerNight: number;
  currency:      string;
  address:       string;
  imageUrl?:     string;
  bookingUrl:    string;
}

export interface BookingFlight {
  id:          string;
  airline:     string;
  departure:   string;
  arrival:     string;
  duration:    string;
  stops:       number;
  price:       number;
  currency:    string;
  bookingUrl:  string;
}

// ─── Search hotels ────────────────────────────────────────────────────────────
export async function searchBookingHotels(params: {
  destination: string;
  checkIn:     string;   // YYYY-MM-DD
  checkOut:    string;
  adults:      number;
  currency?:   string;
}): Promise<BookingHotel[]> {
  try {
    // Step 1: resolve destination → dest_id
    const locRes = await fetch(
      `${BASE}/hotels/searchDestination?query=${encodeURIComponent(params.destination)}`,
      { headers: HEADERS }
    );
    const locData = await locRes.json();
    const destId  = locData?.data?.[0]?.dest_id;
    const destType = locData?.data?.[0]?.search_type || 'city';
    if (!destId) return [];

    // Step 2: search hotels
    const url = new URL(`${BASE}/hotels/searchHotels`);
    url.searchParams.set('dest_id',      destId);
    url.searchParams.set('search_type',  destType);
    url.searchParams.set('arrival_date', params.checkIn);
    url.searchParams.set('departure_date', params.checkOut);
    url.searchParams.set('adults',       String(params.adults));
    url.searchParams.set('currency_code', params.currency || 'USD');
    url.searchParams.set('languagecode', 'en-us');
    url.searchParams.set('room_qty',     '1');

    const res  = await fetch(url.toString(), { headers: HEADERS });
    const data = await res.json();

    return (data?.data?.hotels || []).slice(0, 8).map((h: any): BookingHotel => {
      const priceRaw = h?.property?.priceBreakdown?.grossPrice?.value || 0;
      const nights   = Math.max(1,
        (new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) / 86400000
      );
      return {
        id:            String(h?.hotel_id || h?.property?.id || Math.random()),
        name:          h?.property?.name || 'Hotel',
        stars:         h?.property?.propertyClass || 3,
        rating:        h?.property?.reviewScore || 0,
        reviewCount:   h?.property?.reviewCount || 0,
        pricePerNight: Math.round(priceRaw / nights),
        currency:      params.currency || 'USD',
        address:       h?.property?.wishlistName || params.destination,
        imageUrl:      h?.property?.photoUrls?.[0],
        bookingUrl:    `https://www.booking.com/hotel/search.html?dest_id=${destId}&checkin=${params.checkIn}&checkout=${params.checkOut}&group_adults=${params.adults}`,
      };
    });
  } catch (err) {
    console.error('[Booking.com API]', err);
    return [];
  }
}

// ─── Search flights ───────────────────────────────────────────────────────────
export async function searchBookingFlights(params: {
  origin:      string;   // IATA
  destination: string;   // IATA
  date:        string;   // YYYY-MM-DD
  returnDate?: string;
  adults:      number;
  cabin?:      string;
  currency?:   string;
}): Promise<BookingFlight[]> {
  try {
    const url = new URL(`${BASE}/flights/searchFlights`);
    url.searchParams.set('fromId',         `${params.origin}.AIRPORT`);
    url.searchParams.set('toId',           `${params.destination}.AIRPORT`);
    url.searchParams.set('departDate',     params.date);
    if (params.returnDate) url.searchParams.set('returnDate', params.returnDate);
    url.searchParams.set('adults',         String(params.adults));
    url.searchParams.set('currency_code',  params.currency || 'USD');
    url.searchParams.set('cabinClass',     params.cabin || 'ECONOMY');

    const res  = await fetch(url.toString(), { headers: HEADERS });
    const data = await res.json();

    const offers = data?.data?.flightOffers || data?.data?.flights || [];
    return offers.slice(0, 10).map((f: any, i: number): BookingFlight => {
      const seg      = f?.segments?.[0] || f?.legs?.[0] || {};
      const firstLeg = seg?.legs?.[0] || seg;
      const lastLeg  = seg?.legs?.[seg?.legs?.length - 1] || seg;
      return {
        id:         f?.token || String(i),
        airline:    firstLeg?.carriersData?.[0]?.code || firstLeg?.airlineCode || 'XX',
        departure:  firstLeg?.departureTime || firstLeg?.departure?.time || '',
        arrival:    lastLeg?.arrivalTime    || lastLeg?.arrival?.time   || '',
        duration:   seg?.totalTime ? `PT${Math.floor(seg.totalTime/60)}H${seg.totalTime%60}M` : '',
        stops:      (seg?.legs?.length || 1) - 1,
        price:      f?.priceBreakdown?.total?.units || f?.price?.total || 0,
        currency:   params.currency || 'USD',
        bookingUrl: `https://www.booking.com/flights/`,
      };
    });
  } catch (err) {
    console.error('[Booking.com Flights API]', err);
    return [];
  }
}

// ── Reverse IATA → city name for hotel search ─────────────────────────────
export const IATA_TO_CITY: Record<string, string> = {
  AGP: 'Malaga', BCN: 'Barcelona', MAD: 'Madrid', LHR: 'London',
  CDG: 'Paris', AMS: 'Amsterdam', FRA: 'Frankfurt', MUC: 'Munich',
  DXB: 'Dubai', AUH: 'Abu Dhabi', DOH: 'Doha', SIN: 'Singapore',
  BKK: 'Bangkok', HKG: 'Hong Kong', NRT: 'Tokyo', ICN: 'Seoul',
  SYD: 'Sydney', JFK: 'New York', LAX: 'Los Angeles', ORD: 'Chicago',
  MIA: 'Miami', SFO: 'San Francisco', DEL: 'New Delhi', BOM: 'Mumbai',
  BLR: 'Bangalore', CCU: 'Kolkata', MAA: 'Chennai', HYD: 'Hyderabad',
  IST: 'Istanbul', ATH: 'Athens', FCO: 'Rome', MXP: 'Milan',
  VIE: 'Vienna', ZRH: 'Zurich', LIS: 'Lisbon', BRU: 'Brussels',
  CPH: 'Copenhagen', ARN: 'Stockholm', OSL: 'Oslo', HEL: 'Helsinki',
  WAW: 'Warsaw', PRG: 'Prague', BUD: 'Budapest', YYZ: 'Toronto',
  YVR: 'Vancouver', GRU: 'Sao Paulo', EZE: 'Buenos Aires', SCL: 'Santiago',
  NBO: 'Nairobi', JNB: 'Johannesburg', CAI: 'Cairo', CMN: 'Casablanca',
  KUL: 'Kuala Lumpur', CGK: 'Jakarta', MNL: 'Manila', DPS: 'Bali',
  BLL: 'Billund', GOI: 'Goa', CMB: 'Colombo', KTM: 'Kathmandu',
};

export function iataToCity(iata: string): string {
  return IATA_TO_CITY[iata.toUpperCase()] || iata;
}
