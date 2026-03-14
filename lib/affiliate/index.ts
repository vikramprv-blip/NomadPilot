/**
 * NomadPilot Affiliate Links
 * 
 * Priority order for commission tracking:
 * 1. Travelpayouts (TP_TOKEN + TP_MARKER + TP_TRS set) — converts ALL links automatically
 * 2. Individual affiliate IDs (NEXT_PUBLIC_AFF_* vars) — per-partner tracking
 * 3. Direct links — no commission, but user still gets to the right page
 *
 * Travelpayouts covers: Booking.com, Hotels.com, Kiwi, Agoda, Aviasales,
 * Rentalcars, GetYourGuide, insurance, 100+ more — ONE account
 */

const AFF = {
  skyscanner: process.env.NEXT_PUBLIC_AFF_SKYSCANNER || '',
  expedia:    process.env.NEXT_PUBLIC_AFF_EXPEDIA    || '',
  booking:    process.env.NEXT_PUBLIC_AFF_BOOKING    || '',
  makemytrip: process.env.NEXT_PUBLIC_AFF_MMT        || '',
  rentalcars: process.env.NEXT_PUBLIC_AFF_RENTALCARS || '',
  trainline:  process.env.NEXT_PUBLIC_AFF_TRAINLINE  || '',
};

export interface PartnerLink {
  name:    string;
  color:   string;
  icon:    string;
  url:     string;     // base URL — converted to affiliate server-side on click
  tracked: boolean;
}

// ─── CLIENT-SIDE: convert URL to affiliate link via server ───────────────────
// Call this when user clicks a partner button
export async function resolveAffiliateUrl(url: string, subId?: string): Promise<string> {
  try {
    const res = await fetch('/api/affiliate-link', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url, subId }),
    });
    const data = await res.json();
    return data.affiliateUrl || url;
  } catch {
    return url;
  }
}

// ─── FLIGHTS ─────────────────────────────────────────────────────────────────
export function buildFlightPartnerLinks(params: {
  origin: string; destination: string; departure: string;
  returnDate?: string; passengers: number; cabin: string;
}): PartnerLink[] {
  const { origin: o, destination: d, departure: dep, returnDate: ret, passengers: pax, cabin } = params;
  const depClean = dep.replace(/-/g, '');
  const retClean = ret?.replace(/-/g, '') || '';
  const skyCabin: Record<string, string> = {
    economy:'economy', premium_economy:'premiumeconomy', business:'business', first:'first',
  };
  const cls    = skyCabin[cabin.toLowerCase()] || 'economy';
  const isRound = !!(ret && ret.trim());

  // Aviasales (Travelpayouts native — best commission)
  const aviasalesUrl = `https://www.aviasales.com/search/${o}${dep.slice(5,7)}${dep.slice(8,10)}${d}${pax}`;

  // Kiwi
  const kiwiUrl = `https://www.kiwi.com/en/search/results/${o}/${d}/${dep}/${ret || ''}?adults=${pax}&cabinType=${cls}`;

  // Skyscanner
  const skyUrl = `https://www.skyscanner.com/transport/flights/${o}/${d}/${depClean}${retClean ? '/'+retClean : ''}/?adults=${pax}&cabinclass=${cls}`;

  // Expedia
  const expUrl = `https://www.expedia.com/Flights-Search?leg1=from:${o},to:${d},departure:${dep}TANYT&passengers=adults:${pax},infantinlap:N&options=cabinclass:${cabin.toLowerCase()}&mode=search&trip=${isRound?'roundtrip':'oneway'}${AFF.expedia?'&affcid='+AFF.expedia:''}`;

  // MakeMyTrip
  const mmtUrl = `https://www.makemytrip.com/flights/international-flights/${o.toLowerCase()}-${d.toLowerCase()}.html?tripType=${isRound?'R':'O'}&paxType=A-${pax}_C-0_I-0&intl=true&dd=${depClean}&srcCity=${o}&dstCity=${d}${AFF.makemytrip?'&affId='+AFF.makemytrip:''}`;

  // Google Flights (no affiliate — included as fallback for users)
  const gfUrl = `https://www.google.com/travel/flights?q=flights+from+${o}+to+${d}+on+${dep}`;

  return [
    { name:'Aviasales',    color:'#FF6B35', icon:'✈', url:aviasalesUrl, tracked:true  }, // TP native
    { name:'Kiwi.com',     color:'#00B289', icon:'✈', url:kiwiUrl,      tracked:true  }, // TP partner
    { name:'Skyscanner',   color:'#00A698', icon:'✈', url:skyUrl,       tracked:!!AFF.skyscanner },
    { name:'Expedia',      color:'#FFC72C', icon:'✈', url:expUrl,       tracked:!!AFF.expedia   },
    { name:'MakeMyTrip',   color:'#E8175D', icon:'✈', url:mmtUrl,       tracked:!!AFF.makemytrip},
    { name:'Google Flights',color:'#4285F4',icon:'✈', url:gfUrl,        tracked:false            },
  ];
}

