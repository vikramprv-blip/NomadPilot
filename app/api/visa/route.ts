import { NextRequest, NextResponse } from 'next/server';

// Travel Buddy AI Visa API
// Docs: https://travel-buddy.ai/api/
// Auth: Bearer token — sign up at travel-buddy.ai/api
// Method: POST with JSON body { passport: "DK", destination: "IN" }
const TRAVEL_BUDDY_BASE = 'https://api.travel-buddy.ai/v2';

// Nationality adjective → ISO 2-letter country code
const NATIONALITY_TO_ISO: Record<string, string> = {
  'Afghan': 'AF', 'Albanian': 'AL', 'Algerian': 'DZ', 'American': 'US',
  'Argentine': 'AR', 'Armenian': 'AM', 'Australian': 'AU', 'Austrian': 'AT',
  'Azerbaijani': 'AZ', 'Bahraini': 'BH', 'Bangladeshi': 'BD', 'Belgian': 'BE',
  'Brazilian': 'BR', 'British': 'GB', 'Bulgarian': 'BG', 'Cambodian': 'KH',
  'Canadian': 'CA', 'Chilean': 'CL', 'Chinese': 'CN', 'Colombian': 'CO',
  'Croatian': 'HR', 'Czech': 'CZ', 'Danish': 'DK', 'Dutch': 'NL',
  'Egyptian': 'EG', 'Emirati': 'AE', 'Estonian': 'EE', 'Ethiopian': 'ET',
  'Finnish': 'FI', 'French': 'FR', 'Georgian': 'GE', 'German': 'DE',
  'Ghanaian': 'GH', 'Greek': 'GR', 'Hungarian': 'HU', 'Indian': 'IN',
  'Indonesian': 'ID', 'Iranian': 'IR', 'Iraqi': 'IQ', 'Irish': 'IE',
  'Israeli': 'IL', 'Italian': 'IT', 'Japanese': 'JP', 'Jordanian': 'JO',
  'Kazakh': 'KZ', 'Kenyan': 'KE', 'Korean': 'KR', 'Kuwaiti': 'KW',
  'Latvian': 'LV', 'Lebanese': 'LB', 'Lithuanian': 'LT', 'Malaysian': 'MY',
  'Mexican': 'MX', 'Moroccan': 'MA', 'Nigerian': 'NG', 'Norwegian': 'NO',
  'Omani': 'OM', 'Pakistani': 'PK', 'Philippine': 'PH', 'Polish': 'PL',
  'Portuguese': 'PT', 'Qatari': 'QA', 'Romanian': 'RO', 'Russian': 'RU',
  'Saudi': 'SA', 'Serbian': 'RS', 'Singaporean': 'SG', 'South African': 'ZA',
  'Spanish': 'ES', 'Sri Lankan': 'LK', 'Swedish': 'SE', 'Swiss': 'CH',
  'Syrian': 'SY', 'Taiwanese': 'TW', 'Thai': 'TH', 'Turkish': 'TR',
  'Ukrainian': 'UA', 'Venezuelan': 'VE', 'Vietnamese': 'VN',
  // Also accept raw ISO codes passed directly
  'DK': 'DK', 'IN': 'IN', 'GB': 'GB', 'US': 'US', 'DE': 'DE',
};

// IATA airport code → destination country ISO code
const IATA_TO_COUNTRY: Record<string, string> = {
  'DEL': 'IN', 'BOM': 'IN', 'BLR': 'IN', 'MAA': 'IN', 'CCU': 'IN', 'HYD': 'IN',
  'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE', 'DOH': 'QA', 'KWI': 'KW',
  'BAH': 'BH', 'MCT': 'OM', 'RUH': 'SA', 'JED': 'SA', 'MED': 'SA',
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'STN': 'GB', 'LTN': 'GB',
  'CDG': 'FR', 'ORY': 'FR', 'FRA': 'DE', 'MUC': 'DE', 'BER': 'DE',
  'AMS': 'NL', 'BRU': 'BE', 'ZRH': 'CH', 'GVA': 'CH',
  'MAD': 'ES', 'BCN': 'ES', 'FCO': 'IT', 'MXP': 'IT', 'NAP': 'IT',
  'VIE': 'AT', 'PRG': 'CZ', 'WAW': 'PL', 'BUD': 'HU',
  'CPH': 'DK', 'ARN': 'SE', 'OSL': 'NO', 'HEL': 'FI', 'BLL': 'DK', 'AAL': 'DK',
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'MIA': 'US', 'SFO': 'US', 'BOS': 'US',
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA',
  'NRT': 'JP', 'HND': 'JP', 'KIX': 'JP',
  'SIN': 'SG', 'KUL': 'MY', 'BKK': 'TH', 'HKG': 'HK', 'MNL': 'PH',
  'ICN': 'KR', 'PEK': 'CN', 'PVG': 'CN', 'CAN': 'CN',
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU',
  'GRU': 'BR', 'EZE': 'AR', 'MEX': 'MX', 'BOG': 'CO',
  'CAI': 'EG', 'CMN': 'MA', 'NBO': 'KE', 'JNB': 'ZA', 'LOS': 'NG', 'ACC': 'GH',
  'IST': 'TR', 'SAW': 'TR', 'TLV': 'IL', 'AMM': 'JO', 'BEY': 'LB',
  'KHI': 'PK', 'LHE': 'PK', 'ISB': 'PK', 'DAC': 'BD', 'CMB': 'LK',
  'CGK': 'ID', 'DAR': 'TZ', 'ADD': 'ET',
};

