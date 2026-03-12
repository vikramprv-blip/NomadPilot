import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `You are Maya, NomadPilot's friendly AI travel assistant. You help travellers with:
- Flight, hotel, car rental and train bookings
- Visa requirements and travel documents
- Destination guides, weather, safety info
- Trip itinerary changes and cancellations
- Partner booking support (Skyscanner, Booking.com, Expedia, MakeMyTrip, Hotels.com)
- General travel advice

PERSONALITY: Warm, concise, professional. Use travel emojis sparingly. Always be helpful.

ESCALATION RULES — You MUST respond with [ESCALATE] at the START of your message (before anything else) when:
- User expresses anger, frustration or uses words like "furious", "angry", "terrible", "useless", "refund", "complaint", "lawsuit", "ridiculous"
- User has a payment dispute or billing issue
- User reports a safety emergency
- User explicitly asks to "speak to a human", "talk to someone", "real person", "agent", "supervisor"
- The issue requires accessing booking systems you cannot access
- User asks the same question 3+ times without resolution

When escalating, write [ESCALATE] then: "I completely understand and I'm connecting you with a human agent right now. They'll have full context of our conversation and will respond shortly. Is there anything urgent I should flag for them?"

For all other messages, respond helpfully in 2-4 sentences max unless detail is needed. Never make up booking references or confirmation numbers.`;

async function detectEscalation(message: string, history: any[]): Promise<boolean> {
  const escalationTriggers = [
    'speak to human', 'talk to someone', 'real person', 'human agent',
    'supervisor', 'manager', 'complaint', 'refund', 'furious', 'angry',
    'ridiculous', 'useless', 'terrible', 'awful', 'lawsuit', 'emergency',
    'help me now', 'urgent', 'stranded', 'lost passport', 'missed flight',
  ];
  const lower = message.toLowerCase();
  return escalationTriggers.some(t => lower.includes(t));
}

async function saveEscalation(supabase: any, sessionId: string, userId: string | null, messages: any[], userMessage: string) {
  await supabase.from('support_tickets').insert({
    id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    session_id: sessionId,
    user_id: userId,
    status: 'open',
    priority: 'normal',
    subject: userMessage.slice(0, 100),
    conversation: messages,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], sessionId, userId, userContext } = await req.json();

    // Build Gemini conversation
    const contents = [
      // Inject system as first user message (Gemini doesn't have system role)
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + (userContext ? `\n\nUser context: ${JSON.stringify(userContext)}` : '') }] },
      { role: 'model', parts: [{ text: 'Understood! I\'m Maya, ready to help with any travel needs.' }] },
      // Previous history
      ...history.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      // Current message
      { role: 'user', parts: [{ text: message }] },
    ];

    const res = await fetch(`${GEMINI_BASE}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    });

    const data = await res.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I had trouble responding. Please try again.';

    // Check for escalation signal
    const isEscalated = raw.startsWith('[ESCALATE]') || await detectEscalation(message, history);
    const reply = raw.replace('[ESCALATE]', '').trim();

    // Save to Supabase if escalated
    if (isEscalated) {
      try {
        const supabase = createClient();
        const allMessages = [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: reply },
        ];
        await saveEscalation(supabase, sessionId, userId || null, allMessages, message);
      } catch (e) {
        console.error('Failed to save escalation:', e);
      }
    }

    return NextResponse.json({ reply, escalated: isEscalated, sessionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Get chat history / ticket status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const supabase  = createClient();

    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    return NextResponse.json({ ticket: data });
  } catch {
    return NextResponse.json({ ticket: null });
  }
}
