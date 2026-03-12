import { NextRequest, NextResponse } from 'next/server';

// Travel Buddy AI via RapidAPI
// URL:     https://visa-requirement.p.rapidapi.com/v2/visa/check
// Method:  POST
// Headers: x-rapidapi-host, x-rapidapi-key, Content-Type: application/x-www-form-urlencoded
// Env var: TRAVEL_BUDDY_API_KEY  (your RapidAPI key)

const RAPIDAPI_HOST = 'visa-requirement.p.rapidapi.com';
const RAPIDAPI_URL  = `https://${RAPIDAPI_HOST}/v2/visa/check`;

// ── Nationality adjective / country name → ISO-2 ────────────────────────────
const NATIONALITY_TO_ISO: Record<string, string> = {
  // adjectives
  'Afghan': 'AF', 'Albanian': 'AL', 'Algerian': 'DZ', 'American': 'US',
  'Andorran': 'AD', 'Angolan': 'AO', 'Argentine': 'AR', 'Armenian': 'AM',
  'Australian': 'AU', 'Austrian': 'AT', 'Azerbaijani': 'AZ',
  'Bahraini': 'BH', 'Bangladeshi': 'BD', 'Belgian': 'BE', 'Bolivian': 'BO',
  'Bosnian': 'BA', 'Brazilian': 'BR', 'British': 'GB', 'Bulgarian': 'BG',
  'Cambodian': 'KH', 'Canadian': 'CA', 'Chilean': 'CL', 'Chinese': 'CN',
  'Colombian': 'CO', 'Croatian': 'HR', 'Cuban': 'CU', 'Cypriot': 'CY',
  'Czech': 'CZ', 'Danish': 'DK', 'Dutch': 'NL', 'Egyptian': 'EG',
  'Emirati': 'AE', 'Estonian': 'EE', 'Ethiopian': 'ET',
  'Filipino': 'PH', 'Finnish': 'FI', 'French': 'FR',
  'Georgian': 'GE', 'German': 'DE', 'Ghanaian': 'GH', 'Greek': 'GR',
  'Hungarian': 'HU', 'Icelandic': 'IS', 'Indian': 'IN', 'Indonesian': 'ID',
  'Iranian': 'IR', 'Iraqi': 'IQ', 'Irish': 'IE', 'Israeli': 'IL',
  'Italian': 'IT', 'Japanese': 'JP', 'Jordanian': 'JO',
  'Kazakh': 'KZ', 'Kenyan': 'KE', 'Korean': 'KR', 'Kuwaiti': 'KW',
  'Latvian': 'LV', 'Lebanese': 'LB', 'Lithuanian': 'LT',
  'Malaysian': 'MY', 'Mexican': 'MX', 'Moroccan': 'MA',
  'Nepali': 'NP', 'Nigerian': 'NG', 'Norwegian': 'NO',
  'Omani': 'OM', 'Pakistani': 'PK', 'Palestinian': 'PS',
  'Philippine': 'PH', 'Polish': 'PL', 'Portuguese': 'PT',
  'Qatari': 'QA', 'Romanian': 'RO', 'Russian': 'RU',
  'Saudi': 'SA', 'Serbian': 'RS', 'Singaporean': 'SG',
  'Slovak': 'SK', 'Slovenian': 'SI', 'South African': 'ZA',
  'Spanish': 'ES', 'Sri Lankan': 'LK', 'Swedish': 'SE', 'Swiss': 'CH',
  'Syrian': 'SY', 'Taiwanese': 'TW', 'Thai': 'TH', 'Turkish': 'TR',
  'Ukrainian': 'UA', 'Venezuelan': 'VE', 'Vietnamese': 'VN',
  // common country names (for destination)
  'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Argentina': 'AR',
  'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT', 'Bahrain': 'BH',
  'Bangladesh': 'BD', 'Belgium': 'BE', 'Brazil': 'BR',
  'Cambodia': 'KH', 'Canada': 'CA', 'Chile': 'CL', 'China': 'CN',
  'Colombia': 'CO', 'Croatia': 'HR', 'Cyprus': 'CY', 'Czech Republic': 'CZ',
  'Denmark': 'DK', 'Egypt': 'EG', 'Estonia': 'EE', 'Ethiopia': 'ET',
  'Finland': 'FI', 'France': 'FR', 'Germany': 'DE', 'Ghana': 'GH',
  'Greece': 'GR', 'Hungary': 'HU', 'Iceland': 'IS', 'India': 'IN',
  'Indonesia': 'ID', 'Iran': 'IR', 'Iraq': 'IQ', 'Ireland': 'IE',
  'Israel': 'IL', 'Italy': 'IT', 'Japan': 'JP', 'Jordan': 'JO',
  'Kazakhstan': 'KZ', 'Kenya': 'KE', 'Kuwait': 'KW',
  'Latvia': 'LV', 'Lebanon': 'LB', 'Lithuania': 'LT',
  'Malaysia': 'MY', 'Mexico': 'MX', 'Morocco': 'MA',
  'Nepal': 'NP', 'Netherlands': 'NL', 'New Zealand': 'NZ',
  'Nigeria': 'NG', 'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK',
  'Philippines': 'PH', 'Poland': 'PL', 'Portugal': 'PT',
  'Qatar': 'QA', 'Romania': 'RO', 'Russia': 'RU',
  'Saudi Arabia': 'SA', 'Serbia': 'RS', 'Singapore': 'SG',
  'South Africa': 'ZA', 'South Korea': 'KR', 'Spain': 'ES',
  'Sri Lanka': 'LK', 'Sweden': 'SE', 'Switzerland': 'CH',
  'Taiwan': 'TW', 'Thailand': 'TH', 'Turkey': 'TR', 'Türkiye': 'TR',
  'UAE': 'AE', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
  'United States': 'US', 'USA': 'US', 'Ukraine': 'UA',
  'Venezuela': 'VE', 'Vietnam': 'VN', 'Viet Nam': 'VN',
};

