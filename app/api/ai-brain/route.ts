import { NextRequest, NextResponse } from 'next/server';
import { checkGeminiRateLimit } from '@/lib/ratelimit/gemini';
import { getCached, setCached } from '@/lib/ratelimit/cache';
import { safeParseGeminiJSON } from '@/lib/ratelimit/parseJSON';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const FALLBACK_INTENT = {
  origin: '', destination: '', departureDate: '', returnDate: null,
  travelers: 1, preferences: { cabinClass: 'economy', maxBudget: null },
  services: ['flight', 'hotel'], nationality: null, tripType: 'oneway', legs: [] as any[],
};

// Today is 2026-03-13 — used for resolving relative dates like "18 mar", "next Friday"
const TODAY = '2026-03-13';

export async function POST(req: NextRequest) {
  try {
    const { userMessage } = await req.json();

    const cached = await getCached('ai-brain', userMessage);
    if (cached) return NextResponse.json(safeParseGeminiJSON(cached, FALLBACK_INTENT));

    const limit = await checkGeminiRateLimit();
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.reason, retryAfter: (limit as any).retryAfter }, { status: 429 });
    }

    const prompt = `Today is ${TODAY}. Extract travel intent from the request below.

RULES:
- For multi-city / multi-leg trips (e.g. "BLL to Paris 18 Mar, Paris to Malaga 20 Mar"), populate the "legs" array with one entry per leg.
- For single trips, set origin/destination/departureDate directly AND put the single leg in "legs" too.
- Resolve city names to IATA codes where known (e.g. Paris=CDG, Malaga=AGP, Billund=BLL, London=LHR, Dubai=DXB, Delhi=DEL).
- Resolve relative dates like "18 mar", "next Friday", "tomorrow" to YYYY-MM-DD format using today's date.
- If no year given, assume 2026.
- cabinClass: "economy" | "business" | "first" | "premium_economy"
- tripType: "return" | "oneway" | "multicity"

Return ONLY valid JSON, no markdown, no explanation:
{
  "origin": "IATA or city of first leg",
  "destination": "IATA or city of last leg",
  "departureDate": "YYYY-MM-DD",
  "returnDate": "YYYY-MM-DD or null",
  "travelers": 1,
  "tripType": "oneway",
  "services": ["flight"],
  "nationality": null,
  "preferences": {
    "cabinClass": "economy",
    "maxBudget": null
  },
  "legs": [
    { "from": "BLL", "to": "CDG", "date": "2026-03-18", "cabinClass": "business" },
    { "from": "CDG", "to": "AGP", "date": "2026-03-20", "cabinClass": "business" }
  ]
}

Travel request: "${userMessage}"`;

    const res = await fetch(`${GEMINI_BASE}?key=${process.env.GEMINI_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 600 },
      }),
    });

    const data = await res.json();
    if (data.error) return NextResponse.json({ error: `Gemini error: ${JSON.stringify(data.error)}` }, { status: 500 });

    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const intent = safeParseGeminiJSON(raw, FALLBACK_INTENT);

    // Ensure legs always has at least 1 entry
    if (!intent.legs || intent.legs.length === 0) {
      if (intent.origin && intent.destination) {
        intent.legs = ([{
          from:       intent.origin,
          to:         intent.destination,
          date:       intent.departureDate,
          cabinClass: intent.preferences?.cabinClass || 'economy',
        }] as any[]);
      }
    }

    // Derive origin/destination from legs if not set
    if (intent.legs?.length > 0) {
      if (!intent.origin)      intent.origin      = intent.legs[0].from;
      if (!intent.destination) intent.destination = intent.legs[intent.legs.length - 1].to;
      if (!intent.departureDate) intent.departureDate = intent.legs[0].date;
      if (intent.legs.length > 1) intent.tripType = 'multicity';
    }

    await setCached('ai-brain', userMessage, JSON.stringify(intent));
    return NextResponse.json(intent);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
