import { NextRequest, NextResponse } from 'next/server';

// Travel Buddy AI - visa requirements API
// Sign up at https://travel-buddy.ai/api to get your key
const TRAVEL_BUDDY_BASE = 'https://travel-buddy.ai/api/v2';

// Nationality name → ISO 2-letter country code
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
};

// IATA city code → ISO 2-letter country code
const IATA_TO_COUNTRY: Record<string, string> = {
  'DEL': 'IN', 'BOM': 'IN', 'BLR': 'IN', 'MAA': 'IN', 'CCU': 'IN',
  'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE', 'DOH': 'QA', 'KWI': 'KW',
  'BAH': 'BH', 'MCT': 'OM', 'RUH': 'SA', 'JED': 'SA',
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'CDG': 'FR', 'ORY': 'FR',
  'FRA': 'DE', 'MUC': 'DE', 'TXL': 'DE', 'BER': 'DE',
  'AMS': 'NL', 'BRU': 'BE', 'ZRH': 'CH', 'GVA': 'CH',
  'MAD': 'ES', 'BCN': 'ES', 'FCO': 'IT', 'MXP': 'IT',
  'VIE': 'AT', 'PRG': 'CZ', 'WAW': 'PL', 'BUD': 'HU',
  'CPH': 'DK', 'ARN': 'SE', 'OSL': 'NO', 'HEL': 'FI',
  'BLL': 'DK', 'AAL': 'DK', 'AAR': 'DK',
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'MIA': 'US', 'SFO': 'US',
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA',
  'NRT': 'JP', 'HND': 'JP', 'KIX': 'JP',
  'SIN': 'SG', 'KUL': 'MY', 'BKK': 'TH', 'HKG': 'HK',
  'ICN': 'KR', 'PEK': 'CN', 'PVG': 'CN', 'CAN': 'CN',
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU',
  'GRU': 'BR', 'EZE': 'AR', 'MEX': 'MX', 'BOG': 'CO',
  'CAI': 'EG', 'CMN': 'MA', 'NBO': 'KE', 'JNB': 'ZA', 'LOS': 'NG',
  'ADD': 'ET', 'ACC': 'GH', 'DAR': 'TZ',
  'IST': 'TR', 'SAW': 'TR', 'TLV': 'IL', 'AMM': 'JO', 'BEY': 'LB',
  'KHI': 'PK', 'LHE': 'PK', 'ISB': 'PK', 'DAC': 'BD', 'CMB': 'LK',
  'KTM': 'NP', 'RGN': 'MM', 'CGK': 'ID', 'MNL': 'PH',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nationality  = searchParams.get('nationality') || '';  // e.g. "Danish"
  const destination  = searchParams.get('destination') || '';  // e.g. "DEL" or "India"
  const apiKey       = process.env.TRAVEL_BUDDY_API_KEY;

  if (!nationality || !destination) {
    return NextResponse.json({ error: 'nationality and destination required' }, { status: 400 });
  }

  // Convert nationality name → ISO code
  const passportCode = NATIONALITY_TO_ISO[nationality] || nationality.toUpperCase().slice(0, 2);

  // Convert IATA or city name → country ISO code
  const destCode = IATA_TO_COUNTRY[destination.toUpperCase()] ||
                   NATIONALITY_TO_ISO[destination] ||
                   destination.toUpperCase().slice(0, 2);

  // If no API key configured, return a clear message
  if (!apiKey) {
    return NextResponse.json({
      status: 'api_key_missing',
      message: 'Add TRAVEL_BUDDY_API_KEY to Vercel environment variables. Sign up free at travel-buddy.ai/api',
      passportCode,
      destCode,
    });
  }

  try {
    const res = await fetch(
      `${TRAVEL_BUDDY_BASE}/visa/check?passport=${passportCode}&destination=${destCode}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 86400 }, // cache 24 hours — visa rules don't change daily
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Travel Buddy API error ${res.status}: ${err}`);
    }

    const data = await res.json();

    // Normalise response into our standard format
    return NextResponse.json({
      required:       data.visa_required ?? true,
      status:         data.visa_category || data.status || 'unknown',
      // e.g. "Visa Required", "Visa Free", "eVisa", "Visa on Arrival"
      stayDuration:   data.stay_duration || data.max_stay || null,
      // e.g. 90 (days)
      passportValidity: data.passport_validity || null,
      evisaAvailable: data.evisa_available ?? false,
      evisaUrl:       data.evisa_url || data.application_url || null,
      notes:          data.notes || data.additional_info || null,
      passportCode,
      destCode,
      source:         'Travel Buddy AI',
      lastUpdated:    data.last_updated || new Date().toISOString().slice(0, 10),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
