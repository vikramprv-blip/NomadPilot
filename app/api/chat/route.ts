import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeminiRateLimit } from '@/lib/ratelimit/gemini';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `You are Maya, NomadPilot's friendly AI travel assistant. You help travellers with:
- Flight, hotel, car rental and train bookings
- Visa requirements and travel documents
- Destination guides, weather, safety info
- Trip itinerary changes and cancellations
- Partner booking support (Skyscanner, Booking.com, Expedia, MakeMyTrip, Hotels.com)
- General travel advice

PERSONALITY: Warm, concise, professional. Use travel emojis sparingly. Always be helpful.

ESCALATION RULES — respond with [ESCALATE] at the START when:
- User expresses anger, frustration: "furious", "angry", "terrible", "useless", "refund", "complaint", "ridiculous"
- Payment dispute or billing issue
- Safety emergency
- User asks to "speak to a human", "real person", "agent", "supervisor"
- Issue requires booking system access you don't have
- User asks same question 3+ times

When escalating: [ESCALATE] then "I completely understand and I'm connecting you with a human agent right now. They'll have full context of our conversation and will respond shortly."

Otherwise respond in 2-4 sentences max.`;

async function saveEscalation(supabase: any, sessionId: string, userId: string | null, messages: any[], subject: string) {
  await supabase.from('support_tickets').insert({
    id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    session_id: sessionId,
    user_id: userId,
    status: 'open',
    priority: 'normal',
    subject: subject.slice(0, 100),
    conversation: messages,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], sessionId, userId, userContext } = await req.json();

    // Rate limit check
    const limit = await checkGeminiRateLimit();
    if (!limit.allowed) {
      return NextResponse.json({
        reply: `I'm a little busy right now — ${limit.reason} In the meantime, you can browse our help centre or try again shortly.`,
        escalated: false,
        rateLimited: true,
      });
    }

    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + (userContext ? `\n\nUser: ${JSON.stringify(userContext)}` : '') }] },
      { role: 'model', parts: [{ text: 'Understood! I\'m Maya, ready to help.' }] },
      ...history.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const res  = await fetch(`${GEMINI_BASE}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 400 } }),
    });

    const data = await res.json();
    if (data.error) {
      return NextResponse.json({ reply: 'I\'m having trouble connecting right now. Please try again in a moment.', escalated: false });
    }

    const raw        = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, try again.';
    const isEscalated = raw.startsWith('[ESCALATE]');
    const reply       = raw.replace('[ESCALATE]', '').trim();

    if (isEscalated) {
      try {
        const supabase   = createClient();
        const allMessages = [...history, { role: 'user', content: message }, { role: 'assistant', content: reply }];
        await saveEscalation(supabase, sessionId, userId || null, allMessages, message);
      } catch (e) { console.error('Escalation save failed:', e); }
    }

    return NextResponse.json({ reply, escalated: isEscalated, sessionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const supabase  = createClient();
    const { data }  = await supabase.from('support_tickets').select('*').eq('session_id', sessionId).single();
    return NextResponse.json({ ticket: data });
  } catch {
    return NextResponse.json({ ticket: null });
  }
}
