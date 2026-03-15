import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, searchHotels } from '@/lib/amadeus';
import { searchKiwiFlights, KiwiFlight } from '@/lib/rapidapi/kiwi';
import { searchBookingHotels, searchBookingFlights, BookingFlight, iataToCity } from '@/lib/rapidapi/booking';
import { createClient } from '@/lib/supabase/server';
import { TripIntent, Itinerary, FlightOption, HotelOption } from '@/types';
import { nanoid } from 'nanoid';

// --- Helper: Safe Date Parser ---
// Prevents "Invalid time value" by validating the string before processing
function toISODate(dateInput: any): string {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  const d = new Date(dateInput);
  return isNaN(d.getTime()) 
    ? new Date().toISOString().split('T')[0] 
    : d.toISOString().split('T')[0];
}

// Convert Kiwi flight → FlightOption
function kiwiToFlight(k: KiwiFlight): FlightOption {
  const depTime = k.departure ? k.departure.slice(0, 16) : k.id;
  const stableId = `${k.flightNumber}-${k.origin}-${k.destination}-${depTime}`;
  return {
    id: stableId,
    airline: k.airline,
    flightNumber: k.flightNumber,
    origin: k.origin,
    destination: k.destination,
    departure: k.departure,
    arrival: k.arrival,
    duration: k.duration,
    stops: k.stops,
    cabin: k.cabin,
    price: k.price,
    currency: k.currency,
    bookingClass: 'Y',
    loyaltyMiles: Math.round(k.price * 5),
    co2kg: Math.round(k.price * 0.8),
    ...({ bookingUrl: (k as any).deepLink } as any),
  };
}

// Convert Booking hotel → HotelOption
function bookingToHotel(b: any): HotelOption {
  return {
    id: b.id,
    name: b.name,
    stars: b.stars || 3,
    rating: b.rating || 0,
    address: b.address || '',
    pricePerNight: b.pricePerNight || 0,
    totalPrice: b.pricePerNight || 0,
    currency: b.currency || 'USD',
    amenities: [],
    images: b.imageUrl ? [b.imageUrl] : [],
    bookingUrl: b.bookingUrl || '',
  };
}

