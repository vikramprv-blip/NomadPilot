'use client';
import { useState } from 'react';
import { Itinerary, TripIntent, FlightOption, HotelOption } from '@/types';
import VisaChecker from '@/components/trip/VisaChecker';

// ─── Pre-filled deep-link builders ───────────────────────────────────────────
function buildFlightLinks(flight: FlightOption, intent: TripIntent) {
  const o   = flight.origin;
  const d   = flight.destination;
  const dep = intent.departureDate || '';
  const ret = intent.returnDate    || '';
  const pax = intent.travelers     || 1;
  const cls = (intent.preferences?.cabinClass || 'economy').toLowerCase();
  const skyCabin: Record<string,string> = { economy:'economy', premium_economy:'premiumeconomy', business:'business', first:'first' };

  // Skyscanner: /transport/flights/BLL/DEL/20260318/?adults=1&cabinclass=economy
  const skyUrl = `https://www.skyscanner.com/transport/flights/${o}/${d}/${dep.replace(/-/g,'')}${ret ? '/'+ret.replace(/-/g,'') : ''}/?adults=${pax}&cabinclass=${skyCabin[cls]||'economy'}`;

  // Expedia: pre-fill leg1
  const expUrl = `https://www.expedia.com/Flights-Search?leg1=from:${o},to:${d},departure:${dep}TANYT&passengers=adults:${pax},infantinlap:N&options=cabinclass:${cls}&mode=search&trip=oneway`;

  // MakeMyTrip: international flights with IATA
  const tripType = ret ? 'R' : 'O';
  const mmtUrl = `https://www.makemytrip.com/flights/international-flights/${o.toLowerCase()}-${d.toLowerCase()}.html?tripType=${tripType}&paxType=A-${pax}_C-0_I-0&intl=true&dd=${dep.replace(/-/g,'')}&srcCity=${o}&dstCity=${d}`;

  // Google Flights: clean URL
  const gfUrl = `https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyMDI2LTAzLTE4agcIARIDQkxMcgcIARIDREVMGgYI/////wFAAUgBcAGCAQsI____________AUAB`;
  const gfSimple = `https://www.google.com/travel/flights?q=flights+from+${o}+to+${d}+on+${dep}`;

  return [
    { name: 'Skyscanner',     color: '#00A698', icon: '✈', url: skyUrl },
    { name: 'Expedia',        color: '#FFC72C', icon: '✈', url: expUrl },
    { name: 'MakeMyTrip',     color: '#E8175D', icon: '✈', url: mmtUrl },
    { name: 'Google Flights', color: '#4285F4', icon: '✈', url: gfSimple },
  ];
}

function buildHotelLinks(intent: TripIntent) {
  const d   = encodeURIComponent(intent.destination || '');
  const ci  = intent.departureDate || '';
  const co  = intent.returnDate    || '';
  const pax = intent.travelers     || 1;
  return [
    { name: 'Booking.com',    color: '#003580', icon: '🏨', url: `https://www.booking.com/searchresults.html?ss=${d}&checkin=${ci}&checkout=${co}&group_adults=${pax}` },
    { name: 'Hotels.com',     color: '#D32F2F', icon: '🏨', url: `https://www.hotels.com/search.do?q-destination=${d}&q-check-in=${ci}&q-check-out=${co}&q-room-0-adults=${pax}` },
    { name: 'Expedia Hotels', color: '#FFC72C', icon: '🏨', url: `https://www.expedia.com/Hotel-Search?destination=${d}&startDate=${ci}&endDate=${co}&adults=${pax}` },
  ];
}

function buildCarLinks(intent: TripIntent) {
  const d   = encodeURIComponent(intent.destination || '');
  const dep = intent.departureDate || '';
  return [
    { name: 'Rentalcars.com',  color: '#E87722', icon: '🚗', url: `https://www.rentalcars.com/SearchResults.do?country=${d}&dateFrom=${dep}` },
    { name: 'Expedia Cars',    color: '#FFC72C', icon: '🚗', url: `https://www.expedia.com/carsearch?locn=${d}&date1=${dep}` },
    { name: 'Skyscanner Cars', color: '#00A698', icon: '🚗', url: `https://www.skyscanner.com/car-hire/${intent.destination?.toLowerCase() || ''}` },
  ];
}

