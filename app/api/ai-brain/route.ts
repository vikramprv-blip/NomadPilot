import { NextRequest, NextResponse } from 'next/server';
import { checkGeminiRateLimit } from '@/lib/ratelimit/gemini';
import { getCached, setCached } from '@/lib/ratelimit/cache';
import { safeParseGeminiJSON } from '@/lib/ratelimit/parseJSON';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const FALLBACK_INTENT = {
  origin: '', destination: '', departureDate: '', returnDate: null,
  travelers: 1, preferences: { cabinClass: 'economy', maxBudget: null, services: ['flight', 'hotel'] },
  nationality: null, tripType: 'return',
};

export async function POST(req: NextRequest) {
  try {
    const { userMessage } = await req.json();

    const cached = await getCached('ai-brain', userMessage);
    if (cached) return NextResponse.json(safeParseGeminiJSON(cached, FALLBACK_INTENT));

    const limit = await checkGeminiRateLimit();
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.reason, retryAfter: (limit as any).retryAfter }, { status: 429 });
    }

    const prompt = `Extract travel intent from this request. Return ONLY valid JSON with double-quoted keys, no trailing commas, no comments:
{"origin":"string","destination":"string","departureDate":"YYYY-MM-DD or empty","returnDate":"YYYY-MM-DD or null","travelers":1,"preferences":{"cabinClass":"economy","maxBudget":null,"services":["flight","hotel"]},"nationality":null,"tripType":"return"}

Travel request: "${userMessage}"`;

    const res  = await fetch(`${GEMINI_BASE}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
    });

    const data = await res.json();
    if (data.error) return NextResponse.json({ error: `Gemini error: ${JSON.stringify(data.error)}` }, { status: 500 });

    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const intent = safeParseGeminiJSON(raw, FALLBACK_INTENT);

    await setCached('ai-brain', userMessage, JSON.stringify(intent));
    return NextResponse.json(intent);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
