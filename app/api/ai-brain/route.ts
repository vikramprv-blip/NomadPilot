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


// Pre-process user input to expand common short forms before sending to Gemini
function normalizeQuery(q: string): string {
  return q
    // Common city shorthand → full name (Gemini handles full names better)
    .replace(/\bpar\b/gi, 'Paris')
    .replace(/\bbll\b/gi, 'Billund')
    .replace(/\bagp\b/gi, 'Malaga')
    .replace(/\blhr\b/gi, 'London')
    .replace(/\blon\b/gi, 'London')
    .replace(/\bdxb\b/gi, 'Dubai')
    .replace(/\bdel\b/gi, 'Delhi')
    .replace(/\bjfk\b/gi, 'New York')
    .replace(/\bnyc\b/gi, 'New York')
    .replace(/\bsin\b/gi, 'Singapore')
    .replace(/\bbkk\b/gi, 'Bangkok')
    .replace(/\bsyd\b/gi, 'Sydney')
    .replace(/\bmel\b/gi, 'Melbourne')
    .replace(/\bhkg\b/gi, 'Hong Kong')
    .replace(/\bnrt\b/gi, 'Tokyo')
    .replace(/\bfra\b/gi, 'Frankfurt')
    .replace(/\bams\b/gi, 'Amsterdam')
    .replace(/\bbcn\b/gi, 'Barcelona')
    .replace(/\bmad\b/gi, 'Madrid')
    .replace(/\bfco\b/gi, 'Rome')
    .replace(/\bist\b/gi, 'Istanbul')
    .replace(/\bcph\b/gi, 'Copenhagen')
    .replace(/\bosl\b/gi, 'Oslo')
    .replace(/\barn\b/gi, 'Stockholm')
    .replace(/\bmuc\b/gi, 'Munich')
    .replace(/\bzrh\b/gi, 'Zurich')
    .replace(/\bdoh\b/gi, 'Doha')
    .replace(/\bauh\b/gi, 'Abu Dhabi')
    .replace(/\bkul\b/gi, 'Kuala Lumpur')
    .replace(/\bdps\b/gi, 'Bali')
    .replace(/\bnbo\b/gi, 'Nairobi')
    .replace(/\bcpt\b/gi, 'Cape Town')
    .replace(/\bjnb\b/gi, 'Johannesburg')
    .replace(/\bcai\b/gi, 'Cairo')
    .replace(/\bbom\b/gi, 'Mumbai')
    .replace(/\bblr\b/gi, 'Bangalore')
    // Date normalizations
    .replace(/\b(\d{1,2})\s*mar\b/gi, '$1 March')
    .replace(/\b(\d{1,2})\s*apr\b/gi, '$1 April')
    .replace(/\b(\d{1,2})\s*may\b/gi, '$1 May')
    .replace(/\b(\d{1,2})\s*jun\b/gi, '$1 June')
    .replace(/\b(\d{1,2})\s*jul\b/gi, '$1 July')
    .replace(/\b(\d{1,2})\s*aug\b/gi, '$1 August')
    .replace(/\b(\d{1,2})\s*sep\b/gi, '$1 September')
    .replace(/\b(\d{1,2})\s*oct\b/gi, '$1 October')
    .replace(/\b(\d{1,2})\s*nov\b/gi, '$1 November')
    .replace(/\b(\d{1,2})\s*dec\b/gi, '$1 December')
    .replace(/\b(\d{1,2})\s*jan\b/gi, '$1 January')
    .replace(/\b(\d{1,2})\s*feb\b/gi, '$1 February')
    // People
    .replace(/\b(\d+)\s*person\b/gi, '$1 people')
    .replace(/\bpax\b/gi, 'passengers');
}

// Today is 2026-03-13 — used for resolving relative dates like "18 mar", "next Friday"
const TODAY = '2026-03-13';

