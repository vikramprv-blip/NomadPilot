import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, searchHotels } from '@/lib/amadeus';
import { searchKiwiFlights, KiwiFlight } from '@/lib/rapidapi/kiwi';
import { searchBookingHotels, searchBookingFlights, BookingFlight } from '@/lib/rapidapi/booking';
import { createClient } from '@/lib/supabase/server';
import { TripIntent, Itinerary, FlightOption, HotelOption } from '@/types';
import { nanoid } from 'nanoid';

// Convert Kiwi flight → FlightOption
function kiwiToFlight(k: KiwiFlight): FlightOption {
  return {
    id:           k.id,
    airline:      k.airline,
    flightNumber: k.flightNumber,
    origin:       k.origin,
    destination:  k.destination,
    departure:    k.departure,
    arrival:      k.arrival,
    duration:     k.duration,
    stops:        k.stops,
    cabin:        k.cabin,
    price:        k.price,
    currency:     k.currency,
    bookingClass: 'Y',
    loyaltyMiles: Math.round(k.price * 5),
    co2kg:        Math.round(k.price * 0.8),
  };
}

// Convert Booking hotel → HotelOption
function bookingToHotel(b: any): HotelOption {
  return {
    id:            b.id,
    name:          b.name,
    stars:         b.stars || 3,
    rating:        b.rating || 0,
    address:       b.address || '',
    pricePerNight: b.pricePerNight || 0,
    totalPrice:    b.pricePerNight || 0,
    currency:      b.currency || 'USD',
    amenities:     [],
    images:        b.imageUrl ? [b.imageUrl] : [],
    bookingUrl:    b.bookingUrl || '',
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

export async function POST(req: NextRequest) {
  try {
    const { intent, tripId } = await req.json() as { intent: TripIntent; tripId?: string };

    const services = (intent.services && intent.services.length > 0)
      ? intent.services
      : ['flight', 'hotel'];
    const needsHotel  = services.includes('hotel');

    const hasRapidAPI = !!process.env.RAPIDAPI_KEY;

    // ── Flights: per-leg search ──────────────────────────────────────────────
    const intentLegs: any[] = (intent as any).legs?.length > 0
      ? (intent as any).legs
      : [{ from: intent.origin, to: intent.destination, date: intent.departureDate, cabinClass: intent.preferences?.cabinClass }];

    const isMultiCity = intentLegs.length > 1;

    // Search each leg independently (parallel)
    const legFlightResults: FlightOption[][] = await Promise.all(
      intentLegs.map(async (leg: any) => {
        const from      = leg.from || intent.origin;
        const to        = leg.to   || intent.destination;
        const date      = leg.date || intent.departureDate;
        const cabin     = leg.cabinClass || intent.preferences?.cabinClass || 'economy';
        let results: FlightOption[] = [];

        if (hasRapidAPI) {
          try {
            const kiwiRes = await searchKiwiFlights({
              origin: from, destination: to, date,
              returnDate: isMultiCity ? undefined : (intent.returnDate || undefined),
              adults: intent.travelers || 1, cabin, currency: intent.currency || 'USD',
            });
            results = kiwiRes.map(kiwiToFlight);
          } catch (e) { console.error('Kiwi leg error:', e); }
        }

        // Amadeus fallback per leg
        if (results.length === 0) {
          try {
            results = await searchFlights({
              ...intent,
              origin: from, destination: to, departureDate: date,
              returnDate: isMultiCity ? '' : intent.returnDate,
              preferences: { ...intent.preferences, cabinClass: cabin },
            });
          } catch (e) { console.error('Amadeus leg error:', e); }
        }

        // Tag each flight with its leg info
        return results.slice(0, 8).map((f: FlightOption) => ({
          ...f,
          legIndex: intentLegs.indexOf(leg),
          legLabel: isMultiCity ? `Leg ${intentLegs.indexOf(leg) + 1}: ${from} → ${to}` : undefined,
        }));
      })
    );

    // For multi-city: keep legs separate so UI can group them
    // For single: flatten normally
    let flights: FlightOption[] = legFlightResults.flat();

    // ── Hotels: Booking.com → fallback Amadeus ───────────────────────────────
    let hotels: HotelOption[] = [];
    if (needsHotel && hasRapidAPI) {
      const checkOut = intent.returnDate?.trim()
        ? intent.returnDate
        : new Date(new Date(intent.departureDate).getTime() + 3 * 86400000).toISOString().slice(0, 10);
      const bkgHotels = await searchBookingHotels({
        destination: intent.destination,
        checkIn:     intent.departureDate,
        checkOut,
        adults:      intent.travelers || 1,
        currency:    intent.currency || 'USD',
      });
      hotels = bkgHotels.map(bookingToHotel);
    }
    if (needsHotel && hotels.length === 0) {
      hotels = await searchHotels(intent);
    }

    // For multi-city, check each leg has results
    if (isMultiCity) {
      const emptyLegs = legFlightResults
        .map((res, i) => res.length === 0 ? `Leg ${i+1} (${intentLegs[i].from}→${intentLegs[i].to})` : null)
        .filter(Boolean);
      if (emptyLegs.length === intentLegs.length) {
        return NextResponse.json({ error: `No flights found for any leg. Try different dates.` }, { status: 404 });
      }
    } else if (!flights.length) {
      return NextResponse.json({
        error: `No results for ${intent.origin} → ${intent.destination} on ${intent.departureDate}. Try different dates or airports.`,
        tip: 'Amadeus test environment has limited routes. Major hubs like LHR→JFK work best.'
      }, { status: 404 });
    }

    // Build itinerary options
    const itineraries: Itinerary[] = [];
    const hotelOptions  = hotels.slice(0, 3);

    if (isMultiCity) {
      // Multi-city: create combos using one flight per leg
      // Take top 3 options from each leg, build up to 5 combo itineraries
      const perLeg = legFlightResults.map(res => res.slice(0, 3));
      const maxCombos = Math.min(5, Math.max(...perLeg.map(r => r.length)));
      for (let i = 0; i < maxCombos; i++) {
        const comboFlights = perLeg.map(legRes => legRes[Math.min(i, legRes.length - 1)]).filter(Boolean);
        if (comboFlights.length === 0) continue;
        const selectedHotel = needsHotel ? (hotelOptions[i % Math.max(hotelOptions.length, 1)] || null) : null;
        const { score, totalCost } = scoreItinerary(comboFlights, selectedHotel, intent);
        const legSummary = intentLegs.map((l: any, idx: number) => {
          const f = perLeg[idx]?.[Math.min(i, (perLeg[idx]?.length||1) - 1)];
          return f ? `${l.from}→${l.to} (${f.airline})` : `${l.from}→${l.to}`;
        }).join(' + ');
        itineraries.push({
          id: nanoid(), score,
          flights: comboFlights,
          hotels: selectedHotel ? [selectedHotel] : [],
          ground: [], totalCost,
          currency: comboFlights[0]?.currency || intent.currency || 'USD',
          visaRequired: false,
          summary: `Multi-city option ${i + 1}: ${legSummary}`,
        });
      }
    } else {
      // Single route: show up to 10 flight options
      const flightOptions = flights.slice(0, 10);
      for (let i = 0; i < flightOptions.length; i++) {
        const selectedFlight = flightOptions[i];
        const selectedHotel  = needsHotel ? (hotelOptions[i % Math.max(hotelOptions.length, 1)] || null) : null;
        if (needsHotel && !selectedHotel) continue;
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

    // Sort by overall score
    itineraries.sort((a, b) => b.score.overall - a.score.overall);

    // Update Supabase
    if (tripId) {
      const supabase = createClient();
      await supabase
        .from('trips')
        .update({ itineraries, stage: 'optimization', updated_at: new Date().toISOString() })
        .eq('id', tripId);
    }

    return NextResponse.json({ itineraries });
  } catch (err: any) {
    console.error('Trip generation error:', err);
    return NextResponse.json({ error: err.message || 'Trip generation failed' }, { status: 500 });
  }
}
