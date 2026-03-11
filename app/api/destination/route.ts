import { NextRequest, NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function cleanJSON(raw: string): any {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get('destination') || '';
  const type = searchParams.get('type') || 'all';

  try {
    if (type === 'embassy') {
      const raw = await askGemini(`Give embassy and consular info for travelers visiting ${destination}. Return ONLY JSON:
{
  "embassies": [
    { "country": string, "address": string, "phone": string, "email": string, "hours": string, "emergency": string }
  ],
  "localEmergency": { "police": string, "ambulance": string, "fire": string },
  "notes": string
}`);
      return NextResponse.json(cleanJSON(raw));
    }

    if (type === 'safety') {
      const raw = await askGemini(`Current travel safety information for ${destination}. Return ONLY JSON:
{
  "overallLevel": "low"|"medium"|"high"|"critical",
  "alerts": [
    { "type": string, "severity": "low"|"medium"|"high", "title": string, "description": string, "date": string }
  ],
  "healthAdvice": string,
  "crimeAdvice": string,
  "transportAdvice": string,
  "lastUpdated": string
}`);
      return NextResponse.json(cleanJSON(raw));
    }

    if (type === 'restaurants') {
      const raw = await askGemini(`Top restaurants and food areas in ${destination}. Return ONLY JSON:
{
  "mustEat": [
    { "name": string, "cuisine": string, "priceRange": "$"|"$$"|"$$$"|"$$$$", "description": string, "area": string, "tip": string }
  ],
  "foodAreas": [{ "name": string, "description": string }],
  "localDishes": [{ "name": string, "description": string }]
}`);
      return NextResponse.json(cleanJSON(raw));
    }

    if (type === 'flightTracker') {
      const flight = searchParams.get('flight') || '';
      const raw = await askGemini(`Flight status information for flight ${flight}. If you don't have real-time data, provide general info about the airline and route. Return ONLY JSON:
{
  "flightNumber": string,
  "airline": string,
  "status": "on_time"|"delayed"|"cancelled"|"landed"|"unknown",
  "departure": { "airport": string, "scheduled": string, "actual": string },
  "arrival": { "airport": string, "scheduled": string, "estimated": string },
  "gate": string,
  "terminal": string,
  "note": string
}`);
      return NextResponse.json(cleanJSON(raw));
    }

    // Default: all destination info
    const raw = await askGemini(`Travel overview for ${destination}. Return ONLY JSON:
{
  "overview": string,
  "bestTime": string,
  "currency": string,
  "language": string,
  "timezone": string,
  "climate": string,
  "gettingAround": string,
  "topAttractions": [{ "name": string, "description": string }],
  "practicalTips": [string]
}`);
    return NextResponse.json(cleanJSON(raw));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
