import { TripIntent } from '@/types';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data)}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function cleanJSON(raw: string): string {
  return raw.replace(/```json|```/g, '').trim();
}

export async function parseIntent(userInput: string): Promise<TripIntent> {
  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = `You are a travel AI assistant. Extract structured travel intent from user input.
Today is ${today}.
Return ONLY a valid JSON object (no markdown, no explanation) matching this structure:
{
  "raw": string,
  "destination": string,
  "origin": string,
  "departureDate": "YYYY-MM-DD",
  "returnDate": "YYYY-MM-DD",
  "budget": number or null,
  "currency": "USD",
  "travelers": 1,
  "preferences": {
    "cabinClass": "economy",
    "hotelStars": 3,
    "loyaltyPrograms": [],
    "dietaryRestrictions": [],
    "accessibility": [],
    "esgPreference": false
  },
  "constraints": {
    "maxLayovers": null,
    "maxFlightDuration": null,
    "mustArriveBefore": null,
    "mustDepartAfter": null,
    "visaPassport": null
  }
}
If you cannot determine a date, default to 2 weeks from today for departure and 3 weeks for return.`;

  const raw = await callGemini(userInput, systemPrompt);
  const parsed = JSON.parse(cleanJSON(raw));
  return { ...parsed, raw: userInput };
}

export async function generateTripSummary(intent: TripIntent): Promise<string> {
  const systemPrompt = 'You are a friendly travel assistant. Write a concise 2-sentence summary of the trip being planned. Be warm and helpful. Return plain text only.';
  return await callGemini(JSON.stringify(intent), systemPrompt);
}

export async function getVisaInfo(
  passport: string,
  destination: string
): Promise<{ required: boolean; info: string }> {
  const systemPrompt = 'Return ONLY a JSON object (no markdown) with { "required": boolean, "info": string } about visa requirements. Be accurate and concise.';
  const raw = await callGemini(`Passport: ${passport}, Destination: ${destination}`, systemPrompt);
  return JSON.parse(cleanJSON(raw));
}

export async function generatePostTripReport(tripData: object): Promise<string> {
  const systemPrompt = 'Generate a professional post-trip report with expense summary, trip highlights, and personalization insights for future trips. Return plain text.';
  return await callGemini(JSON.stringify(tripData), systemPrompt);
}