function buildTrainLinks(intent: TripIntent) {
  const o = encodeURIComponent(intent.origin || '');
  const d = encodeURIComponent(intent.destination || '');
  return [
    { name: 'Trainline',   color: '#00C853', icon: '🚂', url: `https://www.thetrainline.com/search/${o}/${d}` },
    { name: 'Rail Europe', color: '#1565C0', icon: '🚂', url: `https://www.raileurope.com` },
    { name: 'Omio',        color: '#6200EA', icon: '🚂', url: `https://www.omio.com/trains/${o}/${d}` },
  ];
}

// ─── Currency symbol lookup ──────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string,string> = {
  USD:'$', EUR:'€', GBP:'£', INR:'₹', AED:'د.إ', SGD:'S$', AUD:'A$',
  CAD:'C$', JPY:'¥', CNY:'¥', CHF:'Fr', SEK:'kr', NOK:'kr', DKK:'kr',
  THB:'฿', MYR:'RM', SAR:'ر.س', QAR:'ر.ق', KWD:'د.ك', ZAR:'R',
  BRL:'R$', MXN:'$', NZD:'NZ$', HKD:'HK$', TRY:'₺', KRW:'₩',
};

function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code + ' ';
}

function fmtPrice(amount: number, currency: string): string {
  const sym = currencySymbol(currency);
  // For currencies without cents (JPY, KRW, INR in large amounts)
  const noCents = ['JPY','KRW','IDR','VND'].includes(currency);
  return sym + amount.toLocaleString(undefined, {
    minimumFractionDigits: noCents ? 0 : 0,
    maximumFractionDigits: noCents ? 0 : 0,
  });
}

// ─── Airline name lookup ──────────────────────────────────────────────────────
const AIRLINE_NAMES: Record<string, string> = {
  AF:'Air France', SK:'SAS', LH:'Lufthansa', BA:'British Airways', EK:'Emirates',
  QR:'Qatar Airways', TK:'Turkish Airlines', KL:'KLM', IB:'Iberia', AZ:'ITA Airways',
  LO:'LOT Polish', OS:'Austrian', SN:'Brussels Airlines', TP:'TAP Air Portugal',
  AY:'Finnair', DY:'Norwegian', WF:'Widerøe', FR:'Ryanair', U2:'EasyJet',
  AA:'American', UA:'United', DL:'Delta', WN:'Southwest', B6:'JetBlue',
  AS:'Alaska', F9:'Frontier', NK:'Spirit', G4:'Allegiant', SY:'Sun Country',
  AC:'Air Canada', WS:'WestJet', TS:'Air Transat',
  QF:'Qantas', VA:'Virgin Australia', JQ:'Jetstar',
  SQ:'Singapore Airlines', CX:'Cathay Pacific', NH:'ANA', JL:'Japan Airlines',
  OZ:'Asiana', KE:'Korean Air', CI:'China Airlines', BR:'EVA Air',
  MH:'Malaysia Airlines', GA:'Garuda Indonesia', PR:'Philippine Airlines',
  AI:'Air India', 6E:'IndiGo', UK:'Vistara', IX:'Air India Express',
  EY:'Etihad', FZ:'flydubai', G9:'Air Arabia',
};

function airlineName(code: string) { return AIRLINE_NAMES[code] || code; }

// ─── Format ISO datetime ──────────────────────────────────────────────────────
function fmtTime(iso: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); }
  catch { return iso.slice(11, 16); }
}

function fmtDuration(dur: string) {
  // "PT13H40M" → "13h 40m"
  if (!dur) return '';
  return dur.replace('PT','').replace('H','h ').replace('M','m').trim();
}