function scoreItinerary(
  flights: FlightOption[],
  hotel: HotelOption | null,
  intent: TripIntent
): { score: any; totalCost: number } {
  const flight = flights[0];
  const totalCost = flight.price + (hotel?.totalPrice || 0);
  const budget = intent.budget || 9999999;

  const priceScore = Math.max(0, 100 - (totalCost / budget) * 100);
  const timeScore = flight.stops === 0 ? 100 : flight.stops === 1 ? 70 : 40;
  const convenienceScore = hotel ? hotel.rating * 20 : 60;
  const loyaltyScore = (flight.loyaltyMiles || 0) > 1000 ? 80 : 50;
  const esgScore = intent.preferences?.esgPreference
    ? Math.max(0, 100 - (flight.co2kg || 200) / 5)
    : 50;

  const overall = (priceScore + timeScore + convenienceScore + loyaltyScore + esgScore) / 5;

  return {
    score: {
      overall: Math.round(overall),
      price: Math.round(priceScore),
      time: Math.round(timeScore),
      convenience: Math.round(convenienceScore),
      loyalty: Math.round(loyaltyScore),
      esg: Math.round(esgScore),
    },
    totalCost,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { intent, tripId } = await req.json() as { intent: TripIntent; tripId?: string };

    const services = (intent.services && intent.services.length > 0)
      ? intent.services
      : ['flight', 'hotel'];
    const needsHotel = services.includes('hotel');
    const hasRapidAPI = !!process.env.RAPIDAPI_KEY;

    // Fix: Ensure Departure Date is safe for initial search
    const baseDepartureDate = toISODate(intent.departureDate);

    // ── Flights: per-leg search ──────────────────────────────────────────────
    const intentLegs: any[] = (intent as any).legs?.length > 0
      ? (intent as any).legs
      : [{ from: intent.origin, to: intent.destination, date: baseDepartureDate, cabinClass: intent.preferences?.cabinClass }];

    const isMultiCity = intentLegs.length > 1;

    // Search each leg independently (parallel)
    const legFlightResults: FlightOption[][] = await Promise.all(
      intentLegs.map(async (leg: any) => {
        const from = leg.from || intent.origin;
        const to = leg.to || intent.destination;
        const date = toISODate(leg.date || baseDepartureDate); // Safe Date per leg
        const cabin = leg.cabinClass || intent.preferences?.cabinClass || 'economy';
        let results: FlightOption[] = [];

        if (hasRapidAPI) {
          try {
            const kiwiRes = await searchKiwiFlights({
              origin: from, destination: to, date,
              returnDate: isMultiCity ? undefined : (intent.returnDate ? toISODate(intent.returnDate) : undefined),
              adults: intent.travelers || 1, cabin, currency: intent.currency || 'USD',
            });
            results = kiwiRes.map(kiwiToFlight);
          } catch (e) { console.error('Kiwi leg error:', e); }
        }

        if (results.length === 0) {
          try {
            results = await searchFlights({
              ...intent,
              origin: from, destination: to, departureDate: date,
              returnDate: isMultiCity ? '' : (intent.returnDate ? toISODate(intent.returnDate) : ''),
              preferences: { ...intent.preferences, cabinClass: cabin },
            });
          } catch (e) { console.error('Amadeus leg error:', e); }
        }

        if (results.length === 0) {
          results = [{
            id: `gf-${from}-${to}-${date}`,
            airline: 'Multiple Airlines',
            flightNumber: 'Search Live',
            origin: from,
            destination: to,
            departure: '—',
            arrival: '—',
            duration: '—',
            stops: 0,
            price: 0,
            currency: intent.currency || 'USD',
            cabin: cabin || 'economy',
            bookingUrl: `https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyMDI2LTA1LTE1agwIAhIIL20vMDFmcnlyBwgBEgNMSFIaHhIKMjAyNi0wNS0xOWowBwgBEgNMSFJyDAgCEggvbS8wMWZyeUABSAFwAYIBCzEwNjg0NjY0MDY0`,
            isPlaceholder: true,
          } as any];
        }

        return results.slice(0, 8).map((f: FlightOption) => ({
          ...f,
          legIndex: intentLegs.indexOf(leg),
          legLabel: isMultiCity ? `Leg ${intentLegs.indexOf(leg) + 1}: ${from} → ${to}` : undefined,
        }));
      })
    );

    let flights: FlightOption[] = legFlightResults.flat();

    // ── Hotels: Safe Calculation ──────────────────────────────────────────────
    const hotelCity = iataToCity((intent as any).hotelDestination || intent.destination);
    const hotelNights = (intent as any).nights || 3;

    // checkIn = last leg's date for multi-city, otherwise departure date
    const rawCheckIn = isMultiCity
      ? (intentLegs[intentLegs.length - 1]?.date || baseDepartureDate)
      : baseDepartureDate;
    
    const hotelCheckIn = toISODate(rawCheckIn);

    // checkOut = returnDate or checkIn + nights
    const checkOut = intent.returnDate?.trim()
      ? toISODate(intent.returnDate)
      : new Date(new Date(hotelCheckIn).getTime() + hotelNights * 86400000).toISOString().slice(0, 10);

    let hotels: HotelOption[] = [];
    if (needsHotel && hasRapidAPI) {
      try {
        const bkgHotels = await searchBookingHotels({
          destination: hotelCity,
          checkIn: hotelCheckIn,
          checkOut,
          adults: intent.travelers || 1,
          currency: intent.currency || 'USD',
        });
        hotels = bkgHotels.map(bookingToHotel);
      } catch (e) { console.error('Booking.com hotel error:', e); }
    }
    
    if (needsHotel && hotels.length === 0) {
      try {
        hotels = await searchHotels({ ...intent, destination: hotelCity, departureDate: hotelCheckIn, returnDate: checkOut });
      } catch (e) { console.error('Amadeus hotel error:', e); }
    }

    // ── Build Itineraries ────────────────────────────────────────────────────
    const itineraries: Itinerary[] = [];
    const hotelOptions = hotels.slice(0, 3);

    if (isMultiCity) {
      const perLeg = legFlightResults.map(res => res.slice(0, 3));
      const maxCombos = Math.min(5, Math.max(...perLeg.map(r => r.length)));
      for (let i = 0; i < maxCombos; i++) {
        const comboFlights = perLeg.map((legRes, legIdx) => legRes[Math.min(i, legRes.length - 1)] || legFlightResults[legIdx]?.[0] || null).filter(Boolean);
        if (comboFlights.length === 0) continue;
        const selectedHotel = needsHotel ? (hotelOptions[i % Math.max(hotelOptions.length, 1)] || null) : null;
        const { score, totalCost } = scoreItinerary(comboFlights, selectedHotel, intent);
        itineraries.push({
          id: nanoid(), score,
          flights: comboFlights,
          hotels: selectedHotel ? [selectedHotel] : [],
          ground: [], totalCost,
          currency: comboFlights[0]?.currency || intent.currency || 'USD',
          visaRequired: false,
          summary: `Multi-city option ${i + 1}`,
        });
      }
    } else {
      const flightOptions = flights.slice(0, 10);
      for (let i = 0; i < flightOptions.length; i++) {
        const selectedFlight = flightOptions[i];
        const selectedHotel = needsHotel ? (hotelOptions[i % Math.max(hotelOptions.length, 1)] || null) : null;
        const { score, totalCost } = scoreItinerary([selectedFlight], selectedHotel, intent);
        itineraries.push({
          id: nanoid(), score,
          flights: [selectedFlight],
          hotels: selectedHotel ? [selectedHotel] : [],
          ground: [], totalCost,
          currency: selectedFlight.currency,
          visaRequired: false,
          summary: selectedHotel
            ? `Option ${i + 1}: ${selectedFlight.airline} + ${selectedHotel.name}`
            : `Option ${i + 1}: ${selectedFlight.airline}`,
        });
      }
    }

    itineraries.sort((a, b) => b.score.overall - a.score.overall);

    if (tripId) {
      const supabase = createClient();
      await supabase
        .from('trips')
        .update({ itineraries, stage: 'optimization', updated_at: new Date().toISOString() })
        .eq('id', tripId);
    }

    return NextResponse.json({ itineraries, cars: [] });
  } catch (err: any) {
    console.error('Trip generation error:', err);
    return NextResponse.json({ error: err.message || 'Trip generation failed' }, { status: 500 });
  }
}
