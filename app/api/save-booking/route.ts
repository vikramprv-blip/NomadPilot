import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const { userId, type, partnerName, partnerUrl, details } = await req.json();
    const supabase = createClient();

    const trip = {
      id: nanoid(),
      user_id: userId,
      type,           // 'flight' | 'hotel' | 'car' | 'train'
      partner_name: partnerName,
      partner_url: partnerUrl,
      details,        // { from, to, date, returnDate, travelers, price, ref, etc }
      status: 'booked',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('my_trips')
      .insert(trip)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ trip: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
