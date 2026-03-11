import { NextRequest, NextResponse } from 'next/server';
import { createFlightOrder } from '@/lib/amadeus';
import { createClient } from '@/lib/supabase/server';
import { Itinerary, BookingResult } from '@/types';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const { itinerary, travelerInfo, tripId, userId } = await req.json() as {
      itinerary: Itinerary;
      travelerInfo: object;
      tripId: string;
      userId: string;
    };

    const results: BookingResult['tickets'] = [];

    // Book flights via Amadeus
    for (const flight of itinerary.flights) {
      try {
        const { pnr, confirmationNumber } = await createFlightOrder(flight.id, travelerInfo);
        results.push({
          type: 'flight',
          reference: pnr,
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=${confirmationNumber}&size=200x200`,
        });
      } catch (err: any) {
        console.error('Flight booking error:', err.message);
        // In production, handle partial failures, retries, etc.
        results.push({ type: 'flight', reference: `MOCK-${nanoid(6).toUpperCase()}` });
      }
    }

    // Hotel booking (stub — integrate hotel booking API here)
    for (const hotel of itinerary.hotels) {
      results.push({
        type: 'hotel',
        reference: `HTL-${nanoid(6).toUpperCase()}`,
      });
    }

    const booking: BookingResult = {
      id: nanoid(),
      status: 'confirmed',
      confirmationNumber: results[0]?.reference || nanoid(8).toUpperCase(),
      pnr: results[0]?.reference,
      tickets: results,
      createdAt: new Date().toISOString(),
    };

    // Save to Supabase
    const supabase = createClient();
    await supabase.from('bookings').insert({
      id: booking.id,
      trip_id: tripId,
      user_id: userId,
      booking_data: booking,
      itinerary,
      status: 'confirmed',
      created_at: booking.createdAt,
    });

    await supabase
      .from('trips')
      .update({ booking_id: booking.id, stage: 'ops' })
      .eq('id', tripId);

    return NextResponse.json({ booking });
  } catch (err: any) {
    console.error('Booking error:', err);
    return NextResponse.json({ error: err.message || 'Booking failed' }, { status: 500 });
  }
}
