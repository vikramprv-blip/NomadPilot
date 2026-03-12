import { NextRequest, NextResponse } from 'next/server';

// ─── Travel Buddy AI via RapidAPI ────────────────────────────────────────────
// Confirmed endpoint from docs:
//   curl -X POST https://visa-requirement.p.rapidapi.com/v2/visa/check \
//     -H "Content-Type: application/json" \
//     -H "X-RapidAPI-Proxy-Secret: ${RAPIDAPI_SECRET}" \
//     -d '{"passport":"CN","destination":"ID"}'
//
// Env var: TRAVEL_BUDDY_API_KEY  → your RapidAPI key
// NB: The auth header is X-RapidAPI-Proxy-Secret (NOT x-rapidapi-key)
//     Body is JSON (NOT form-urlencoded)
// ─────────────────────────────────────────────────────────────────────────────

const RAPIDAPI_URL = 'https://visa-requirement.p.rapidapi.com/v2/visa/check';

// ── Nationality adjective / country name → ISO-2 ────────────────────────────
const TO_ISO: Record<string, string> = {
  // adjectives
  'Afghan':'AF','Albanian':'AL','Algerian':'DZ','American':'US',
  'Argentine':'AR','Armenian':'AM','Australian':'AU','Austrian':'AT',
  'Azerbaijani':'AZ','Bahraini':'BH','Bangladeshi':'BD','Belgian':'BE',
  'Bolivian':'BO','Bosnian':'BA','Brazilian':'BR','British':'GB',
  'Bulgarian':'BG','Cambodian':'KH','Canadian':'CA','Chilean':'CL',
  'Chinese':'CN','Colombian':'CO','Croatian':'HR','Cuban':'CU',
  'Cypriot':'CY','Czech':'CZ','Danish':'DK','Dutch':'NL',
  'Egyptian':'EG','Emirati':'AE','Estonian':'EE','Ethiopian':'ET',
  'Filipino':'PH','Finnish':'FI','French':'FR','Georgian':'GE',
  'German':'DE','Ghanaian':'GH','Greek':'GR','Hungarian':'HU',
  'Icelandic':'IS','Indian':'IN','Indonesian':'ID','Iranian':'IR',
  'Iraqi':'IQ','Irish':'IE','Israeli':'IL','Italian':'IT',
  'Japanese':'JP','Jordanian':'JO','Kazakh':'KZ','Kenyan':'KE',
  'Korean':'KR','Kuwaiti':'KW','Latvian':'LV','Lebanese':'LB',
  'Lithuanian':'LT','Malaysian':'MY','Mexican':'MX','Moroccan':'MA',
  'Nepali':'NP','Nigerian':'NG','Norwegian':'NO','Omani':'OM',
  'Pakistani':'PK','Palestinian':'PS','Philippine':'PH',
  'Polish':'PL','Portuguese':'PT','Qatari':'QA','Romanian':'RO',
  'Russian':'RU','Saudi':'SA','Serbian':'RS','Singaporean':'SG',
  'Slovak':'SK','Slovenian':'SI','South African':'ZA','Spanish':'ES',
  'Sri Lankan':'LK','Swedish':'SE','Swiss':'CH','Syrian':'SY',
  'Taiwanese':'TW','Thai':'TH','Turkish':'TR','Ukrainian':'UA',
  'Venezuelan':'VE','Vietnamese':'VN',
  // country names
  'Afghanistan':'AF','Albania':'AL','Algeria':'DZ','Argentina':'AR',
  'Armenia':'AM','Australia':'AU','Austria':'AT','Bahrain':'BH',
  'Bangladesh':'BD','Belgium':'BE','Brazil':'BR','Cambodia':'KH',
  'Canada':'CA','Chile':'CL','China':'CN','Colombia':'CO',
  'Croatia':'HR','Cyprus':'CY','Czech Republic':'CZ','Denmark':'DK',
  'Egypt':'EG','Estonia':'EE','Ethiopia':'ET','Finland':'FI',
  'France':'FR','Germany':'DE','Ghana':'GH','Greece':'GR',
  'Hungary':'HU','Iceland':'IS','India':'IN','Indonesia':'ID',
  'Iran':'IR','Iraq':'IQ','Ireland':'IE','Israel':'IL',
  'Italy':'IT','Japan':'JP','Jordan':'JO','Kazakhstan':'KZ',
  'Kenya':'KE','Kuwait':'KW','Latvia':'LV','Lebanon':'LB',
  'Lithuania':'LT','Malaysia':'MY','Mexico':'MX','Morocco':'MA',
  'Nepal':'NP','Netherlands':'NL','New Zealand':'NZ','Nigeria':'NG',
  'Norway':'NO','Oman':'OM','Pakistan':'PK','Philippines':'PH',
  'Poland':'PL','Portugal':'PT','Qatar':'QA','Romania':'RO',
  'Russia':'RU','Saudi Arabia':'SA','Serbia':'RS','Singapore':'SG',
  'South Africa':'ZA','South Korea':'KR','Spain':'ES',
  'Sri Lanka':'LK','Sweden':'SE','Switzerland':'CH','Syria':'SY',
  'Taiwan':'TW','Thailand':'TH','Turkey':'TR','Türkiye':'TR',
  'UAE':'AE','United Arab Emirates':'AE','United Kingdom':'GB',
  'United States':'US','United States of America':'US','USA':'US',
  'Ukraine':'UA','Venezuela':'VE','Vietnam':'VN','Viet Nam':'VN',
};

