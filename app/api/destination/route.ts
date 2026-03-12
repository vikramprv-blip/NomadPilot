import { NextRequest, NextResponse } from 'next/server';
import { checkGeminiRateLimit } from '@/lib/ratelimit/gemini';
import { getCached, setCached } from '@/lib/ratelimit/cache';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function askGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function cleanJSON(raw: string): any {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get('destination') || '';
  const type        = searchParams.get('type') || 'all';
  const cacheKey    = `${destination}:${type}`;

  // Check cache
  const cached = await getCached(type === 'flightTracker' ? 'chat' : type, cacheKey);
  if (cached) {
    try { return NextResponse.json(JSON.parse(cached)); } catch {}
  }

  // Check rate limit
  const limit = await checkGeminiRateLimit();
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.reason, retryAfter: (limit as any).retryAfter }, { status: 429 });
  }

  try {
    let result: any;

    if (type === 'embassy') {
      const raw = await askGemini(`Embassy and consular info for travelers visiting ${destination}. Return ONLY JSON:
{"embassies":[{"country":string,"address":string,"phone":string,"email":string,"hours":string,"emergency":string}],"localEmergency":{"police":string,"ambulance":string,"fire":string},"notes":string}`);
      result = cleanJSON(raw);
    } else if (type === 'safety') {
      const raw = await askGemini(`Current travel safety information for ${destination}. Return ONLY JSON:
{"overallLevel":"low"|"medium"|"high"|"critical","alerts":[{"type":string,"severity":"low"|"medium"|"high","title":string,"description":string,"date":string}],"healthAdvice":string,"crimeAdvice":string,"transportAdvice":string,"lastUpdated":string}`);
      result = cleanJSON(raw);
    } else if (type === 'restaurants') {
      const raw = await askGemini(`Top restaurants and food in ${destination}. Return ONLY JSON:
{"mustEat":[{"name":string,"cuisine":string,"priceRange":"$"|"$$"|"$$$"|"$$$$","description":string,"area":string,"tip":string}],"foodAreas":[{"name":string,"description":string}],"localDishes":[{"name":string,"description":string}]}`);
      result = cleanJSON(raw);
    } else if (type === 'flightTracker') {
      const flight = searchParams.get('flight') || '';
      const raw = await askGemini(`Flight info for ${flight}. Return ONLY JSON:
{"flightNumber":string,"airline":string,"status":"on_time"|"delayed"|"cancelled"|"landed"|"unknown","departure":{"airport":string,"scheduled":string,"actual":string},"arrival":{"airport":string,"scheduled":string,"estimated":string},"gate":string,"terminal":string,"note":string}`);
      result = cleanJSON(raw);
    } else {
      const raw = await askGemini(`Travel overview for ${destination}. Return ONLY JSON:
{"overview":string,"bestTime":string,"currency":string,"language":string,"timezone":string,"climate":string,"gettingAround":string,"topAttractions":[{"name":string,"description":string}],"practicalTips":[string]}`);
      result = cleanJSON(raw);
    }

    await setCached(type, cacheKey, JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
