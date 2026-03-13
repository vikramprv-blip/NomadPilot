/**
 * Visa requirements API
 * 
 * Strategy (3 layers):
 * 1. Travel Buddy AI (RapidAPI) — live data, parsed correctly
 * 2. Offline dataset fallback — passport-index-dataset (MIT, Feb 2026)
 * 3. Gemini AI fallback — generates answer from training data
 * 
 * GET /api/visa?nationality=Danish&destination=delhi
 * GET /api/visa?nationality=DK&destination=IN
 */
import { NextRequest, NextResponse } from 'next/server';
import { lookupVisa } from '@/lib/visa/fallback';

const RAPIDAPI_KEY  = process.env.TRAVEL_BUDDY_API_KEY || process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_URL  = 'https://visa-requirement.p.rapidapi.com/v2/visa/check';
const RAPIDAPI_HOST = 'visa-requirement.p.rapidapi.com';
const GEMINI_KEY    = process.env.GEMINI_API_KEY || '';

// ── ISO-2 resolver ─────────────────────────────────────────────────────────
const NATIONALITY_TO_ISO2: Record<string, string> = {
  afghan:'AF', albanian:'AL', algerian:'DZ', american:'US', argentine:'AR',
  armenian:'AM', australian:'AU', austrian:'AT', azerbaijani:'AZ', bahraini:'BH',
  bangladeshi:'BD', belgian:'BE', brazilian:'BR', british:'GB', bulgarian:'BG',
  cambodian:'KH', canadian:'CA', chilean:'CL', chinese:'CN', colombian:'CO',
  croatian:'HR', czech:'CZ', danish:'DK', dutch:'NL', egyptian:'EG',
  emirati:'AE', estonian:'EE', ethiopian:'ET', finnish:'FI', french:'FR',
  georgian:'GE', german:'DE', ghanaian:'GH', greek:'GR', hungarian:'HU',
  indian:'IN', indonesian:'ID', iranian:'IR', iraqi:'IQ', irish:'IE',
  israeli:'IL', italian:'IT', japanese:'JP', jordanian:'JO', kazakh:'KZ',
  kenyan:'KE', korean:'KR', kuwaiti:'KW', latvian:'LV', lebanese:'LB',
  lithuanian:'LT', malaysian:'MY', mexican:'MX', moroccan:'MA', nigerian:'NG',
  norwegian:'NO', omani:'OM', pakistani:'PK', philippine:'PH', polish:'PL',
  portuguese:'PT', qatari:'QA', romanian:'RO', russian:'RU', saudi:'SA',
  serbian:'RS', singaporean:'SG', 'south african':'ZA', spanish:'ES',
  'sri lankan':'LK', swedish:'SE', swiss:'CH', syrian:'SY', taiwanese:'TW',
  thai:'TH', turkish:'TR', ukrainian:'UA', venezuelan:'VE', vietnamese:'VN',
};

