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
  paris:'CDG', cdg:'CDG', ory:'ORY', nice:'NCE', nce:'NCE', lyon:'LYS', lys:'LYS', marseille:'MRS', par:'CDG',
  // Spain
  malaga:'AGP', agp:'AGP', barcelona:'BCN', bcn:'BCN', madrid:'MAD', mad:'MAD',
  seville:'SVQ', svq:'SVQ', valencia:'VLC', vlc:'VLC', ibiza:'IBZ', ibz:'IBZ',
  // Spanish coastal
  estepona:'AGP', marbella:'AGP', torremolinos:'AGP', fuengirola:'AGP',
  benalmadena:'AGP', nerja:'AGP', ronda:'AGP', costa:'AGP',
  'costa del sol':'AGP', alicante:'ALC', alc:'ALC', murcia:'MJV',
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
  // India & South Asia
  delhi:'DEL', del:'DEL', 'new delhi':'DEL', mumbai:'BOM', bom:'BOM',
  bangalore:'BLR', blr:'BLR', bengaluru:'BLR', chennai:'MAA', maa:'MAA',
  kolkata:'CCU', ccu:'CCU', hyderabad:'HYD', hyd:'HYD', goa:'GOI', goi:'GOI',
  pune:'PNQ', pnq:'PNQ', ahmedabad:'AMD', amd:'AMD', jaipur:'JAI',
  islamabad:'ISB', isb:'ISB', lahore:'LHE', lhe:'LHE', karachi:'KHI', khi:'KHI',
  colombo:'CMB', cmb:'CMB', kathmandu:'KTM', ktm:'KTM', dhaka:'DAC', dac:'DAC',
  yangon:'RGN', rgn:'RGN', myanmar:'RGN', rangoon:'RGN',
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
  sydney:'SYD', syd:'SYD', melbourne:'MEL', mel:'MEL', brisbane:'BNE', bne:'BNE', perth:'PER', per:'PER',
  // Europe & Other
  vienna:'VIE', vie:'VIE', lisbon:'LIS', lis:'LIS', porto:'OPO', opo:'OPO',
  brussels:'BRU', bru:'BRU', prague:'PRG', prg:'PRG', warsaw:'WAW', waw:'WAW',
  krakow:'KRK', krk:'KRK', athens:'ATH', ath:'ATH', budapest:'BUD', bud:'BUD',
  bucharest:'OTP', otp:'OTP', sofia:'SOF', sof:'SOF', belgrade:'BEG', beg:'BEG',
  riga:'RIX', rix:'RIX', tallinn:'TLL', tll:'TLL', vilnius:'VNO', vno:'VNO',
  kyiv:'KBP', kbp:'KBP', tbilisi:'TBS', tbs:'TBS', yerevan:'EVN', evn:'EVN',
  baku:'GYD', gyd:'GYD', tehran:'IKA', ika:'IKA', istanbul:'IST', ist:'IST',
  oslo:'OSL', osl:'OSL', stockholm:'ARN', arn:'ARN', helsinki:'HEL', hel:'HEL',
  // Canada
  toronto:'YYZ', yyz:'YYZ', vancouver:'YVR', yvr:'YVR', montreal:'YUL', yul:'YUL',
  calgary:'YYC', yyc:'YYC', ottawa:'YOW', yow:'YOW',
  // Middle East
  doha:'DOH', doh:'DOH', riyadh:'RUH', ruh:'RUH', kuwait:'KWI', kwi:'KWI', muscat:'MCT', mct:'MCT', amman:'AMM', amm:'AMM',
  // Africa
  nairobi:'NBO', nbo:'NBO', 'cape town':'CPT', capetown:'CPT', cpt:'CPT',
  johannesburg:'JNB', jnb:'JNB', lagos:'LOS', los:'LOS', accra:'ACC', acc:'ACC',
  casablanca:'CMN', cmn:'CMN', marrakech:'RAK', rak:'RAK', cairo:'CAI', cai:'CAI',
  addis:'ADD', 'addis ababa':'ADD', add:'ADD', tunis:'TUN', tun:'TUN', algiers:'ALG', dakar:'DKR', dkr:'DKR', kigali:'KGL', kgl:'KGL',
  // South America
  'mexico city':'MEX', mex:'MEX', 'sao paulo':'GRU', gru:'GRU', 'buenos aires':'EZE', eze:'EZE', santiago:'SCL', scl:'SCL', lima:'LIM', lim:'LIM',
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

  const now  = new Date();
  const year = now.getFullYear();
  const nextYear = year + 1;

  // Relative: "today", "tomorrow"
  if (raw === 'today') return now.toISOString().slice(0, 10);
  if (raw === 'tomorrow') {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  // "next friday", "next monday", "this saturday", "this weekend"
  const DAYS: Record<string,number> = { sunday:0, sun:0, monday:1, mon:1, tuesday:2, tue:2,
    wednesday:3, wed:3, thursday:4, thu:4, friday:5, fri:5, saturday:6, sat:6, weekend:6 };
  const nextDay = raw.match(/^(?:next|this)\s+([a-z]+)$/);
  if (nextDay && DAYS[nextDay[1]] !== undefined) {
    const target = DAYS[nextDay[1]];
    const d = new Date(now);
    const diff = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  // "in 2 weeks", "in 10 days", "in 3 months"
  const inX = raw.match(/^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/);
  if (inX) {
    const n = parseInt(inX[1]);
    const unit = inX[2];
    const d = new Date(now);
    if (unit.startsWith('day'))   d.setDate(d.getDate() + n);
    if (unit.startsWith('week'))  d.setDate(d.getDate() + n * 7);
    if (unit.startsWith('month')) d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }

  // "18 mar", "mar 18", "18 march", "march 18"
  const m1 = raw.match(/^(\d{1,2})\s+([a-z]+)$/);
  const m2 = raw.match(/^([a-z]+)\s+(\d{1,2})$/);
  if (m1 && MONTHS[m1[2]]) {
    // If month already passed this year, assume next year
    const mo = MONTHS[m1[2]]; const dy = m1[1].padStart(2,'0');
    const candidate = `${year}-${mo}-${dy}`;
    return candidate < now.toISOString().slice(0,10) ? `${nextYear}-${mo}-${dy}` : candidate;
  }
  if (m2 && MONTHS[m2[1]]) {
    const mo = MONTHS[m2[1]]; const dy = m2[2].padStart(2,'0');
    const candidate = `${year}-${mo}-${dy}`;
    return candidate < now.toISOString().slice(0,10) ? `${nextYear}-${mo}-${dy}` : candidate;
  }

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
  if (/\b(?:hotel|hotels|stay|accommodation|resort|luxury|suite|room|night|nights|lodge|hostel|bnb|airbnb)\b/.test(q)) services.push('hotel');
  if (/\b(?:car|rental|rent|hire|drive)\b/.test(q)) services.push('car');

  // Hotel destination — look for "hotel in [city]", "stay in [city]", "nights in [city]"
  const hotelCityMatch = q.match(/(?:hotel|stay|nights?|accommodation|resort|luxury)\s+in\s+([a-z][a-z ]{1,20}?)(?:\s*,|\s*\.|$|\s+for|\s+\d)/i);
  const hotelDestination = hotelCityMatch ? resolveIATA(hotelCityMatch[1].trim()) : null;

  // Nights — "5 nights", "for 5 nights"
  const nightsMatch = q.match(/(\d+)\s*nights?/);
  const nights = nightsMatch ? parseInt(nightsMatch[1]) : null;

  // Stars / quality
  const hotelStars = /\b5\s*star|luxury|five.star\b/.test(q) ? 5 :
                     /\b4\s*star|four.star\b/.test(q) ? 4 : null;

  // Add cabinClass to each leg
  legs.forEach(l => { l.cabinClass = cabinClass; });

  // Compute returnDate from nights if not set
  const computedReturn = !returnDate && nights && depDate
    ? new Date(new Date(depDate).getTime() + nights * 86400000).toISOString().slice(0, 10)
    : returnDate;

  return {
    origin:           legs[0].from,
    destination:      legs[legs.length - 1].to,
    departureDate:    depDate,
    returnDate:       computedReturn,
    travelers,
    tripType:         legs.length > 1 ? 'multicity' : computedReturn ? 'return' : 'oneway',
    services,
    nationality,
    hotelDestination: hotelDestination || null,
    nights:           nights || null,
    preferences:      { cabinClass, maxBudget: null, hotelStars: hotelStars || null },
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

    const prompt = `Today is ${TODAY}. Parse this travel request into JSON. Return ONLY valid JSON, no markdown.

IATA codes: Paris=CDG, London=LHR, Dubai=DXB, Delhi=DEL, NYC=JFK, Singapore=SIN, Bangkok=BKK, Tokyo=NRT, Sydney=SYD, Mumbai=BOM, Rome=FCO, Barcelona=BCN, Madrid=MAD, Amsterdam=AMS, Frankfurt=FRA, Istanbul=IST, Cairo=CAI, Nairobi=NBO, Toronto=YYZ, Vienna=VIE, Zurich=ZRH, Lisbon=LIS, Prague=PRG, Warsaw=WAW, Athens=ATH, Budapest=BUD, Colombo=CMB, Kathmandu=KTM, Yangon=RGN, Casablanca=CMN, Lagos=LOS.

Rules:
- Dates: "18 mar"→"${new Date().getFullYear()}-03-18", "next friday"→nearest future Friday, "in 2 weeks"→+14 days from today
- Services: include "hotel" if any accommodation mentioned, "car" if car/rental mentioned
- hotelDestination: CITY NAME (not IATA) if hotel city differs from flight destination (e.g. "hotel in Estepona" → hotelDestination:"Estepona")
- nights: integer if number of nights mentioned
- hotelStars: 5 if "luxury"/"5-star", 4 if "upscale"/"4-star", else null
- nationality: passenger's nationality adjective if mentioned (e.g. "Danish", "Indian")
- Multi-city: split into legs array, set tripType:"multicity"

Return JSON:
{"origin":"LHR","destination":"JFK","departureDate":"2026-03-20","returnDate":"2026-03-25","travelers":1,"tripType":"return","services":["flight","hotel"],"nationality":"Danish","hotelDestination":null,"nights":null,"hotelStars":null,"currency":"DKK","preferences":{"cabinClass":"first"},"legs":[{"from":"LHR","to":"JFK","date":"2026-03-20","cabinClass":"first"}]}

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
    const intent: any = safeParseGeminiJSON(raw, {});

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
      origin:           intent.origin           || regexResult?.origin           || '',
      destination:      intent.destination      || regexResult?.destination      || '',
      departureDate:    intent.departureDate    || regexResult?.departureDate    || '',
      returnDate:       intent.returnDate       ?? regexResult?.returnDate       ?? null,
      travelers:        intent.travelers        || regexResult?.travelers        || 1,
      tripType:         intent.tripType         || regexResult?.tripType         || 'oneway',
      services:         intent.services         || regexResult?.services         || ['flight'],
      nationality:      intent.nationality      || regexResult?.nationality      || null,
      hotelDestination: intent.hotelDestination || regexResult?.hotelDestination || null,
      nights:           intent.nights           || regexResult?.nights           || null,
      hotelStars:       intent.hotelStars       || regexResult?.hotelStars       || null,
      currency:         intent.currency         || regexResult?.currency         || null,
      preferences: {
        ...(regexResult?.preferences || {}),
        ...(intent.preferences || {}),
        hotelStars: intent.hotelStars || regexResult?.preferences?.hotelStars || null,
      },
      legs:             intent.legs             || regexResult?.legs             || [],
    };

    return NextResponse.json(final);

  } catch (err: any) {
    console.error('[AI Brain] Unexpected error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
