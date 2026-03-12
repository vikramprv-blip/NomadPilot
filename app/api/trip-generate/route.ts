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

    // ── Flights: Kiwi (better coverage) → fallback Amadeus ──────────────────
    let flights: FlightOption[] = [];
    if (hasRapidAPI) {
      const kiwiResults = await searchKiwiFlights({
        origin:      intent.origin,
        destination: intent.destination,
        date:        intent.departureDate,
        returnDate:  intent.returnDate || undefined,
        adults:      intent.travelers || 1,
        cabin:       intent.preferences?.cabinClass || 'economy',
        currency:    intent.currency || 'USD',
      });
      flights = kiwiResults.map(kiwiToFlight);
    }
    if (flights.length === 0) {
      // Fallback to Amadeus
      flights = await searchFlights(intent);
    }

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

    if (!flights.length) {
      return NextResponse.json({ error: 'No flights found for these dates' }, { status: 404 });
    }

    // Build up to 3 itinerary options
    const itineraries: Itinerary[] = [];
    const hotelOptions  = hotels.slice(0, 3);
    const flightOptions = flights.slice(0, 10); // Show up to 10 flight options

    for (let i = 0; i < flightOptions.length; i++) {
      const selectedFlight = flightOptions[i];
      const selectedHotel  = needsHotel ? (hotelOptions[i % Math.max(hotelOptions.length, 1)] || null) : null;

      // Skip only if hotel was requested but none available
      if (needsHotel && !selectedHotel) continue;

      const { score, totalCost } = scoreItinerary([selectedFlight], selectedHotel, intent);

      itineraries.push({
        id: nanoid(),
        score,
        flights: [selectedFlight],
        hotels: selectedHotel ? [selectedHotel] : [],
        ground: [],
        totalCost,
        currency: selectedFlight.currency,
        visaRequired: false,
        summary: selectedHotel
          ? `Option ${i + 1}: ${selectedFlight.airline} flight + ${selectedHotel.name}`
          : `Option ${i + 1}: ${selectedFlight.airline} flight`,
      });
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
