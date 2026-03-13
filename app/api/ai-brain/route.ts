import { NextRequest, NextResponse } from 'next/server';
import { checkGeminiRateLimit } from '@/lib/ratelimit/gemini';
import { safeParseGeminiJSON } from '@/lib/ratelimit/parseJSON';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const TODAY       = new Date().toISOString().slice(0, 10); // always real today

// ── IATA resolver ─────────────────────────────────────────────────────────────
const CITY_TO_IATA: Record<string, string> = {
  // Denmark
  billund:'BLL', bll:'BLL', copenhagen:'CPH', cph:'CPH', aarhus:'AAL', aal:'AAL',
  // France
  paris:'CDG', cdg:'CDG', ory:'ORY', nice:'NCE', nce:'NCE', lyon:'LYS', lys:'LYS', marseille:'MRS',
  par:'CDG',
  // Spain
  malaga:'AGP', agp:'AGP', barcelona:'BCN', bcn:'BCN', madrid:'MAD', mad:'MAD',
  seville:'SVQ', svq:'SVQ', valencia:'VLC', vlc:'VLC', ibiza:'IBZ', ibz:'IBZ',
  // UK
  london:'LHR', lhr:'LHR', heathrow:'LHR', gatwick:'LGW', lgw:'LGW', ltn:'LTN',
  manchester:'MAN', man:'MAN', edinburgh:'EDI', edi:'EDI', birmingham:'BHX', lon:'LHR',
  // Germany
  frankfurt:'FRA', fra:'FRA', munich:'MUC', muc:'MUC', berlin:'BER', ber:'BER',
  hamburg:'HAM', ham:'HAM', dusseldorf:'DUS', dus:'DUS',
  // Netherlands
  amsterdam:'AMS', ams:'AMS',
  // Switzerland
  zurich:'ZRH', zrh:'ZRH', geneva:'GVA', gva:'GVA',
  // Italy
  rome:'FCO', fco:'FCO', milan:'MXP', mxp:'MXP', venice:'VCE', vce:'VCE',
  // UAE
  dubai:'DXB', dxb:'DXB', 'abu dhabi':'AUH', auh:'AUH', sharjah:'SHJ', shj:'SHJ',
  // India
  delhi:'DEL', del:'DEL', 'new delhi':'DEL', mumbai:'BOM', bom:'BOM',
  bangalore:'BLR', blr:'BLR', chennai:'MAA', maa:'MAA', kolkata:'CCU', ccu:'CCU',
  hyderabad:'HYD', hyd:'HYD', goa:'GOI', goi:'GOI',
  // USA
  'new york':'JFK', jfk:'JFK', nyc:'JFK', 'los angeles':'LAX', lax:'LAX',
  chicago:'ORD', ord:'ORD', miami:'MIA', mia:'MIA', 'san francisco':'SFO', sfo:'SFO',
  // Southeast Asia
  singapore:'SIN', sin:'SIN', bangkok:'BKK', bkk:'BKK', bali:'DPS', dps:'DPS',
  jakarta:'CGK', cgk:'CGK', 'kuala lumpur':'KUL', kul:'KUL', 'ho chi minh':'SGN', sgn:'SGN',
  hanoi:'HAN', han:'HAN', manila:'MNL', mnl:'MNL', phuket:'HKT', hkt:'HKT',
  // East Asia
  tokyo:'NRT', nrt:'NRT', osaka:'KIX', kix:'KIX', 'hong kong':'HKG', hkg:'HKG',
  seoul:'ICN', icn:'ICN', taipei:'TPE', tpe:'TPE', beijing:'PEK', pek:'PEK',
  shanghai:'PVG', pvg:'PVG',
  // Australia
  sydney:'SYD', syd:'SYD', melbourne:'MEL', mel:'MEL', brisbane:'BNE', bne:'BNE',
  perth:'PER', per:'PER',
  // Canada
  toronto:'YYZ', yyz:'YYZ', vancouver:'YVR', yvr:'YVR', montreal:'YUL', yul:'YUL',
  // Middle East
  doha:'DOH', doh:'DOH', riyadh:'RUH', ruh:'RUH', kuwait:'KWI', kwi:'KWI',
  muscat:'MCT', mct:'MCT', amman:'AMM', amm:'AMM',
  // Africa
  nairobi:'NBO', nbo:'NBO', 'cape town':'CPT', cpt:'CPT', johannesburg:'JNB', jnb:'JNB',
  cairo:'CAI', cai:'CAI', casablanca:'CMN', cmn:'CMN', lagos:'LOS', los:'LOS',
  // Others
  istanbul:'IST', ist:'IST', oslo:'OSL', osl:'OSL', stockholm:'ARN', arn:'ARN',
  helsinki:'HEL', hel:'HEL', brussels:'BRU', bru:'BRU', vienna:'VIE', vie:'VIE',
  lisbon:'LIS', lis:'LIS', athens:'ATH', ath:'ATH', warsaw:'WAW', waw:'WAW',
  prague:'PRG', prg:'PRG', budapest:'BUD', bud:'BUD',
  'mexico city':'MEX', mex:'MEX', 'sao paulo':'GRU', gru:'GRU',
  'buenos aires':'EZE', eze:'EZE', santiago:'SCL', scl:'SCL', lima:'LIM', lim:'LIM',
};

