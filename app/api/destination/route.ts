import { NextRequest, NextResponse } from 'next/server';
import { checkGeminiRateLimit } from '@/lib/ratelimit/gemini';
import { getCached, setCached } from '@/lib/ratelimit/cache';
import { safeParseGeminiJSON } from '@/lib/ratelimit/parseJSON';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get('destination') || '';
  const type        = searchParams.get('type') || 'all';
  const cacheKey    = `${destination}:${type}`;

  const cached = await getCached(type === 'flightTracker' ? 'chat' : type, cacheKey);
  if (cached) {
    const parsed = safeParseGeminiJSON(cached, null);
    if (parsed) return NextResponse.json(parsed);
  }

  const limit = await checkGeminiRateLimit();
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.reason, retryAfter: (limit as any).retryAfter }, { status: 429 });
  }

  try {
    let raw = '';
    let fallback: any = {};

    if (type === 'embassy') {
      raw = await askGemini(`Embassy info for travelers to ${destination}. Return ONLY valid JSON, double-quoted keys:
{"embassies":[{"country":"string","address":"string","phone":"string","email":"string","hours":"string","emergency":"string"}],"localEmergency":{"police":"string","ambulance":"string","fire":"string"},"notes":"string"}`);
      fallback = { embassies: [], localEmergency: { police: '999', ambulance: '999', fire: '999' }, notes: '' };

    } else if (type === 'safety') {
      raw = await askGemini(`Travel safety for ${destination}. Return ONLY valid JSON, double-quoted keys:
{"overallLevel":"low","alerts":[{"type":"string","severity":"low","title":"string","description":"string","date":"string"}],"healthAdvice":"string","crimeAdvice":"string","transportAdvice":"string","lastUpdated":"string"}`);
      fallback = { overallLevel: 'low', alerts: [], healthAdvice: '', crimeAdvice: '', transportAdvice: '', lastUpdated: '' };

    } else if (type === 'restaurants') {
      raw = await askGemini(`Top restaurants in ${destination}. Return ONLY valid JSON, double-quoted keys:
{"mustEat":[{"name":"string","cuisine":"string","priceRange":"$$","description":"string","area":"string","tip":"string"}],"foodAreas":[{"name":"string","description":"string"}],"localDishes":[{"name":"string","description":"string"}]}`);
      fallback = { mustEat: [], foodAreas: [], localDishes: [] };

    } else if (type === 'flightTracker') {
      const flight = searchParams.get('flight') || '';
      raw = await askGemini(`Flight status for ${flight}. Return ONLY valid JSON, double-quoted keys:
{"flightNumber":"string","airline":"string","status":"unknown","departure":{"airport":"string","scheduled":"string","actual":"string"},"arrival":{"airport":"string","scheduled":"string","estimated":"string"},"gate":"string","terminal":"string","note":"Real-time data unavailable, please check airline website"}`);
      fallback = { flightNumber: flight, airline: '', status: 'unknown', departure: {}, arrival: {}, note: 'Check airline website for live status' };

    } else {
      raw = await askGemini(`Travel overview for ${destination}. Return ONLY valid JSON, double-quoted keys:
{"overview":"string","bestTime":"string","currency":"string","language":"string","timezone":"string","climate":"string","gettingAround":"string","topAttractions":[{"name":"string","description":"string"}],"practicalTips":["string"]}`);
      fallback = { overview: '', bestTime: '', currency: '', language: '', timezone: '', topAttractions: [], practicalTips: [] };
    }

    const result = safeParseGeminiJSON(raw, fallback);
    await setCached(type, cacheKey, JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
