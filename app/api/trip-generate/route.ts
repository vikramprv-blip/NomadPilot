import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, searchHotels } from '@/lib/amadeus';
import { searchKiwiFlights, KiwiFlight } from '@/lib/rapidapi/kiwi';
import { searchBookingHotels, searchBookingFlights, BookingFlight, iataToCity } from '@/lib/rapidapi/booking';
import { createClient } from '@/lib/supabase/server';
import { TripIntent, Itinerary, FlightOption, HotelOption } from '@/types';
import { nanoid } from 'nanoid';

// --- Helper: Safe Date Parser ---
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
  const totalCost = flights.reduce((sum, f) => sum + f.price, 0) + (hotel?.totalPrice || 0);
  const budget = intent.budget || 9999999;

  const priceScore       = Math.max(0, 100 - (totalCost / budget) * 100);
  const timeScore        = flight.stops === 0 ? 100 : flight.stops === 1 ? 70 : 40;
  const convenienceScore = hotel ? hotel.rating * 20 : 60;
  const loyaltyScore     = (flight.loyaltyMiles || 0) > 1000 ? 80 : 50;
  const esgScore         = intent.preferences?.esgPreference
    ? Math.max(0, 100 - (flight.co2kg || 200) / 5)
    : 50;

  const overall = (priceScore + timeScore + convenienceScore + loyaltyScore + esgScore) / 5;

  return {
    score: {
      overall:      Math.round(overall),
      price:        Math.round(priceScore),
      time:         Math.round(timeScore),
      convenience:  Math.round(convenienceScore),
      loyalty:      Math.round(loyaltyScore),
      esg:          Math.round(esgScore),
    },
    totalCost,
  };
}

// ── Search a single one-way leg ───────────────────────────────────────────────
async function searchOneLeg(
  from: string,
  to: string,
  date: string,
  cabin: string,
  intent: TripIntent,
  hasRapidAPI: boolean,
): Promise<FlightOption[]> {
  let results: FlightOption[] = [];

  // 1. Try Kiwi — one-way only (no returnDate)
  if (hasRapidAPI) {
    try {
      const kiwiRes = await searchKiwiFlights({
        origin:      from,
        destination: to,
        date,
        returnDate:  undefined,   // ✅ always one-way per leg
        adults:      intent.travelers || 1,
        cabin,
        currency:    intent.currency || 'USD',
      });
      results = kiwiRes.map(kiwiToFlight);
    } catch (e) {
      console.error(`Kiwi leg error (${from}→${to}):`, e);
    }
  }

  // 2. Fallback to Amadeus — one-way only
  if (results.length === 0) {
    try {
      results = await searchFlights({
        ...intent,
        origin:        from,
        destination:   to,
        departureDate: date,
        returnDate:    '',        // ✅ always one-way per leg
        preferences: { ...intent.preferences, cabinClass: cabin as 'economy' | 'premium_economy' | 'business' | 'first' },
      });
    } catch (e) {
      console.error(`Amadeus leg error (${from}→${to}):`, e);
    }
  }

  // 3. Placeholder if no results
  if (results.length === 0) {
    results = [{
      id:           `gf-${from}-${to}-${date}`,
      airline:      'Multiple Airlines',
      flightNumber: 'Search Live',
      origin:       from,
      destination:  to,
      departure:    '—',
      arrival:      '—',
      duration:     '—',
      stops:        0,
      price:        0,
      currency:     intent.currency || 'USD',
      cabin:        cabin || 'economy',
      bookingUrl:   `https://www.google.com/travel/flights?q=flights+from+${from}+to+${to}+on+${date}`,
      isPlaceholder: true,
    } as any];
  }

  return results.slice(0, 8);
}

