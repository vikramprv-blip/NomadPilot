import { NextRequest, NextResponse } from 'next/server';
import { checkGeminiRateLimit } from '@/lib/ratelimit/gemini';
import { getCached, setCached } from '@/lib/ratelimit/cache';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userMessage } = body;

    const cached = await getCached('ai-brain', userMessage);
    if (cached) return NextResponse.json(JSON.parse(cached));

    const limit = await checkGeminiRateLimit();
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.reason, retryAfter: (limit as any).retryAfter }, { status: 429 });
    }

    const prompt = `Parse this travel request and extract intent. Return ONLY JSON:
{
  "origin": string,
  "destination": string,
  "departureDate": string,
  "returnDate": string | null,
  "travelers": number,
  "preferences": {
    "cabinClass": "economy"|"premium_economy"|"business"|"first",
    "maxBudget": number | null,
    "services": string[]
  },
  "nationality": string | null,
  "tripType": "return"|"oneway"|"multicity"
}
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

    const raw     = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const intent  = JSON.parse(cleaned);

    await setCached('ai-brain', userMessage, JSON.stringify(intent));
    return NextResponse.json(intent);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