function resolveIATA(raw: string): string {
  const key = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  return CITY_TO_IATA[key] || raw.toUpperCase();
}

// ── Date resolver ─────────────────────────────────────────────────────────────
const MONTHS: Record<string, string> = {
  jan:'01', january:'01', feb:'02', february:'02', mar:'03', march:'03',
  apr:'04', april:'04', may:'05', jun:'06', june:'06', jul:'07', july:'07',
  aug:'08', august:'08', sep:'09', sept:'09', september:'09', oct:'10', october:'10',
  nov:'11', november:'11', dec:'12', december:'12',
};

function resolveDate(raw: string): string {
  if (!raw) return '';
  raw = raw.trim().toLowerCase();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const year = new Date().getFullYear();

  // "18 mar", "mar 18", "18 march", "march 18"
  const m1 = raw.match(/^(\d{1,2})\s+([a-z]+)$/);
  const m2 = raw.match(/^([a-z]+)\s+(\d{1,2})$/);
  if (m1 && MONTHS[m1[2]]) return `${year}-${MONTHS[m1[2]]}-${m1[1].padStart(2,'0')}`;
  if (m2 && MONTHS[m2[1]]) return `${year}-${MONTHS[m2[1]]}-${m2[2].padStart(2,'0')}`;

  // "18/3", "18/03", "3/18"
  const m3 = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m3) return `${year}-${m3[2].padStart(2,'0')}-${m3[1].padStart(2,'0')}`;

  return '';
}