// ── IATA airport code → country ISO-2 ───────────────────────────────────────
const IATA: Record<string, string> = {
  // India
  'DEL':'IN','BOM':'IN','BLR':'IN','MAA':'IN','CCU':'IN','HYD':'IN',
  'COK':'IN','AMD':'IN','PNQ':'IN','GOI':'IN','IXC':'IN','ATQ':'IN',
  // Gulf
  'DXB':'AE','AUH':'AE','SHJ':'AE','DOH':'QA','KWI':'KW',
  'BAH':'BH','MCT':'OM','RUH':'SA','JED':'SA','MED':'SA',
  // Europe
  'LHR':'GB','LGW':'GB','MAN':'GB','STN':'GB','LTN':'GB','EDI':'GB',
  'CDG':'FR','ORY':'FR','NCE':'FR','FRA':'DE','MUC':'DE','BER':'DE',
  'HAM':'DE','DUS':'DE','AMS':'NL','BRU':'BE','ZRH':'CH','GVA':'CH',
  'MAD':'ES','BCN':'ES','FCO':'IT','MXP':'IT','NAP':'IT','VCE':'IT',
  'VIE':'AT','PRG':'CZ','WAW':'PL','BUD':'HU',
  'CPH':'DK','BLL':'DK','AAL':'DK','ARN':'SE','OSL':'NO','HEL':'FI',
  'LIS':'PT','OPO':'PT','ATH':'GR','IST':'TR','SAW':'TR','AYT':'TR',
  'DUB':'IE','SVO':'RU','DME':'RU','LED':'RU',
  // Americas
  'JFK':'US','LAX':'US','ORD':'US','MIA':'US','SFO':'US','BOS':'US',
  'ATL':'US','DFW':'US','DEN':'US','SEA':'US','LAS':'US','YYZ':'CA',
  'YVR':'CA','YUL':'CA','GRU':'BR','EZE':'AR','MEX':'MX','BOG':'CO',
  'LIM':'PE','SCL':'CL',
  // Asia-Pacific
  'NRT':'JP','HND':'JP','KIX':'JP','SIN':'SG','KUL':'MY','BKK':'TH',
  'HKT':'TH','HKG':'HK','MNL':'PH','CGK':'ID','DPS':'ID',
  'ICN':'KR','GMP':'KR','PEK':'CN','PVG':'CN','CAN':'CN',
  'SYD':'AU','MEL':'AU','BNE':'AU','PER':'AU','AKL':'NZ',
  'CMB':'LK','DAC':'BD','KHI':'PK','LHE':'PK','ISB':'PK','KTM':'NP',
  'SGN':'VN','HAN':'VN','PNH':'KH','RGN':'MM',
  // Africa / Middle East
  'TLV':'IL','AMM':'JO','BEY':'LB','CAI':'EG','HRG':'EG',
  'CMN':'MA','RAK':'MA','NBO':'KE','JNB':'ZA','CPT':'ZA',
  'LOS':'NG','ACC':'GH','ADD':'ET','DAR':'TZ',
};

function toISO(raw: string): string {
  if (!raw) return '';
  const t = raw.trim();
  const u = t.toUpperCase();
  if (/^[A-Z]{2}$/.test(u)) return u;                          // already ISO-2
  if (/^[A-Z]{3}$/.test(u) && IATA[u]) return IATA[u];        // IATA code
  if (TO_ISO[t]) return TO_ISO[t];                             // exact match
  const k = Object.keys(TO_ISO).find(x => x.toLowerCase() === t.toLowerCase());
  if (k) return TO_ISO[k];                                     // case-insensitive
  return u.slice(0, 2);                                        // last resort
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nationalityRaw = searchParams.get('nationality') || '';
  const destinationRaw = searchParams.get('destination') || '';
  const apiKey         = process.env.TRAVEL_BUDDY_API_KEY;

  if (!nationalityRaw || !destinationRaw) {
    return NextResponse.json(
      { error: 'nationality and destination are required' },
      { status: 400 }
    );
  }

  const passportCode = toISO(nationalityRaw);
  const destCode     = toISO(destinationRaw);

  if (!apiKey) {
    return NextResponse.json({
      status: 'api_key_missing',
      message: 'Set TRAVEL_BUDDY_API_KEY in Vercel env vars. Get your key at https://rapidapi.com/TravelBuddyAI/api/visa-requirement',
      passportCode,
      destCode,
    });
  }

  try {
    const res = await fetch(RAPIDAPI_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-RapidAPI-Key':  apiKey,
        'X-RapidAPI-Host': 'visa-requirement.p.rapidapi.com',
      },
      body: JSON.stringify({
        passport:    passportCode,
        destination: destCode,
      }),
      next: { revalidate: 86400 }, // cache 24 h — visa rules change rarely
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Travel Buddy API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();

    // ── Normalise response ───────────────────────────────────────────────────
    // v2 shape: { data: { passport:{}, destination:{}, visa_rules: { primary:{}, secondary:{} }, mandatory_registration:[] } }
    const d       = data?.data         || data;
    const primary = d?.visa_rules?.primary   || {};
    const meta    = d;

    const statusLabel =
      primary?.category_label ||
      primary?.category       ||
      d?.visa_category        ||
      'Check embassy';

    const required =
      primary?.visa_required ??
      (statusLabel.toLowerCase().includes('required') ? true : undefined);

    return NextResponse.json({
      required,
      status:           statusLabel,
      stayDuration:     primary?.duration               || null,
      passportValidity: d?.passport?.validity_required  || null,
      evisaAvailable:   primary?.evisa_available        ?? false,
      evisaUrl:         primary?.evisa_url              || primary?.official_url || null,
      notes:            primary?.notes                  || d?.exception         || null,
      mandatoryReg:     d?.mandatory_registration       || [],
      passportCode,
      destCode,
      passportName:     d?.passport?.name     || null,
      destName:         d?.destination?.name  || null,
      source:           'Travel Buddy AI (RapidAPI)',
      lastUpdated:      d?.last_updated || new Date().toISOString().slice(0, 10),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