// ── IATA airport code → destination country ISO-2 ────────────────────────────
const IATA_TO_COUNTRY: Record<string, string> = {
  // India
  'DEL': 'IN', 'BOM': 'IN', 'BLR': 'IN', 'MAA': 'IN', 'CCU': 'IN',
  'HYD': 'IN', 'COK': 'IN', 'AMD': 'IN', 'PNQ': 'IN', 'GOI': 'IN',
  // Gulf
  'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE', 'DOH': 'QA', 'KWI': 'KW',
  'BAH': 'BH', 'MCT': 'OM', 'SLL': 'OM', 'RUH': 'SA', 'JED': 'SA', 'MED': 'SA',
  // Europe
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'STN': 'GB', 'LTN': 'GB', 'EDI': 'GB',
  'CDG': 'FR', 'ORY': 'FR', 'NCE': 'FR', 'LYS': 'FR',
  'FRA': 'DE', 'MUC': 'DE', 'BER': 'DE', 'HAM': 'DE', 'DUS': 'DE',
  'AMS': 'NL', 'BRU': 'BE', 'ZRH': 'CH', 'GVA': 'CH', 'BSL': 'CH',
  'MAD': 'ES', 'BCN': 'ES', 'VLC': 'ES', 'AGP': 'ES',
  'FCO': 'IT', 'MXP': 'IT', 'NAP': 'IT', 'VCE': 'IT', 'LIN': 'IT',
  'VIE': 'AT', 'PRG': 'CZ', 'WAW': 'PL', 'KRK': 'PL', 'BUD': 'HU',
  'CPH': 'DK', 'BLL': 'DK', 'AAL': 'DK',
  'ARN': 'SE', 'GOT': 'SE', 'OSL': 'NO', 'BGO': 'NO', 'HEL': 'FI',
  'LIS': 'PT', 'OPO': 'PT', 'ATH': 'GR', 'SKG': 'GR',
  'IST': 'TR', 'SAW': 'TR', 'AYT': 'TR',
  'WAW': 'PL', 'BRU': 'BE', 'DUB': 'IE',
  // Americas
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'MIA': 'US', 'SFO': 'US',
  'BOS': 'US', 'ATL': 'US', 'DFW': 'US', 'DEN': 'US', 'SEA': 'US',
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA', 'YYC': 'CA',
  'GRU': 'BR', 'GIG': 'BR', 'EZE': 'AR', 'MEX': 'MX', 'BOG': 'CO',
  'LIM': 'PE', 'SCL': 'CL', 'UIO': 'EC',
  // Asia-Pacific
  'NRT': 'JP', 'HND': 'JP', 'KIX': 'JP', 'NGO': 'JP',
  'SIN': 'SG', 'KUL': 'MY', 'BKK': 'TH', 'DMK': 'TH', 'HKT': 'TH',
  'HKG': 'HK', 'MNL': 'PH', 'CGK': 'ID', 'DPS': 'ID', 'SUB': 'ID',
  'ICN': 'KR', 'GMP': 'KR',
  'PEK': 'CN', 'PKX': 'CN', 'PVG': 'CN', 'CAN': 'CN', 'CTU': 'CN',
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU', 'ADL': 'AU',
  'AKL': 'NZ', 'CHC': 'NZ',
  'CMB': 'LK', 'DAC': 'BD', 'KHI': 'PK', 'LHE': 'PK', 'ISB': 'PK',
  'KTM': 'NP', 'RGN': 'MM', 'SGN': 'VN', 'HAN': 'VN', 'PNH': 'KH',
  // Middle East / Africa
  'TLV': 'IL', 'AMM': 'JO', 'BEY': 'LB', 'BGW': 'IQ', 'DAM': 'SY',
  'CAI': 'EG', 'HRG': 'EG', 'SSH': 'EG',
  'CMN': 'MA', 'RAK': 'MA', 'NBO': 'KE', 'MBA': 'KE',
  'JNB': 'ZA', 'CPT': 'ZA', 'DUR': 'ZA',
  'LOS': 'NG', 'ABV': 'NG', 'ACC': 'GH', 'ADD': 'ET', 'DAR': 'TZ',
};

