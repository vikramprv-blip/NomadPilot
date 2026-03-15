'use client';
import { useState } from 'react';
import { Itinerary, TripIntent, FlightOption, HotelOption } from '@/types';
import VisaChecker from '@/components/trip/VisaChecker';
import { resolveAffiliateUrl } from '@/lib/affiliate';

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
    { name: 'Skyscanner',     color: '#00A698', icon: '✈', url: skyUrl,    tracked: false },
    { name: 'Expedia',        color: '#FFC72C', icon: '✈', url: expUrl,    tracked: false },
    { name: 'MakeMyTrip',     color: '#E8175D', icon: '✈', url: mmtUrl,    tracked: false },
    { name: 'Google Flights', color: '#4285F4', icon: '✈', url: gfSimple,  tracked: false },
  ];
}

function buildHotelLinks(intent: TripIntent) {
  const d   = encodeURIComponent(intent.destination || '');
  const ci  = intent.departureDate || '';
  const co  = intent.returnDate    || '';
  const pax = intent.travelers     || 1;
  return [
    { name: 'Booking.com',    color: '#003580', icon: '🏨', url: `https://www.booking.com/searchresults.html?ss=${d}&checkin=${ci}&checkout=${co}&group_adults=${pax}`,  tracked: false },
    { name: 'Hotels.com',     color: '#D32F2F', icon: '🏨', url: `https://www.hotels.com/search.do?q-destination=${d}&q-check-in=${ci}&q-check-out=${co}&q-room-0-adults=${pax}`, tracked: false },
    { name: 'Expedia Hotels', color: '#FFC72C', icon: '🏨', url: `https://www.expedia.com/Hotel-Search?destination=${d}&startDate=${ci}&endDate=${co}&adults=${pax}`, tracked: false },
  ];
}

function buildCarLinks(intent: TripIntent) {
  const d   = encodeURIComponent(intent.destination || '');
  const dep = intent.departureDate || '';
  return [
    { name: 'Rentalcars.com',  color: '#E87722', icon: '🚗', url: `https://www.rentalcars.com/SearchResults.do?country=${d}&dateFrom=${dep}`,  tracked: false },
    { name: 'Expedia Cars',    color: '#FFC72C', icon: '🚗', url: `https://www.expedia.com/carsearch?locn=${d}&date1=${dep}`,                   tracked: false },
    { name: 'Skyscanner Cars', color: '#00A698', icon: '🚗', url: `https://www.skyscanner.com/car-hire/${intent.destination?.toLowerCase() || ''}`, tracked: false },
  ];
}