// ── Regex-based intent parser (zero AI, always works) ─────────────────────────
function regexParseIntent(input: string): any | null {
  const q = input.toLowerCase();

  // Split into legs by comma/semicolon: "BLL to PAR 18 mar, PAR to AGP 20 mar"
  const legPattern = /([a-z][a-z ]{1,20})\s+(?:to|->|→|-)\s+([a-z][a-z ]{1,20})\s+(\d{1,2}\s*[a-z]+|\d{4}-\d{2}-\d{2})/g;
  const legs: any[] = [];
  let match;
  while ((match = legPattern.exec(q)) !== null) {
    const from = resolveIATA(match[1].trim());
    const to   = resolveIATA(match[2].trim());
    const date = resolveDate(match[3].trim());
    if (from && to) legs.push({ from, to, date });
  }

  // Single leg: "billund to paris" or "paris to malaga"
  if (legs.length === 0) {
    const single = q.match(/([a-z][a-z ]{1,20})\s+(?:to|->|→|-)\s+([a-z][a-z ]{1,20})/);
    if (single) {
      const from = resolveIATA(single[1].trim());
      const to   = resolveIATA(single[2].trim());
      legs.push({ from, to, date: '' });
    }
  }

  if (legs.length === 0) return null;

  // Travelers: "2 people", "2 person", "2 passengers", "for 2"
  const travMatch = q.match(/(\d+)\s*(?:people|person|persons|passengers?|pax|adults?)|for\s+(\d+)/);
  const travelers = travMatch ? parseInt(travMatch[1] || travMatch[2]) : 1;

  // Cabin class
  const cabinClass =
    /\b(business|biz)\b/.test(q) ? 'business' :
    /\bfirst\s*class\b/.test(q) ? 'first' :
    /\bpremium\s*economy\b/.test(q) ? 'premium_economy' : 'economy';

  // Return date: "returning 25 mar" / "back on 25 mar"
  const retMatch = q.match(/(?:return|returning|back\s+on|back)\s+(\d{1,2}\s*[a-z]+)/);
  const returnDate = retMatch ? resolveDate(retMatch[1]) : null;

  // Date fallback from legs
  const depDate = legs[0]?.date || '';

  // Find nationality
  const natMatch = q.match(/(?:passport|nationality|i(?:'m| am) from)\s+([a-z]+)/);
  const nationality = natMatch ? natMatch[1] : null;

  // Services
  const services: string[] = ['flight'];
  if (/\bhotel\b/.test(q)) services.push('hotel');
  if (/\b(?:car|rental|rent)\b/.test(q)) services.push('car');

  // Add cabinClass to each leg
  legs.forEach(l => { l.cabinClass = cabinClass; });

  return {
    origin:        legs[0].from,
    destination:   legs[legs.length - 1].to,
    departureDate: depDate,
    returnDate:    returnDate,
    travelers,
    tripType:      legs.length > 1 ? 'multicity' : returnDate ? 'return' : 'oneway',
    services,
    nationality,
    preferences:   { cabinClass, maxBudget: null },
    legs,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userMessage } = await req.json();
    if (!userMessage?.trim()) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // ── Layer 1: Try regex parser first (instant, no API) ─────────────────
    const regexResult = regexParseIntent(userMessage);
    if (regexResult?.origin && regexResult?.destination) {
      console.log('[AI Brain] Regex parse succeeded:', regexResult.origin, '→', regexResult.destination);
      return NextResponse.json(regexResult);
    }

    // ── Layer 2: Gemini AI (for complex/ambiguous queries) ────────────────
    const limit = await checkGeminiRateLimit();
    if (!limit.allowed) {
      return NextResponse.json({ error: (limit as any).reason, retryAfter: (limit as any).retryAfter }, { status: 429 });
    }

    const prompt = `Today is ${TODAY}. Parse this travel request into JSON.

Common city → IATA: Paris=CDG, Billund=BLL, Malaga=AGP, London=LHR, Dubai=DXB, Delhi=DEL, NYC=JFK, Singapore=SIN, Bangkok=BKK, Tokyo=NRT, Sydney=SYD, Mumbai=BOM, Rome=FCO, Barcelona=BCN, Madrid=MAD, Amsterdam=AMS, Frankfurt=FRA, Istanbul=IST, Cairo=CAI, Nairobi=NBO.

Dates like "18 mar" = "${new Date().getFullYear()}-03-18". "2 person" = travelers:2. "business class" = cabinClass:"business".

For multi-leg trips, fill the legs array. Return ONLY JSON, no markdown:
{"origin":"BLL","destination":"AGP","departureDate":"2026-03-18","returnDate":null,"travelers":2,"tripType":"multicity","services":["flight"],"nationality":null,"preferences":{"cabinClass":"business"},"legs":[{"from":"BLL","to":"CDG","date":"2026-03-18","cabinClass":"business"},{"from":"CDG","to":"AGP","date":"2026-03-20","cabinClass":"business"}]}

Request: "${userMessage}"`;

    const res = await fetch(`${GEMINI_BASE}?key=${process.env.GEMINI_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
      }),
    });

    const data = await res.json();
    if (data.error) {
      console.error('[AI Brain] Gemini error:', data.error);
      // If Gemini fails, return regex result even if incomplete
      if (regexResult) return NextResponse.json(regexResult);
      return NextResponse.json({ error: `AI error: ${data.error.message}` }, { status: 500 });
    }

    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const intent = safeParseGeminiJSON(raw, {});

    // Ensure legs exist
    if (!intent.legs?.length && intent.origin && intent.destination) {
      intent.legs = ([{ from: intent.origin, to: intent.destination, date: intent.departureDate, cabinClass: intent.preferences?.cabinClass || 'economy' }] as any[]);
    }
    if (intent.legs?.length > 0) {
      intent.origin        = intent.origin      || intent.legs[0].from;
      intent.destination   = intent.destination || intent.legs[intent.legs.length - 1].to;
      intent.departureDate = intent.departureDate || intent.legs[0].date;
      if (intent.legs.length > 1) intent.tripType = 'multicity';
    }

    // Merge with regex result as fallback for missing fields
    const final = {
      origin:        intent.origin        || regexResult?.origin        || '',
      destination:   intent.destination   || regexResult?.destination   || '',
      departureDate: intent.departureDate || regexResult?.departureDate || '',
      returnDate:    intent.returnDate    ?? regexResult?.returnDate    ?? null,
      travelers:     intent.travelers     || regexResult?.travelers     || 1,
      tripType:      intent.tripType      || regexResult?.tripType      || 'oneway',
      services:      intent.services      || regexResult?.services      || ['flight'],
      nationality:   intent.nationality   || regexResult?.nationality   || null,
      preferences:   intent.preferences   || regexResult?.preferences   || { cabinClass: 'economy' },
      legs:          intent.legs          || regexResult?.legs          || [],
    };

    return NextResponse.json(final);

  } catch (err: any) {
    console.error('[AI Brain] Unexpected error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