export async function POST(req: NextRequest) {
  try {
    const { intent, tripId } = await req.json() as { intent: TripIntent; tripId?: string };

    const services    = (intent.services && intent.services.length > 0) ? intent.services : ['flight', 'hotel'];
    const needsHotel  = services.includes('hotel');
    const hasRapidAPI = !!process.env.RAPIDAPI_KEY;

    const baseDepartureDate = toISODate(intent.departureDate);
    const returnDate        = intent.returnDate ? toISODate(intent.returnDate) : null;

    // ── Determine trip type ──────────────────────────────────────────────────
    const isMultiCity = (intent as any).tripType === 'multicity' && (intent as any).legs?.length > 1;
    const isReturn    = !isMultiCity && !!returnDate;

    // ── Build leg definitions ────────────────────────────────────────────────
    // Each leg is searched independently as a ONE-WAY flight.
    // For return trips: leg 0 = outbound, leg 1 = inbound.
    const intentLegs: Array<{ from: string; to: string; date: string; cabinClass: string }> =
      isMultiCity
        ? (intent as any).legs.map((l: any) => ({
            from:       l.from || l.origin,
            to:         l.to   || l.destination,
            date:       toISODate(l.date),
            cabinClass: l.cabinClass || intent.preferences?.cabinClass || 'economy',
          }))
        : isReturn
          ? [
              // Outbound leg
              {
                from:       intent.origin!,
                to:         intent.destination!,
                date:       baseDepartureDate,
                cabinClass: intent.preferences?.cabinClass || 'economy',
              },
              // Inbound leg
              {
                from:       intent.destination!,
                to:         intent.origin!,
                date:       returnDate!,
                cabinClass: intent.preferences?.cabinClass || 'economy',
              },
            ]
          : [
              // One-way
              {
                from:       intent.origin!,
                to:         intent.destination!,
                date:       baseDepartureDate,
                cabinClass: intent.preferences?.cabinClass || 'economy',
              },
            ];

    // ── Search all legs in parallel (each is one-way) ────────────────────────
    const legFlightResults: FlightOption[][] = await Promise.all(
      intentLegs.map(async (leg, legIdx) => {
        const flights = await searchOneLeg(
          leg.from, leg.to, leg.date, leg.cabinClass, intent, hasRapidAPI,
        );
        // Tag each flight with its leg index for the UI
        return flights.map(f => ({
          ...f,
          legIndex: legIdx,
          legLabel: isMultiCity || isReturn
            ? `${isReturn ? (legIdx === 0 ? 'Outbound' : 'Return') : `Leg ${legIdx + 1}`}: ${leg.from} → ${leg.to}`
            : undefined,
        }));
      })
    );

    // ── Hotels ───────────────────────────────────────────────────────────────
    const hotelCity    = iataToCity((intent as any).hotelDestination || intent.destination);
    const hotelNights  = (intent as any).nights || 3;
    const hotelCheckIn = isMultiCity
      ? toISODate(intentLegs[intentLegs.length - 1]?.date || baseDepartureDate)
      : baseDepartureDate;
    const checkOut = returnDate
      ? returnDate
      : new Date(new Date(hotelCheckIn).getTime() + hotelNights * 86400000)
          .toISOString().slice(0, 10);

    let hotels: HotelOption[] = [];
    if (needsHotel && hasRapidAPI) {
      try {
        const bkgHotels = await searchBookingHotels({
          destination: hotelCity,
          checkIn:     hotelCheckIn,
          checkOut,
          adults:      intent.travelers || 1,
          currency:    intent.currency || 'USD',
        });
        hotels = bkgHotels.map(bookingToHotel);
      } catch (e) { console.error('Booking.com hotel error:', e); }
    }
    if (needsHotel && hotels.length === 0) {
      try {
        hotels = await searchHotels({
          ...intent,
          destination:   hotelCity,
          departureDate: hotelCheckIn,
          returnDate:    checkOut,
        });
      } catch (e) { console.error('Amadeus hotel error:', e); }
    }

    // ── Build Itineraries ────────────────────────────────────────────────────
    const itineraries: Itinerary[] = [];
    const hotelOptions = hotels.slice(0, 3);

    if (isMultiCity) {
      // Multi-city: pair one flight per leg into combo itineraries
      const perLeg    = legFlightResults.map(res => res.slice(0, 3));
      const maxCombos = Math.min(5, Math.max(1, ...perLeg.map(r => r.length)));

      for (let i = 0; i < maxCombos; i++) {
        const comboFlights = perLeg
          .map((legRes, legIdx) => legRes[Math.min(i, legRes.length - 1)] || legFlightResults[legIdx]?.[0] || null)
          .filter(Boolean) as FlightOption[];
        if (comboFlights.length === 0) continue;

        const selectedHotel = needsHotel ? (hotelOptions[i % Math.max(hotelOptions.length, 1)] || null) : null;
        const { score, totalCost } = scoreItinerary(comboFlights, selectedHotel, intent);
        itineraries.push({
          id: nanoid(), score,
          flights:     comboFlights,
          hotels:      selectedHotel ? [selectedHotel] : [],
          ground:      [],
          totalCost,
          currency:    comboFlights[0]?.currency || intent.currency || 'USD',
          visaRequired: false,
          summary:     `Multi-city option ${i + 1}`,
        });
      }

    } else if (isReturn) {
      // Return trip: pair outbound[i] + inbound[i] into each itinerary
      const outboundOptions = legFlightResults[0] || [];
      const inboundOptions  = legFlightResults[1] || [];
      const maxOptions      = Math.min(10, Math.max(outboundOptions.length, inboundOptions.length));

      for (let i = 0; i < maxOptions; i++) {
        const outFlight  = outboundOptions[Math.min(i, outboundOptions.length - 1)];
        const inFlight   = inboundOptions[Math.min(i, inboundOptions.length - 1)];
        if (!outFlight) continue;

        // Include inbound only if it exists and isn't a placeholder
        const flightPair = inFlight && !(inFlight as any).isPlaceholder
          ? [outFlight, inFlight]
          : [outFlight];

        const selectedHotel = needsHotel ? (hotelOptions[i % Math.max(hotelOptions.length, 1)] || null) : null;
        const { score, totalCost } = scoreItinerary(flightPair, selectedHotel, intent);

        itineraries.push({
          id: nanoid(), score,
          flights:     flightPair,    // ✅ both legs stored together
          hotels:      selectedHotel ? [selectedHotel] : [],
          ground:      [],
          totalCost,
          currency:    outFlight.currency || intent.currency || 'USD',
          visaRequired: false,
          summary:     selectedHotel
            ? `Option ${i + 1}: ${outFlight.airline} + ${selectedHotel.name}`
            : `Option ${i + 1}: ${outFlight.airline}`,
        });
      }

    } else {
      // One-way: one flight per itinerary
      const flightOptions = legFlightResults[0]?.slice(0, 10) || [];

      for (let i = 0; i < flightOptions.length; i++) {
        const selectedFlight = flightOptions[i];
        const selectedHotel  = needsHotel ? (hotelOptions[i % Math.max(hotelOptions.length, 1)] || null) : null;
        const { score, totalCost } = scoreItinerary([selectedFlight], selectedHotel, intent);

        itineraries.push({
          id: nanoid(), score,
          flights:     [selectedFlight],
          hotels:      selectedHotel ? [selectedHotel] : [],
          ground:      [],
          totalCost,
          currency:    selectedFlight.currency || intent.currency || 'USD',
          visaRequired: false,
          summary:     selectedHotel
            ? `Option ${i + 1}: ${selectedFlight.airline} + ${selectedHotel.name}`
            : `Option ${i + 1}: ${selectedFlight.airline}`,
        });
      }
    }

    itineraries.sort((a, b) => b.score.overall - a.score.overall);

    // ── Persist to Supabase ──────────────────────────────────────────────────
    if (tripId) {
      const supabase = createClient();
      await supabase
        .from('trips')
        .update({
          itineraries,
          stage:      'optimization',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tripId);
    }

    return NextResponse.json({ itineraries, cars: [] });

  } catch (err: any) {
    console.error('Trip generation error:', err);
    return NextResponse.json({ error: err.message || 'Trip generation failed' }, { status: 500 });
  }
}