function buildTrainLinks(intent: TripIntent) {
  const o = encodeURIComponent(intent.origin || '');
  const d = encodeURIComponent(intent.destination || '');
  return [
    { name: 'Trainline',   color: '#00C853', icon: '🚂', url: `https://www.thetrainline.com/search/${o}/${d}`, tracked: false },
    { name: 'Rail Europe', color: '#1565C0', icon: '🚂', url: `https://www.raileurope.com`,                   tracked: false },
    { name: 'Omio',        color: '#6200EA', icon: '🚂', url: `https://www.omio.com/trains/${o}/${d}`,        tracked: false },
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
  AI:'Air India', '6E':'IndiGo', UK:'Vistara', IX:'Air India Express',
  EY:'Etihad', FZ:'flydubai', 'G9':'Air Arabia',
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

// ─── Price Alert Button ───────────────────────────────────────────────────────
function PriceAlertButton({ flight, intent }: { flight: FlightOption; intent: TripIntent }) {
  const [status, setStatus] = useState<'idle'|'loading'|'set'|'error'>('idle');
  const [targetPrice, setTargetPrice] = useState('');
  const [showInput, setShowInput] = useState(false);

  const setAlert = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/price-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin:      flight.origin,
          destination: flight.destination,
          date:        intent.departureDate,
          targetPrice: targetPrice ? Number(targetPrice) : flight.price * 0.9,
          currency:    intent.currency || flight.currency || 'USD',
        }),
      });
      if (res.ok) { setStatus('set'); setShowInput(false); }
      else { const e = await res.json(); if (e.error?.includes('Unauthorized')) setStatus('error'); else setStatus('set'); }
    } catch { setStatus('error'); }
  };

  if (status === 'set') return (
    <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>🔔 Alert set — we'll notify you if price drops</span>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {showInput && (
        <input
          type="number" placeholder={`Target price (now ${flight.price})`}
          value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
          style={{ width: 140, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--navy-border)', background: 'var(--navy-light)', color: 'var(--text)', fontSize: 12, fontFamily: 'DM Sans' }}
        />
      )}
      <button
        onClick={() => showInput ? setAlert() : setShowInput(true)}
        disabled={status === 'loading'}
        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(45,212,160,0.3)', background: 'rgba(45,212,160,0.08)', color: 'var(--green)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans', whiteSpace: 'nowrap' }}>
        {status === 'loading' ? '...' : showInput ? '🔔 Confirm Alert' : '🔔 Alert me if cheaper'}
      </button>
      {showInput && <button onClick={() => setShowInput(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
    </div>
  );
}

// ─── Single flight row ────────────────────────────────────────────────────────
function FlightRow({ flight, intent, rank, onBook }: {
  flight: FlightOption & { isPlaceholder?: boolean };
  intent: TripIntent;
  rank: number;
  onBook: (partner: string, url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Placeholder: no live data, just link to search
  if ((flight as any).isPlaceholder) {
    return (
      <div style={{ borderRadius: 12, border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
            {flight.origin} → {flight.destination}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            No live fares available — search directly on flight booking sites
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { name: 'Google Flights', url: `https://www.google.com/travel/flights?q=flights+from+${flight.origin}+to+${flight.destination}`, color: '#4285F4' },
            { name: 'Skyscanner', url: `https://www.skyscanner.com/transport/flights/${flight.origin}/${flight.destination}/`, color: '#00A698' },
            { name: 'Kiwi.com', url: `https://www.kiwi.com/en/search/results/${flight.origin}/${flight.destination}/`, color: '#E5422B' },
          ].map(l => (
            <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '7px 14px', borderRadius: 7, background: `${l.color}18`, border: `1px solid ${l.color}40`, color: l.color, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {l.name} ↗
            </a>
          ))}
        </div>
      </div>
    );
  }

  const links = buildFlightLinks(flight, intent);

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
            {fmtPrice(flight.price, intent.currency || flight.currency || 'USD')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>{intent.currency || flight.currency} · per person</div>
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
            {/* Direct Kiwi link if available — best price guarantee */}
            {(flight as any).bookingUrl && (
              <a href={(flight as any).bookingUrl} target="_blank" rel="noopener noreferrer"
                onClick={() => onBook('Kiwi.com', (flight as any).bookingUrl)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 7, background: 'linear-gradient(135deg,#E5422B,#c73220)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans', textDecoration: 'none' }}>
                🌐 Book on Kiwi.com
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 5px' }}>Live price</span>
              </a>
            )}
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
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              ✓ Booking saved to My Trips automatically when you click a partner.
            </p>
            <PriceAlertButton flight={flight} intent={intent} />
          </div>
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
  const [starFilter, setStarFilter] = useState<number | null>((intent as any).preferences?.hotelStars || null);
  const [sortH, setSortH]           = useState<'price' | 'stars' | 'rating'>('price');
  const [showAll, setShowAll]       = useState(false);

  const links       = buildHotelLinks(intent);
  const hotelCity   = (intent as any).hotelDestination || intent.destination || '';
  const nights      = (intent as any).nights || null;

  // Filter + sort
  const filtered = hotels
    .filter(h => !starFilter || h.stars >= starFilter)
    .sort((a, b) =>
      sortH === 'price'  ? a.pricePerNight - b.pricePerNight :
      sortH === 'stars'  ? b.stars - a.stars :
      b.rating - a.rating
    );
  const displayed = showAll ? filtered : filtered.slice(0, 5);

  return (
    <div style={{ marginTop: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          🏨 Hotels in {hotelCity.toUpperCase()}
          {nights && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>· {nights} nights</span>}
        </h3>
        {/* Sort */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Sort:</span>
          {(['price','stars','rating'] as const).map(k => (
            <button key={k} onClick={() => setSortH(k)}
              style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${sortH===k?'var(--gold)':'var(--navy-border)'}`, background: sortH===k?'rgba(232,160,32,0.12)':'transparent', color: sortH===k?'var(--gold)':'var(--text-dim)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans', textTransform: 'capitalize' }}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Star filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center' }}>Category:</span>
        {[null, 3, 4, 5].map(s => (
          <button key={s ?? 'all'} onClick={() => setStarFilter(s)}
            style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${starFilter===s?'var(--gold)':'var(--navy-border)'}`, background: starFilter===s?'rgba(232,160,32,0.15)':'transparent', color: starFilter===s?'var(--gold)':'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}>
            {s === null ? 'All' : s === 5 ? '⭐⭐⭐⭐⭐ Luxury' : s === 4 ? '⭐⭐⭐⭐ Upscale' : '⭐⭐⭐ Standard'}
          </button>
        ))}
      </div>

      {/* Hotel cards */}
      {displayed.map((hotel, i) => (
        <div key={hotel.id} style={{ border: `1px solid ${i===0&&sortH==='price'?'rgba(232,160,32,0.3)':'var(--navy-border)'}`, borderRadius: 12, background: i===0&&sortH==='price'?'rgba(232,160,32,0.04)':'var(--navy-mid)', padding: '16px 20px', marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start', gap: 16 }}>
            <div>
              {i === 0 && sortH === 'price' && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', marginBottom: 4, letterSpacing: '0.08em' }}>★ BEST PRICE</div>}
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{hotel.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                {'★'.repeat(Math.min(hotel.stars || 3, 5))}{'☆'.repeat(Math.max(5-(hotel.stars||3),0))}
                {hotel.rating > 0 && <span style={{ marginLeft: 8 }}>· {hotel.rating.toFixed(1)} guest rating</span>}
                {hotel.address && <span style={{ marginLeft: 8 }}>· {hotel.address}</span>}
              </div>
              {hotel.amenities?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {hotel.amenities.slice(0, 4).map(a => (
                    <span key={a} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }}>{a}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                {fmtPrice(hotel.pricePerNight, intent.currency || hotel.currency || 'USD')}<span style={{ fontSize: 13, fontWeight: 400 }}>/night</span>
              </div>
              {nights && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>≈ {fmtPrice(hotel.pricePerNight * nights, intent.currency || hotel.currency || 'USD')} total</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {links.map(p => (
                  <button key={p.name}
                    onClick={() => { window.open(p.url, '_blank'); onBook('hotel', p.name, p.url, { hotel: hotel.name, destination: hotelCity }); }}
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
        </div>
      ))}
      {filtered.length > 5 && !showAll && (
        <button onClick={() => setShowAll(true)}
          style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--navy-border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans', marginBottom: 8 }}>
          Show {filtered.length - 5} more hotels ↓
        </button>
      )}
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
export default function ConfirmationStage({ itineraries, intent, onSaveBooking, cars = [] }: {
  itineraries: Itinerary[];
  intent: TripIntent;
  onSaveBooking: (type: string, partner: string, url: string, details: object) => void;
  cars?: any[];
}) {
  const [sort, setSort]   = useState<SortKey>('price');
  const [saved, setSaved] = useState<string[]>([]);

  const nationality = intent.constraints?.visaPassport || (intent as any).nationality || '';
  const services    = (intent.services && intent.services.length > 0) ? intent.services : ['flight', 'hotel'];
  const wantFlight  = services.includes('flight');
  const wantHotel   = services.includes('hotel');
  const wantCar     = services.includes('car');
  const wantTrain   = services.includes('train');

  // Detect multi-city
  const isMultiCity = (intent as any).tripType === 'multicity' || (intent as any).legs?.length > 1;
  const intentLegs  = (intent as any).legs || [];

  // Detect trip type
  const isReturn = (intent as any).tripType === 'return' || 
                   (!isMultiCity && !!intent.returnDate);

  // Collect all unique flights across itineraries
  const allFlights = Array.from(
    new Map(
      itineraries.flatMap(it => it.flights).map(f => [f.id, f])
    ).values()
  );

  // ── Split outbound vs inbound for return trips ───────────────────────────
  // Amadeus returns both legs in the same flights array.
  // Outbound: origin matches intent.origin
  // Inbound:  origin matches intent.destination (the return leg)
  const outboundFlights = isReturn
    ? allFlights.filter(f =>
        f.origin?.toUpperCase() === intent.origin?.toUpperCase()
      )
    : allFlights;

  const inboundFlights = isReturn
    ? allFlights.filter(f =>
        f.origin?.toUpperCase() === intent.destination?.toUpperCase()
      )
    : [];

  // Group flights by leg for multi-city display
  const flightsByLeg: Record<number, typeof allFlights> = {};
  if (isMultiCity) {
    allFlights.forEach(f => {
      const idx = (f as any).legIndex ?? 0;
      if (!flightsByLeg[idx]) flightsByLeg[idx] = [];
      flightsByLeg[idx].push(f);
    });
  }


  // Collect hotels
  const allHotels = Array.from(
    new Map(
      itineraries.flatMap(it => it.hotels).map(h => [h.id, h])
    ).values()
  );

  const sortFn = (a: FlightOption, b: FlightOption) => {
    if (sort === 'price')    return a.price - b.price;
    if (sort === 'duration') return parseDuration(a.duration) - parseDuration(b.duration);
    if (sort === 'stops')    return a.stops - b.stops;
    return 0;
  };

  // Sort both pools independently
  const sorted         = [...outboundFlights].sort(sortFn);
  const sortedInbound  = [...inboundFlights].sort(sortFn);

  // Stats based on outbound (primary pool)
  const statFlights = sorted.length > 0 ? sorted : allFlights;
  const minPrice = statFlights.length ? Math.min(...statFlights.map(f => f.price)) : 0;
  const maxPrice = statFlights.length ? Math.max(...statFlights.map(f => f.price)) : 0;



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
          {isMultiCity && intentLegs.length > 0
            ? intentLegs.map((l: any, i: number) => `${l.from}→${l.to} (${l.date || ''})`).join(' · ')
            : `${intent.origin?.toUpperCase()} → ${intent.destination?.toUpperCase()}`}
          {!isMultiCity && intent.departureDate && ` · ${new Date(intent.departureDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
          {!isMultiCity && intent.returnDate && ` · Return ${new Date(intent.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          {` · ${intent.travelers || 1} passenger${(intent.travelers||1)>1?'s':''} · ${intent.preferences?.cabinClass || 'Economy'} · ${intent.currency || 'USD'}`}
        </p>
        {nationality && !/^[A-Z]{3}$/.test(nationality.toUpperCase()) && (
          <VisaChecker nationality={nationality} destination={intent.destination} inline={true} hideOnUnknown={true} />
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
      {wantFlight && isMultiCity && Object.keys(flightsByLeg).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(flightsByLeg).map(([legIdxStr, legFlights]) => {
            const legIdx = parseInt(legIdxStr);
            const leg = intentLegs[legIdx];
            return (
              <div key={legIdx}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 14px', borderRadius: 8, background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.2)' }}>
                  <span style={{ fontSize: 16 }}>✈</span>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14 }}>Leg {legIdx + 1}: {leg?.from || ''} → {leg?.to || ''}</span>
                    {leg?.date && <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 10 }}>{new Date(leg.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>{legFlights.length} option{legFlights.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {legFlights.sort((a, b) => a.price - b.price).map((flight, i) => (
                    <FlightRow key={flight.id} flight={flight} intent={intent}
                      rank={i + 1} onBook={(p, u) => handleBook(p, u, flight)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

       {/* Single route / return flight list */}
      {wantFlight && !isMultiCity && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Outbound leg ── */}
          <div>
            {isReturn && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 10, padding: '8px 14px', borderRadius: 8,
                background: 'rgba(232,160,32,0.08)',
                border: '1px solid rgba(232,160,32,0.2)',
              }}>
                <span style={{ fontSize: 16 }}>✈</span>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14 }}>
                    Outbound: {intent.origin?.toUpperCase()} → {intent.destination?.toUpperCase()}
                  </span>
                  {intent.departureDate && (
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 10 }}>
                      {new Date(intent.departureDate).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  {sorted.length} option{sorted.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sorted.length > 0 ? (
                sorted.map((flight, i) => (
                  <FlightRow
                    key={flight.id}
                    flight={flight}
                    intent={intent}
                    rank={i}
                    onBook={(partner, url) => handleBook(partner, url, flight)}
                  />
                ))
              ) : (
                <div style={{
                  padding: '20px', borderRadius: 10,
                  background: 'var(--navy-mid)',
                  border: '1px solid var(--navy-border)',
                  textAlign: 'center',
                  color: 'var(--text-dim)', fontSize: 13,
                }}>
                  No outbound flights found for this route.
                </div>
              )}
            </div>
          </div>

          {/* ── Return/inbound leg (only for return trips) ── */}
          {isReturn && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 10, padding: '8px 14px', borderRadius: 8,
                background: 'rgba(45,212,160,0.06)',
                border: '1px solid rgba(45,212,160,0.2)',
              }}>
                <span style={{ fontSize: 16 }}>✈</span>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 14 }}>
                    Return: {intent.destination?.toUpperCase()} → {intent.origin?.toUpperCase()}
                  </span>
                  {intent.returnDate && (
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 10 }}>
                      {new Date(intent.returnDate).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  {sortedInbound.length} option{sortedInbound.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sortedInbound.length > 0 ? (
                  sortedInbound.map((flight, i) => (
                    <FlightRow
                      key={flight.id}
                      flight={flight}
                      intent={{ ...intent, departureDate: intent.returnDate || intent.departureDate }}
                      rank={i}
                      onBook={(partner, url) => handleBook(partner, url, flight)}
                    />
                  ))
                ) : (
                  <div style={{
                    padding: '20px', borderRadius: 10,
                    background: 'var(--navy-mid)',
                    border: '1px solid var(--navy-border)',
                    textAlign: 'center',
                    color: 'var(--text-dim)', fontSize: 13,
                  }}>
                    No return flights found. Try adjusting your return date.
                  </div>
                )}
              </div>
            </div>
          )}

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
            <div style={{ width: '100%', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '16px 20px', background: 'var(--navy-mid)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🚗 Car Rental</div>
              {cars.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cars.slice(0, 5).map((car: any) => (
                    <div key={car.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{car.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>
                          {car.category} · {car.seats} seats · {car.transmission} · {car.provider}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {car.features?.slice(0,3).map((f: string) => (
                            <span key={f} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(45,212,160,0.1)', color: 'var(--green)' }}>{f}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif', whiteSpace: 'nowrap' }}>
                          {fmtPrice(car.pricePerDay, intent.currency || car.currency)}<span style={{ fontSize: 12, fontWeight: 400 }}>/day</span>
                        </div>
                        {car.totalPrice > 0 && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>≈ {fmtPrice(car.totalPrice, intent.currency || car.currency)} total</div>}
                        <a href={car.bookingUrl} target="_blank" rel="noopener noreferrer"
                          onClick={() => onSaveBooking('car', car.provider, car.bookingUrl, { car: car.name })}
                          style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 6, background: 'var(--gold)', color: 'var(--navy)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                          Book ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {buildCarLinks(intent).map(p => (
                    <button key={p.name} onClick={() => { window.open(p.url, '_blank'); onSaveBooking('car', p.name, p.url, {}); }}
                      style={{ padding: '7px 13px', borderRadius: 6, background: 'var(--navy-light)', border: `1px solid ${p.color}50`, color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                      {p.icon} {p.name} ↗
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {wantTrain && (
            <div style={{ flex: 1, minWidth: 240, border: '1px solid var(--navy-border)', borderRadius: 12, padding: '16px 20px', background: 'var(--navy-mid)' }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>🚂 Train</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {buildTrainLinks(intent).map(p => (
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