const CITY_TO_ISO2: Record<string, string> = {
  // India
  delhi:'IN', 'new delhi':'IN', mumbai:'IN', bangalore:'IN', chennai:'IN',
  kolkata:'IN', hyderabad:'IN', bom:'IN', del:'IN', maa:'IN',
  // UK
  london:'GB', manchester:'GB', birmingham:'GB', lhr:'GB', lgw:'GB', ltn:'GB',
  // USA
  'new york':'US', 'new york city':'US', nyc:'US', ny:'US', 'los angeles':'US', la:'US',
  chicago:'US', jfk:'US', lax:'US', ord:'US', sfo:'US', mia:'US', bos:'US',
  'washington':'US', 'washington dc':'US', dfw:'US', atl:'US', sea:'US', den:'US',
  houston:'US', dallas:'US', miami:'US', boston:'US', seattle:'US', denver:'US',
  'san francisco':'US', 'las vegas':'US', orlando:'US', mco:'US', usa:'US', us:'US',
  // UAE
  dubai:'AE', 'abu dhabi':'AE', dxb:'AE', auh:'AE',
  // Thailand
  bangkok:'TH', phuket:'TH', bkk:'TH',
  // Germany
  berlin:'DE', munich:'DE', frankfurt:'DE', fra:'DE', txl:'DE',
  // France
  paris:'FR', cdg:'FR', ory:'FR',
  // Singapore
  singapore:'SG', sin:'SG',
  // Japan
  tokyo:'JP', osaka:'JP', nrt:'JP', kix:'JP',
  // Australia
  sydney:'AU', melbourne:'AU', syd:'AU', mel:'AU',
  // Canada
  toronto:'CA', vancouver:'CA', yyz:'CA', yvr:'CA',
  // China
  beijing:'CN', shanghai:'CN', pek:'CN', pvg:'CN',
  // Indonesia
  bali:'ID', jakarta:'ID', dps:'ID', cgk:'ID',
  // Turkey
  istanbul:'TR', ist:'TR',
  // South Africa
  'cape town':'ZA', johannesburg:'ZA', cpt:'ZA', jnb:'ZA',
  // Kenya
  nairobi:'KE', nbo:'KE',
  // Egypt
  cairo:'EG', cai:'EG',
  // Morocco
  marrakech:'MA', casablanca:'MA', rak:'MA',
  // Brazil
  'sao paulo':'BR', 'rio de janeiro':'BR', gru:'BR',
  // South Korea
  seoul:'KR', icn:'KR',
  // Malaysia
  'kuala lumpur':'MY', kul:'MY',
  // Vietnam
  hanoi:'VN', 'ho chi minh':'VN', han:'VN', sgn:'VN',
  // Sri Lanka
  colombo:'LK', cmb:'LK',
  // Nepal
  kathmandu:'NP', ktm:'NP',
  // Maldives
  male:'MV', mle:'MV',
  // Scandinavia
  copenhagen:'DK', cph:'DK', oslo:'NO', osl:'NO',
  stockholm:'SE', arn:'SE', helsinki:'FI', hel:'FI',
  amsterdam:'NL', ams:'NL', brussels:'BE', bru:'BE',
  zurich:'CH', zrh:'CH', vienna:'AT', vie:'AT',
  // Eastern Europe
  warsaw:'PL', waw:'PL', prague:'CZ', prg:'CZ',
  budapest:'HU', bud:'HU', bucharest:'RO', otp:'RO',
  // Middle East
  riyadh:'SA', ruh:'SA', doha:'QA', doh:'QA',
  kuwait:'KW', kwi:'KW', muscat:'OM', mct:'OM',
  amman:'JO', amm:'JO', beirut:'LB', bey:'LB',
  // Africa
  lagos:'NG', los:'NG', accra:'GH', acc:'GH',
  'addis ababa':'ET', add:'ET',
  // Denmark extras
  billund:'DK', bll:'DK', aarhus:'DK', aal:'DK',
};

function toISO2(raw: string): string {
  const s = raw.toLowerCase().trim();
  // Already ISO-2
  if (/^[a-z]{2}$/.test(s)) return s.toUpperCase();
  // ISO-3 → ISO-2
  const iso3Map: Record<string,string> = { dnk:'DK', gbr:'GB', usa:'US', deu:'DE', ind:'IN', are:'AE', sgp:'SG', aus:'AU', can:'CA', fra:'FR', nor:'NO', swe:'SE', jpn:'JP', kor:'KR', nld:'NL', ita:'IT', esp:'ES', bra:'BR', chn:'CN', tur:'TR', idn:'ID', tha:'TH', mys:'MY', pak:'PK' };
  if (/^[a-z]{3}$/.test(s) && iso3Map[s]) return iso3Map[s];
  // Nationality name → ISO-2
  if (NATIONALITY_TO_ISO2[s]) return NATIONALITY_TO_ISO2[s];
  // City / IATA → ISO-2
  if (CITY_TO_ISO2[s]) return CITY_TO_ISO2[s];
  // IATA 3-letter airport code
  if (/^[a-z]{3}$/.test(s) && CITY_TO_ISO2[s]) return CITY_TO_ISO2[s];
  return raw.toUpperCase().slice(0, 2);
}