// ─── Single flight row ────────────────────────────────────────────────────────
function FlightRow({ flight, intent, rank, onBook }: {
  flight: FlightOption;
  intent: TripIntent;
  rank: number;
  onBook: (partner: string, url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const links = buildFlightPartnerLinks({
    origin:      flight.origin,
    destination: flight.destination,
    departure:   intent.departureDate || '',
    returnDate:  intent.returnDate,
    passengers:  intent.travelers || 1,
    cabin:       intent.preferences?.cabinClass || 'economy',
  });

  return (
    <div style={{ border: '1px solid var(--navy-border)', borderRadius: 12, background: rank === 0 ? 'rgba(232,160,32,0.05)' : 'var(--navy-mid)', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
      {rank === 0 && (
        <div style={{ background: 'linear-gradient(90deg, rgba(232,160,32,0.18), transparent)', padding: '4px 16px', borderBottom: '1px solid rgba(232,160,32,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em' }}>★ BEST PRICE</span>
        </div>
      )}

      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
        {/* Airline + route */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--navy-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--gold)', border: '1px solid var(--navy-border)', flexShrink: 0 }}>
            {flight.airline}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{airlineName(flight.airline)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{flight.flightNumber} · {flight.cabin}</div>
          </div>
        </div>

        {/* Times + route */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {fmtTime(flight.departure)}
            <span style={{ fontSize: 14, color: 'var(--text-dim)', margin: '0 8px' }}>→</span>
            {fmtTime(flight.arrival)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            {flight.origin} → {flight.destination}
          </div>
        </div>

        {/* Duration + stops */}
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDuration(flight.duration)}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            {flight.stops === 0
              ? <span style={{ color: 'var(--green)' }}>Nonstop</span>
              : <span style={{ color: 'var(--text-dim)' }}>{flight.stops} stop{flight.stops > 1 ? 's' : ''}</span>
            }
          </div>
        </div>

        {/* Price + book button */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', color: 'var(--gold)' }}>
            ${flight.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>{flight.currency} · per person</div>
          <button
            onClick={() => setOpen(!open)}
            style={{ padding: '8px 18px', borderRadius: 7, background: 'var(--gold)', border: 'none', color: 'var(--navy)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {open ? 'Hide ↑' : 'Book ↓'}
          </button>
        </div>
      </div>

      {/* Expanded booking options */}
      {open && (
        <div style={{ borderTop: '1px solid var(--navy-border)', padding: '14px 20px', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
            Select a partner to book this flight — your search is pre-filled:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {links.map(p => (
              <button
                key={p.name}
                onClick={async () => { const url = await resolveAffiliateUrl(p.url, `flight-${flight.origin}-${flight.destination}`); window.open(url, '_blank'); onBook(p.name, url); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 7, background: 'var(--navy-light)', border: `1.5px solid ${p.color}50`, color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'DM Sans' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${p.color}18`; e.currentTarget.style.color = p.color; e.currentTarget.style.borderColor = p.color; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--navy-light)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = `${p.color}50`; }}
              >
                <span style={{ color: p.color }}>{p.icon}</span> {p.name}
                {p.tracked && <span style={{ fontSize: 9, background: 'rgba(45,212,160,0.15)', color: 'var(--green)', borderRadius: 3, padding: '1px 4px', fontWeight: 700 }}>✓ tracked</span>}
                <span style={{ fontSize: 10, opacity: 0.4 }}>↗</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            ✓ Booking saved to My Trips automatically when you click a partner.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Hotel section ────────────────────────────────────────────────────────────
function HotelSection({ hotels, intent, onBook }: {
  hotels: HotelOption[];
  intent: TripIntent;
  onBook: (type: string, partner: string, url: string, details: object) => void;
}) {
  const links = buildHotelPartnerLinks({
    destination: intent.destination || '',
    checkIn:     intent.departureDate || '',
    checkOut:    intent.returnDate || '',
    passengers:  intent.travelers || 1,
  });
  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        🏨 Hotels in {intent.destination}
      </h3>
      {hotels.slice(0, 3).map((hotel, i) => (
        <div key={hotel.id} style={{ border: '1px solid var(--navy-border)', borderRadius: 12, background: 'var(--navy-mid)', padding: '16px 20px', marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{hotel.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{'★'.repeat(hotel.stars || 3)} · {hotel.address}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', color: 'var(--gold)' }}>{fmtPrice(hotel.pricePerNight, intent.currency || hotel.currency || 'USD')}/night</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {links.map(p => (
                <button key={p.name}
                  onClick={() => { window.open(p.url, '_blank'); onBook('hotel', p.name, p.url, { hotel: hotel.name, destination: intent.destination }); }}
                  style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--navy-light)', border: `1px solid ${p.color}50`, color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${p.color}15`; e.currentTarget.style.color = p.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--navy-light)'; e.currentTarget.style.color = 'var(--text)'; }}
                >
                  {p.icon} {p.name} ↗
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
      {hotels.length === 0 && (
        <div style={{ padding: '20px', borderRadius: 10, background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 10 }}>Search hotels directly:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {links.map(p => (
              <button key={p.name}
                onClick={() => { window.open(p.url, '_blank'); onBook('hotel', p.name, p.url, {}); }}
                style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--navy-light)', border: `1.5px solid ${p.color}50`, color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}
              >
                {p.icon} {p.name} ↗
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sort + filter bar ────────────────────────────────────────────────────────
type SortKey = 'price' | 'duration' | 'stops';

function parseDuration(dur: string): number {
  const h = parseInt(dur.match(/(\d+)H/)?.[1] || '0');
  const m = parseInt(dur.match(/(\d+)M/)?.[1] || '0');
  return h * 60 + m;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConfirmationStage({ itineraries, intent, onSaveBooking }: {
  itineraries: Itinerary[];
  intent: TripIntent;
  onSaveBooking: (type: string, partner: string, url: string, details: object) => void;
}) {
  const [sort, setSort]   = useState<SortKey>('price');
  const [saved, setSaved] = useState<string[]>([]);

  const nationality = intent.constraints?.visaPassport || (intent as any).nationality || '';
  const services    = (intent.services && intent.services.length > 0) ? intent.services : ['flight', 'hotel'];
  const wantFlight  = services.includes('flight');
  const wantHotel   = services.includes('hotel');
  const wantCar     = services.includes('car');
  const wantTrain   = services.includes('train');

  // Collect all unique flights across itineraries
  const allFlights = Array.from(
    new Map(
      itineraries.flatMap(it => it.flights).map(f => [f.id, f])
    ).values()
  );

  // Collect hotels
  const allHotels = Array.from(
    new Map(
      itineraries.flatMap(it => it.hotels).map(h => [h.id, h])
    ).values()
  );

  // Sort
  const sorted = [...allFlights].sort((a, b) => {
    if (sort === 'price')    return a.price - b.price;
    if (sort === 'duration') return parseDuration(a.duration) - parseDuration(b.duration);
    if (sort === 'stops')    return a.stops - b.stops;
    return 0;
  });

  const minPrice = allFlights.length ? Math.min(...allFlights.map(f => f.price)) : 0;
  const maxPrice = allFlights.length ? Math.max(...allFlights.map(f => f.price)) : 0;

  const handleBook = (partner: string, url: string, flight: FlightOption) => {
    const key = `${flight.id}-${partner}`;
    if (!saved.includes(key)) setSaved(p => [...p, key]);
    onSaveBooking('flight', partner, url, {
      from: flight.origin, to: flight.destination,
      airline: flight.airline, flightNumber: flight.flightNumber,
      departure: flight.departure, arrival: flight.arrival,
      date: intent.departureDate, returnDate: intent.returnDate,
      travelers: intent.travelers, price: flight.price,
    });
  };

  if (!itineraries || itineraries.length === 0) {
    return (
      <div className="fade-up" style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✈</div>
        <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>No flights found</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
          No results for {(intent.origin||'').toUpperCase()} → {(intent.destination||'').toUpperCase()} on {intent.departureDate}.
          Try different dates or airports.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Tip: Amadeus test environment has limited routes. Major hubs like LHR→JFK work best.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
          {wantFlight ? 'Available Flights' : 'Your Results'}
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 12 }}>
          {intent.origin?.toUpperCase()} → {intent.destination?.toUpperCase()}
          {intent.departureDate && ` · ${new Date(intent.departureDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
          {intent.returnDate && ` · Return ${new Date(intent.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          {` · ${intent.travelers || 1} passenger${(intent.travelers||1)>1?'s':''} · ${intent.preferences?.cabinClass || 'Economy'} · ${intent.currency || 'USD'}`}
        </p>
        {nationality && !/^[A-Z]{3}$/.test(nationality.toUpperCase()) && (
          <VisaChecker nationality={nationality} destination={intent.destination} inline={true} />
        )}
      </div>

      {/* Stats + sort bar */}
      {wantFlight && sorted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cheapest</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{fmtPrice(minPrice, intent.currency || 'USD')}</div>
            </div>
            {minPrice !== maxPrice && (
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Up to</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{fmtPrice(maxPrice, intent.currency || 'USD')}</div>
              </div>
            )}
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Options</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{sorted.length}</div>
            </div>
            {saved.length > 0 && (
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{saved.length}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Sort:</span>
            {(['price','duration','stops'] as SortKey[]).map(k => (
              <button key={k} onClick={() => setSort(k)}
                style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${sort===k?'var(--gold)':'var(--navy-border)'}`, background: sort===k?'rgba(232,160,32,0.12)':'var(--navy-light)', color: sort===k?'var(--gold)':'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans', textTransform: 'capitalize' }}>
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Flight list */}
      {wantFlight && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((flight, i) => (
            <FlightRow
              key={flight.id}
              flight={flight}
              intent={intent}
              rank={i}
              onBook={(partner, url) => handleBook(partner, url, flight)}
            />
          ))}
        </div>
      )}

      {/* Hotels section */}
      {wantHotel && (
        <HotelSection hotels={allHotels} intent={intent} onBook={onSaveBooking} />
      )}

      {/* Car / Train shortcuts */}
      {(wantCar || wantTrain) && (
        <div style={{ marginTop: 28, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {wantCar && (
            <div style={{ flex: 1, minWidth: 240, border: '1px solid var(--navy-border)', borderRadius: 12, padding: '16px 20px', background: 'var(--navy-mid)' }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>🚗 Car Rental</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {buildCarPartnerLinks({ destination: intent.destination || '', pickUp: intent.departureDate || '' }).map(p => (
                  <button key={p.name} onClick={() => { window.open(p.url, '_blank'); onSaveBooking('car', p.name, p.url, {}); }}
                    style={{ padding: '7px 13px', borderRadius: 6, background: 'var(--navy-light)', border: `1px solid ${p.color}50`, color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                    {p.icon} {p.name} ↗
                  </button>
                ))}
              </div>
            </div>
          )}
          {wantTrain && (
            <div style={{ flex: 1, minWidth: 240, border: '1px solid var(--navy-border)', borderRadius: 12, padding: '16px 20px', background: 'var(--navy-mid)' }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>🚂 Train</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {buildTrainPartnerLinks({ origin: intent.origin || '', destination: intent.destination || '', date: intent.departureDate || '' }).map(p => (
                  <button key={p.name} onClick={() => { window.open(p.url, '_blank'); onSaveBooking('train', p.name, p.url, {}); }}
                    style={{ padding: '7px 13px', borderRadius: 6, background: 'var(--navy-light)', border: `1px solid ${p.color}50`, color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                    {p.icon} {p.name} ↗
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