export async function POST(req: NextRequest) {
  try {
    const { userMessage: rawMessage } = await req.json();
    const userMessage = normalizeQuery(rawMessage);

    // Cache disabled for ai-brain — intent parsing is fast and must always be fresh
    // const cached = await getCached('ai-brain', userMessage);

    const limit = await checkGeminiRateLimit();
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.reason, retryAfter: (limit as any).retryAfter }, { status: 429 });
    }

    const prompt = `Today is ${TODAY}. You are a travel intent parser. Extract structured travel data from the user request.

CITY/AIRPORT ABBREVIATION LOOKUP (always resolve these):
- "par", "paris", "CDG", "ORY" → "CDG" (Paris Charles de Gaulle)
- "bll", "billund" → "BLL" (Billund, Denmark)
- "agp", "malaga", "málaga" → "AGP" (Malaga, Spain)
- "lhr", "lon", "london" → "LHR" (London Heathrow)
- "dxb", "dubai" → "DXB" (Dubai)
- "del", "delhi", "new delhi" → "DEL" (Delhi)
- "jfk", "nyc", "new york" → "JFK" (New York)
- "sin", "singapore" → "SIN"
- "bkk", "bangkok" → "BKK"
- "syd", "sydney" → "SYD"
- "mel", "melbourne" → "MEL"
- "hkg", "hong kong" → "HKG"
- "nrt", "tyo", "tokyo" → "NRT"
- "fra", "frankfurt" → "FRA"
- "ams", "amsterdam" → "AMS"
- "bcn", "barcelona" → "BCN"
- "mad", "madrid" → "MAD"
- "fcо", "rom", "rome" → "FCO"
- "ist", "istanbul" → "IST"
- "cph", "copenhagen" → "CPH"
- "osl", "oslo" → "OSL"
- "arn", "sto", "stockholm" → "ARN"
- "muc", "munich" → "MUC"
- "zrh", "zurich" → "ZRH"
- "gva", "geneva" → "GVA"
- "bom", "mum", "mumbai" → "BOM"
- "blr", "bangalore" → "BLR"
- "doh", "doha" → "DOH"
- "auh", "abu dhabi" → "AUH"
- "kul", "kuala lumpur" → "KUL"
- "cgk", "jakarta" → "CGK"
- "bali", "dps", "denpasar" → "DPS"
- "mex", "mexico city" → "MEX"
- "gru", "sao paulo" → "GRU"
- "eze", "bue", "buenos aires" → "EZE"
- "scl", "santiago" → "SCL"
- "nbo", "nairobi" → "NBO"
- "cpt", "cape town" → "CPT"
- "jnb", "johannesburg" → "JNB"
- "cai", "cairo" → "CAI"

DATE RULES (today = ${TODAY}):
- "18 mar", "mar 18", "march 18" → "2026-03-18"
- "20 mar" → "2026-03-20"
- "next friday" → calculate from today
- Always output YYYY-MM-DD format
- If no year, assume 2026

MULTI-CITY RULES:
- If request has multiple routes (e.g. "BLL to PAR 18 mar, PAR to AGP 20 mar"), create one leg per route
- Comma or semicolon usually separates legs
- tripType = "multicity" when legs > 1, "return" when returnDate set, else "oneway"

PEOPLE/TRAVELERS:
- "2 person", "2 people", "2 passengers", "for 2" → travelers: 2
- "solo", "1 person" → travelers: 1

CABIN CLASS:
- "business", "biz", "business class" → "business"
- "first", "first class" → "first"
- "premium", "premium economy" → "premium_economy"
- default → "economy"

Return ONLY a JSON object, absolutely no markdown fences, no explanation text:
{"origin":"BLL","destination":"AGP","departureDate":"2026-03-18","returnDate":null,"travelers":2,"tripType":"multicity","services":["flight"],"nationality":null,"preferences":{"cabinClass":"business","maxBudget":null},"legs":[{"from":"BLL","to":"CDG","date":"2026-03-18","cabinClass":"business"},{"from":"CDG","to":"AGP","date":"2026-03-20","cabinClass":"business"}]}

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
