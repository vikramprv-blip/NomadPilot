// Amadeus GDS / NDC Integration
// Docs: https://developers.amadeus.com

import { FlightOption, HotelOption, TripIntent } from '@/types';

const AMADEUS_BASE = 'https://test.api.amadeus.com'; // swap to production URL when live

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

// ─── Flight Search ────────────────────────────────────────────────────────────

export async function searchFlights(intent: TripIntent): Promise<FlightOption[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    originLocationCode: intent.origin,
    destinationLocationCode: intent.destination,
    departureDate: intent.departureDate,
    returnDate: intent.returnDate,
    adults: String(intent.travelers),
    travelClass: (intent.preferences.cabinClass || 'ECONOMY').toUpperCase(),
    max: '10',
    currencyCode: intent.currency || 'USD',
  });

  const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Flight search failed: ${JSON.stringify(data.errors)}`);

  return (data.data || []).map((offer: any): FlightOption => {
    const seg = offer.itineraries[0].segments[0];
    return {
      id: offer.id,
      airline: seg.carrierCode,
      flightNumber: `${seg.carrierCode}${seg.number}`,
      origin: seg.departure.iataCode,
      destination: seg.arrival.iataCode,
      departure: seg.departure.at,
      arrival: seg.arrival.at,
      duration: offer.itineraries[0].duration,
      stops: offer.itineraries[0].segments.length - 1,
      cabin: offer.travelerPricings[0].fareDetailsBySegment[0].cabin,
      price: parseFloat(offer.price.total),
      currency: offer.price.currency,
      bookingClass: offer.travelerPricings[0].fareDetailsBySegment[0].class,
    };
  });
}

// ─── Hotel Search ─────────────────────────────────────────────────────────────

export async function searchHotels(intent: TripIntent): Promise<HotelOption[]> {
  const token = await getAccessToken();

  // Step 1: Get hotel list by city
  const listRes = await fetch(
    `${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${intent.destination}&ratings=${intent.preferences.hotelStars || 3}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();
  const hotelIds = (listData.data || [])
    .slice(0, 20)
    .map((h: any) => h.hotelId)
    .join(',');

  if (!hotelIds) return [];

  // Step 2: Get offers for those hotels
  const offersRes = await fetch(
    `${AMADEUS_BASE}/v3/shopping/hotel-offers?hotelIds=${hotelIds}&checkInDate=${intent.departureDate}&checkOutDate=${intent.returnDate}&adults=${intent.travelers}&currencyCode=${intent.currency || 'USD'}&bestRateOnly=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const offersData = await offersRes.json();

  return (offersData.data || []).slice(0, 5).map((item: any): HotelOption => {
    const offer = item.offers[0];
    const nights =
      (new Date(intent.returnDate).getTime() - new Date(intent.departureDate).getTime()) /
      86400000;
    const ppn = parseFloat(offer.price.base || offer.price.total);
    return {
      id: item.hotel.hotelId,
      name: item.hotel.name,
      stars: item.hotel.rating || 3,
      address: item.hotel.address?.lines?.join(', ') || '',
      checkIn: intent.departureDate,
      checkOut: intent.returnDate,
      pricePerNight: ppn,
      totalPrice: ppn * nights,
      currency: offer.price.currency,
      rating: parseFloat(item.hotel.rating || '3'),
      amenities: item.hotel.amenities || [],
    };
  });
}

// ─── Flight Order (Booking) ───────────────────────────────────────────────────

export async function createFlightOrder(
  offerId: string,
  travelerInfo: object
): Promise<{ pnr: string; confirmationNumber: string }> {
  const token = await getAccessToken();

  const res = await fetch(`${AMADEUS_BASE}/v1/booking/flight-orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'flight-order',
        flightOffers: [{ id: offerId }],
        travelers: [travelerInfo],
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Booking failed: ${JSON.stringify(data.errors)}`);

  return {
    pnr: data.data.associatedRecords?.[0]?.reference || data.data.id,
    confirmationNumber: data.data.id,
  };
}