// ── Gemini AI fallback ─────────────────────────────────────────────────────
async function askGemini(passport: string, destination: string): Promise<any> {
  if (!GEMINI_KEY) return null;
  try {
    const prompt = `What are the visa requirements for a ${passport} passport holder traveling to ${destination}?
Reply ONLY with a JSON object, no markdown, no explanation:
{"status":"Visa Free|Visa on Arrival|eVisa Available|Visa Required|Electronic Travel Auth","required":true/false,"stayDays":number_or_null,"evisaAvailable":true/false,"notes":"brief note or null"}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return { ...JSON.parse(clean), source: 'Gemini AI (estimated)' };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const p         = req.nextUrl.searchParams;
  const natRaw    = p.get('nationality') || '';
  const destRaw   = p.get('destination') || '';

  if (!natRaw || !destRaw) {
    return NextResponse.json({ error: 'nationality and destination required' }, { status: 400 });
  }

  const passportCode  = toISO2(natRaw);
  const destCode      = toISO2(destRaw);

  // ── Layer 1: Travel Buddy AI ─────────────────────────────────────────────
  if (RAPIDAPI_KEY) {
    try {
      const res = await fetch(RAPIDAPI_URL, {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-RapidAPI-Key':  RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
        body: JSON.stringify({ passport: passportCode, destination: destCode }),
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = await res.json();
        const d    = data?.data || data;

        // CORRECT field names from Travel Buddy AI v2 API docs
        const primary   = d?.visa_rules?.primary_rule   || d?.visa_rules?.primary   || {};
        const secondary = d?.visa_rules?.secondary_rule || d?.visa_rules?.secondary  || {};
        const dest      = d?.destination || {};

        const statusLabel =
          primary?.name        || primary?.category_label  || primary?.category ||
          secondary?.name      || d?.category_label        || d?.category       || '';

        // Only use this result if we got a real status back
        if (statusLabel && statusLabel.toLowerCase() !== 'check embassy' && statusLabel.length > 2) {
          return NextResponse.json({
            status:           statusLabel,
            required:         statusLabel.toLowerCase().includes('required') && !statusLabel.toLowerCase().includes('not required'),
            stayDays:         primary?.duration           || secondary?.duration        || null,
            evisaAvailable:   !!(secondary?.name?.toLowerCase().includes('evisa') || secondary?.link || d?.mandatory_registration),
            evisaUrl:         secondary?.link             || d?.mandatory_registration?.link || null,
            notes:            dest?.passport_validity ? `Passport validity required: ${dest.passport_validity}` : null,
            passportCode,
            destCode,
            passportName:     d?.passport?.name           || null,
            destName:         dest?.name                  || null,
            source:           'Travel Buddy AI (RapidAPI)',
            lastUpdated:      new Date().toISOString().slice(0, 10),
            mandatory:        d?.mandatory_registration   || null,
          });
        }
      }
    } catch (err) {
      console.error('[Visa] Travel Buddy API error:', err);
    }
  }

  // ── Layer 2: Offline dataset ─────────────────────────────────────────────
  const offline = lookupVisa(passportCode, destCode);
  if (offline) {
    return NextResponse.json({
      status:         offline.status,
      required:       offline.required,
      stayDays:       offline.stayDays,
      evisaAvailable: offline.evisaAvailable,
      evisaUrl:       null,
      notes:          null,
      passportCode,
      destCode,
      source:         'Passport Index Dataset (Feb 2026)',
      lastUpdated:    '2026-02-01',
    });
  }

  // ── Layer 3: Gemini AI ───────────────────────────────────────────────────
  const gemini = await askGemini(natRaw, destRaw);
  if (gemini) {
    return NextResponse.json({
      ...gemini,
      passportCode,
      destCode,
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
  }

  // ── Nothing worked ────────────────────────────────────────────────────────
  return NextResponse.json({
    status:     'No data available',
    required:   null,
    stayDays:   null,
    passportCode,
    destCode,
    source:     'No data',
    error:      `Could not find visa requirements for ${natRaw} → ${destRaw}. Please check with the destination embassy.`,
  });
}