function resolvePassport(raw: string): string {
  // Already a 2-letter ISO code
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  // Nationality adjective lookup
  const found = NATIONALITY_TO_ISO[raw];
  if (found) return found;
  // Try case-insensitive
  const key = Object.keys(NATIONALITY_TO_ISO).find(
    k => k.toLowerCase() === raw.toLowerCase()
  );
  return key ? NATIONALITY_TO_ISO[key] : raw.toUpperCase().slice(0, 2);
}

function resolveDestination(raw: string): string {
  const upper = raw.toUpperCase();
  // IATA airport code
  if (IATA_TO_COUNTRY[upper]) return IATA_TO_COUNTRY[upper];
  // Already ISO country code
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  // Nationality adjective
  if (NATIONALITY_TO_ISO[raw]) return NATIONALITY_TO_ISO[raw];
  // City name → try partial match in IATA map
  const iataMatch = Object.keys(IATA_TO_COUNTRY).find(k => k === upper);
  if (iataMatch) return IATA_TO_COUNTRY[iataMatch];
  return upper.slice(0, 2);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nationalityRaw  = searchParams.get('nationality') || '';
  const destinationRaw  = searchParams.get('destination') || '';
  const apiKey          = process.env.TRAVEL_BUDDY_API_KEY;

  if (!nationalityRaw || !destinationRaw) {
    return NextResponse.json({ error: 'nationality and destination are required' }, { status: 400 });
  }

  const passportCode = resolvePassport(nationalityRaw);
  const destCode     = resolveDestination(destinationRaw);

  // No API key — return helpful setup message
  if (!apiKey) {
    return NextResponse.json({
      status: 'api_key_missing',
      message: 'Add TRAVEL_BUDDY_API_KEY to Vercel env vars. Get a free key (120 req/month) at https://travel-buddy.ai/api',
      passportCode,
      destCode,
    });
  }

  try {
    // Travel Buddy API v2: POST with JSON body
    const res = await fetch(`${TRAVEL_BUDDY_BASE}/visa/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        passport: passportCode,
        destination: destCode,
      }),
      next: { revalidate: 86400 }, // cache 24 hours
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Travel Buddy API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();

    // Normalise Travel Buddy v2 response → our standard shape
    // v2 returns: data.visa_rules.primary, data.visa_rules.secondary, data.data.*
    const primary   = data?.visa_rules?.primary   || {};
    const secondary = data?.visa_rules?.secondary || {};
    const meta      = data?.data                  || {};

    const statusLabel =
      primary.category_label || data.status || data.visa_category || 'Unknown';
    const required =
      primary.visa_required ?? (statusLabel.toLowerCase().includes('required') ? true : false);

    return NextResponse.json({
      required,
      status:           statusLabel,
      stayDuration:     primary.duration     || secondary.duration     || data.stay_duration || null,
      passportValidity: meta.passport_validity || data.passport_validity || null,
      evisaAvailable:   primary.evisa_available   ?? data.evisa_available   ?? false,
      evisaUrl:         primary.evisa_url         || data.evisa_url         || data.application_url || null,
      notes:            primary.notes             || data.notes             || null,
      passportCode,
      destCode,
      source:           'Travel Buddy AI',
      lastUpdated:      data.last_updated || new Date().toISOString().slice(0, 10),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
