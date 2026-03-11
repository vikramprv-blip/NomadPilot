import OpenAI from 'openai';
import { TripIntent } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Parse Natural Language Intent ───────────────────────────────────────────

export async function parseIntent(userInput: string): Promise<TripIntent> {
  const today = new Date().toISOString().split('T')[0];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a travel AI assistant. Extract structured travel intent from user input.
Today is ${today}.
Return a JSON object matching this TypeScript type:
{
  raw: string,
  destination: string,        // city or airport IATA code
  origin: string,             // city or airport IATA code
  departureDate: string,      // ISO date YYYY-MM-DD
  returnDate: string,         // ISO date YYYY-MM-DD
  budget: number | null,      // total budget in currency below
  currency: string,           // ISO 4217 e.g. "USD"
  travelers: number,          // default 1
  preferences: {
    cabinClass: "economy"|"premium_economy"|"business"|"first",
    hotelStars: number,       // 1-5, default 3
    loyaltyPrograms: string[],
    dietaryRestrictions: string[],
    accessibility: string[],
    esgPreference: boolean
  },
  constraints: {
    maxLayovers: number | null,
    maxFlightDuration: number | null,
    mustArriveBefore: string | null,
    mustDepartAfter: string | null,
    visaPassport: string | null   // nationality ISO e.g. "US"
  }
}
Be smart about inferring missing fields. If you can't determine a date, use a sensible default 2 weeks from today.`,
      },
      { role: 'user', content: userInput },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content!);
  return { ...parsed, raw: userInput };
}

// ─── Generate Trip Summary ────────────────────────────────────────────────────

export async function generateTripSummary(intent: TripIntent): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a friendly travel assistant. Write a concise 2-sentence summary of the trip being planned. Be warm and helpful.',
      },
      {
        role: 'user',
        content: `Trip: ${JSON.stringify(intent)}`,
      },
    ],
  });

  return response.choices[0].message.content!;
}

// ─── Generate Visa & Entry Info ───────────────────────────────────────────────

export async function getVisaInfo(
  passport: string,
  destination: string
): Promise<{ required: boolean; info: string }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Return JSON with { required: boolean, info: string } about visa requirements. Be accurate and concise.',
      },
      {
        role: 'user',
        content: `Passport: ${passport}, Destination: ${destination}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content!);
}

// ─── Post-Trip Report ─────────────────────────────────────────────────────────

export async function generatePostTripReport(tripData: object): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'Generate a professional post-trip report with expense summary, trip highlights, and personalization insights for future trips.',
      },
      {
        role: 'user',
        content: JSON.stringify(tripData),
      },
    ],
  });

  return response.choices[0].message.content!;
}