function resolveISO(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();

  // Already a 2-letter ISO country code
  if (/^[A-Z]{2}$/.test(upper)) return upper;

  // 3-letter IATA airport code → country
  if (/^[A-Z]{3}$/.test(upper) && IATA_TO_COUNTRY[upper]) {
    return IATA_TO_COUNTRY[upper];
  }

  // Direct lookup (adjective or country name)
  if (NATIONALITY_TO_ISO[trimmed]) return NATIONALITY_TO_ISO[trimmed];

  // Case-insensitive fallback
  const key = Object.keys(NATIONALITY_TO_ISO).find(
    k => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (key) return NATIONALITY_TO_ISO[key];

  // Last resort: uppercase first 2 chars
  return upper.slice(0, 2);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nationalityRaw  = searchParams.get('nationality') || '';
  const destinationRaw  = searchParams.get('destination') || '';
  const apiKey          = process.env.TRAVEL_BUDDY_API_KEY;

  if (!nationalityRaw || !destinationRaw) {
    return NextResponse.json(
      { error: 'nationality and destination query params are required' },
      { status: 400 }
    );
  }

  const passportCode = resolveISO(nationalityRaw);
  const destCode     = resolveISO(destinationRaw);

  // No API key → return helpful setup message (won't error the UI)
  if (!apiKey) {
    return NextResponse.json({
      status: 'api_key_missing',
      message: 'Add TRAVEL_BUDDY_API_KEY to Vercel environment variables. Get your RapidAPI key at https://rapidapi.com/TravelBuddyAI/api/visa-requirement',
      passportCode,
      destCode,
    });
  }

  try {
    // RapidAPI Travel Buddy — POST with form-urlencoded body
    const body = new URLSearchParams({
      passport:    passportCode,
      destination: destCode,
    });

    const res = await fetch(RAPIDAPI_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/x-www-form-urlencoded',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key':  apiKey,
      },
      body: body.toString(),
      // Cache 24 hours — visa rules don't change daily
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Travel Buddy API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();

    // ── Normalise RapidAPI Travel Buddy v2 response ───────────────────────────
    // Response shape varies by plan; handle both v1-style and v2-style fields
    const visaRules = data?.visa_rules?.primary || data?.visa_rules || {};
    const meta      = data?.data || data || {};

    const statusLabel =
      visaRules?.category_label ||
      meta?.visa_category        ||
      meta?.status               ||
      data?.status               ||
      'Check embassy';

    const required =
      visaRules?.visa_required   ??
      meta?.visa_required        ??
      (statusLabel.toLowerCase().includes('required') ? true : undefined);

    const stayDuration =
      visaRules?.duration        ||
      meta?.stay_duration        ||
      data?.stay_duration        ||
      null;

    const evisaAvailable =
      visaRules?.evisa_available  ??
      meta?.evisa_available       ??
      false;

    return NextResponse.json({
      required,
      status:           statusLabel,
      stayDuration,
      passportValidity: meta?.passport_validity  || data?.passport_validity  || null,
      evisaAvailable,
      evisaUrl:         visaRules?.evisa_url     || meta?.evisa_url          || meta?.application_url || null,
      notes:            visaRules?.notes         || meta?.notes              || null,
      passportCode,
      destCode,
      source:           'Travel Buddy AI (RapidAPI)',
      lastUpdated:      meta?.last_updated       || data?.last_updated       || new Date().toISOString().slice(0, 10),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
