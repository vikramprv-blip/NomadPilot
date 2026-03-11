import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, generateTripSummary, getVisaInfo } from '@/lib/openai';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { userInput, userId } = await req.json();

    if (!userInput?.trim()) {
      return NextResponse.json({ error: 'User input is required' }, { status: 400 });
    }

    // Parse natural language into structured intent
    const intent = await parseIntent(userInput);

    // Generate human-readable summary
    const summary = await generateTripSummary(intent);
    intent.raw = summary; // Store the summary as the display text

    // Get visa info if passport provided
    let visaInfo = null;
    if (intent.constraints.visaPassport) {
      visaInfo = await getVisaInfo(intent.constraints.visaPassport, intent.destination);
    }

    // Persist to Supabase
    const supabase = createClient();
    const { data: tripRecord, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        intent,
        visa_info: visaInfo,
        stage: 'processing',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) console.error('Supabase insert error:', error);

    return NextResponse.json({
      intent,
      summary,
      visaInfo,
      tripId: tripRecord?.id,
    });
  } catch (err: any) {
    console.error('AI Brain error:', err);
    return NextResponse.json({ error: err.message || 'AI processing failed' }, { status: 500 });
  }
}