// ─── HOTELS ───────────────────────────────────────────────────────────────────
export function buildHotelPartnerLinks(params: {
  destination: string; checkIn: string; checkOut: string; passengers: number;
}): PartnerLink[] {
  const { destination, checkIn, checkOut, passengers: pax } = params;
  const d = encodeURIComponent(destination);

  return [
    { name:'Booking.com',  color:'#003580', icon:'🏨',
      url:`https://www.booking.com/searchresults.html?ss=${d}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${pax}${AFF.booking?'&aid='+AFF.booking:''}`,
      tracked:true }, // TP converts this
    { name:'Hotels.com',   color:'#D32F2F', icon:'🏨',
      url:`https://www.hotels.com/search.do?q-destination=${d}&q-check-in=${checkIn}&q-check-out=${checkOut}&q-room-0-adults=${pax}`,
      tracked:true }, // TP converts this
    { name:'Agoda',        color:'#5C2D91', icon:'🏨',
      url:`https://www.agoda.com/search?city=${destination}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=1&adults=${pax}`,
      tracked:true }, // TP converts this
    { name:'Expedia Hotels',color:'#FFC72C',icon:'🏨',
      url:`https://www.expedia.com/Hotel-Search?destination=${d}&startDate=${checkIn}&endDate=${checkOut}&adults=${pax}${AFF.expedia?'&affcid='+AFF.expedia:''}`,
      tracked:!!AFF.expedia },
  ];
}

// ─── CARS ─────────────────────────────────────────────────────────────────────
export function buildCarPartnerLinks(params: { destination: string; pickUp: string }): PartnerLink[] {
  const { destination, pickUp } = params;
  const d = encodeURIComponent(destination);
  return [
    { name:'Rentalcars.com', color:'#E87722', icon:'🚗',
      url:`https://www.rentalcars.com/SearchResults.do?country=${d}&dateFrom=${pickUp}${AFF.rentalcars?'&affiliateCode='+AFF.rentalcars:''}`,
      tracked:true }, // TP converts this
    { name:'DiscoverCars',   color:'#1E88E5', icon:'🚗',
      url:`https://www.discovercars.com/all?from=${destination}&date_from=${pickUp}`,
      tracked:true }, // TP converts this
    { name:'Expedia Cars',   color:'#FFC72C', icon:'🚗',
      url:`https://www.expedia.com/carsearch?locn=${d}&date1=${pickUp}${AFF.expedia?'&affcid='+AFF.expedia:''}`,
      tracked:!!AFF.expedia },
  ];
}

// ─── TRAINS ───────────────────────────────────────────────────────────────────
export function buildTrainPartnerLinks(params: { origin: string; destination: string; date: string }): PartnerLink[] {
  const { origin, destination, date } = params;
  const o = encodeURIComponent(origin);
  const d = encodeURIComponent(destination);
  return [
    { name:'Trainline', color:'#00C853', icon:'🚂',
      url:`https://www.thetrainline.com/search/${o}/${d}${AFF.trainline?'?affiliateId='+AFF.trainline:''}`,
      tracked:!!AFF.trainline },
    { name:'Omio',      color:'#6200EA', icon:'🚂',
      url:`https://www.omio.com/trains/${o}/${d}?date=${date}`,
      tracked:true }, // TP converts this
    { name:'Rail Europe',color:'#1565C0',icon:'🚂',
      url:`https://www.raileurope.com`,
      tracked:false },
  ];
}
