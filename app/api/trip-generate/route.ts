import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, searchHotels } from '@/lib/amadeus';
import { createClient } from '@/lib/supabase/server';
import { TripIntent, Itinerary, FlightOption, HotelOption } from '@/types';
import { nanoid } from 'nanoid';

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

    // Parallel search — only fetch hotels if requested
    const [flights, hotels] = await Promise.all([
      searchFlights(intent),
      needsHotel ? searchHotels(intent) : Promise.resolve([]),
    ]);

    if (!flights.length) {
      return NextResponse.json({ error: 'No flights found for these dates' }, { status: 404 });
    }

    // Build up to 3 itinerary options
    const itineraries: Itinerary[] = [];
    const hotelOptions  = hotels.slice(0, 3);
    const flightOptions = flights.slice(0, 3);

    for (let i = 0; i < Math.min(3, flightOptions.length); i++) {
      const selectedFlight = flightOptions[i];
      const selectedHotel  = needsHotel ? (hotelOptions[i] || hotelOptions[0] || null) : null;

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
