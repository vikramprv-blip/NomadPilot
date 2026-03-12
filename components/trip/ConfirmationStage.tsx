'use client';
import { useState } from 'react';
import { Itinerary, TripIntent } from '@/types';
import VisaChecker from '@/components/trip/VisaChecker';

// ─── Deep-link builders ───────────────────────────────────────────────────────
function flightLinks(intent: TripIntent) {
  const o = intent.origin || '', d = intent.destination || '';
  const dep = intent.departureDate || '', ret = intent.returnDate || '';
  const pax = intent.travelers || 1;
  const cls = intent.preferences?.cabinClass || 'economy';
  return [
    { name: 'Skyscanner',     color: '#00A698', icon: '✈', url: `https://www.skyscanner.com/transport/flights/${o}/${d}/${dep}/${ret}/?adults=${pax}&cabinclass=${cls}` },
    { name: 'Expedia',        color: '#FFC72C', icon: '✈', url: `https://www.expedia.com/Flights-Search?leg1=from:${o},to:${d},departure:${dep}&passengers=adults:${pax}` },
    { name: 'MakeMyTrip',     color: '#E8175D', icon: '✈', url: `https://www.makemytrip.com/flights/international-flights/${o.toLowerCase()}-${d.toLowerCase()}.html` },
    { name: 'Google Flights', color: '#4285F4', icon: '✈', url: `https://www.google.com/travel/flights?q=flights+from+${o}+to+${d}` },
  ];
}
function hotelLinks(intent: TripIntent) {
  const d = encodeURIComponent(intent.destination || '');
  const ci = intent.departureDate || '', co = intent.returnDate || '';
  const pax = intent.travelers || 1;
  return [
    { name: 'Booking.com',    color: '#003580', icon: '🏨', url: `https://www.booking.com/searchresults.html?ss=${d}&checkin=${ci}&checkout=${co}&group_adults=${pax}` },
    { name: 'Hotels.com',     color: '#D32F2F', icon: '🏨', url: `https://www.hotels.com/search.do?q-destination=${d}&q-check-in=${ci}&q-check-out=${co}&q-room-0-adults=${pax}` },
    { name: 'Expedia Hotels', color: '#FFC72C', icon: '🏨', url: `https://www.expedia.com/Hotel-Search?destination=${d}&startDate=${ci}&endDate=${co}&adults=${pax}` },
    { name: 'MakeMyTrip',     color: '#E8175D', icon: '🏨', url: `https://www.makemytrip.com/hotels/hotel-listing/?checkin=${ci}&checkout=${co}&city=${d}` },
  ];
}
function carLinks(intent: TripIntent) {
  const d = encodeURIComponent(intent.destination || '');
  return [
    { name: 'Rentalcars.com', color: '#E87722', icon: '🚗', url: `https://www.rentalcars.com/SearchResults.do?country=${d}` },
    { name: 'Expedia Cars',   color: '#FFC72C', icon: '🚗', url: `https://www.expedia.com/carsearch?locn=${d}` },
    { name: 'Skyscanner Cars',color: '#00A698', icon: '🚗', url: `https://www.skyscanner.com/car-hire` },
  ];
}
function trainLinks(intent: TripIntent) {
  const o = encodeURIComponent(intent.origin || '');
  const d = encodeURIComponent(intent.destination || '');
  return [
    { name: 'Trainline',   color: '#00C853', icon: '🚂', url: `https://www.thetrainline.com/search/${o}/${d}` },
    { name: 'Rail Europe', color: '#1565C0', icon: '🚂', url: `https://www.raileurope.com` },
    { name: 'Omio',        color: '#6200EA', icon: '🚂', url: `https://www.omio.com/trains/${o}/${d}` },
  ];
}

// ─── Partner booking button ───────────────────────────────────────────────────
function PartnerBtn({ name, color, icon, url, onBook }: {
  name: string; color: string; icon: string; url: string;
  onBook: () => void;
}) {
  return (
    <button
      onClick={() => { window.open(url, '_blank'); onBook(); }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 8, background: 'var(--navy-light)', border: `1px solid ${color}30`, color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'DM Sans' }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.background = `${color}18`; el.style.color = color; el.style.borderColor = color; }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'var(--navy-light)'; el.style.color = 'var(--text)'; el.style.borderColor = `${color}30`; }}
    >
      {icon} {name} <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>
    </button>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-light)' }}>{value}</span>
      </div>
      <div className="score-bar"><div className="score-bar-fill" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

// ─── Itinerary card ───────────────────────────────────────────────────────────
function ItineraryCard({ it, index, intent, onSaveBooking }: {
  it: Itinerary; index: number; intent: TripIntent;
  onSaveBooking: (type: string, partner: string, url: string, details: object) => void;
}) {
  const flight  = it.flights[0];
  const hotel   = it.hotels[0];
  const services = (intent.services && intent.services.length > 0) ? intent.services : ['flight', 'hotel', 'car', 'train'];
  const wantFlight = services.includes('flight');
  const wantHotel  = services.includes('hotel');
  const wantCar    = services.includes('car');
  const wantTrain  = services.includes('train');

  // Default open tab: first selected service
  const defaultTab = wantFlight ? 'flights' : wantHotel ? 'hotels' : wantCar ? 'cars' : wantTrain ? 'trains' : null;
  const [section, setSection] = useState<'flights'|'hotels'|'cars'|'trains'|null>(defaultTab as any);
  const [saved, setSaved]     = useState<string[]>([]);

  const handleBook = (type: string, name: string, url: string, details: object) => {
    onSaveBooking(type, name, url, details);
    setSaved(p => [...p, `${type}-${name}`]);
  };

  // Only show total cost for selected services
  const displayCost = wantHotel ? it.totalCost : (flight?.price || 0);

  // Build visible tab list from selected services
  const tabs: [string, string][] = [];
  if (wantFlight) tabs.push(['flights', '✈ Flights']);
  if (wantHotel)  tabs.push(['hotels',  '🏨 Hotels']);
  if (wantCar)    tabs.push(['cars',    '🚗 Cars']);
  if (wantTrain)  tabs.push(['trains',  '🚂 Trains']);

  return (
    <div style={{ border: '1px solid var(--navy-border)', borderRadius: 14, background: 'var(--navy-mid)', overflow: 'hidden' }}>
      {index === 0 && (
        <div style={{ background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.06em' }}>★ BEST MATCH</span>
        </div>
      )}

      <div style={{ padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Option {index + 1}</h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {wantFlight && <span className="badge badge-navy">{flight?.stops === 0 ? 'Nonstop' : `${flight?.stops} stop`}</span>}
              {wantFlight && <span className="badge badge-gold">{flight?.cabin}</span>}
              {it.score.esg > 70 && <span className="badge badge-green">🌿 Eco</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', color: 'var(--gold)' }}>${displayCost.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>est. total</div>
          </div>
        </div>

        {/* Flight summary — only if flights selected */}
        {wantFlight && flight && (
          <div style={{ background: 'var(--navy-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>✈ Flight</div>
                <div style={{ fontWeight: 600 }}>{flight.airline} · {flight.origin} → {flight.destination}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{flight.duration} · {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop`}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--gold-light)' }}>${flight.price.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Hotel summary — only if hotels selected */}
        {wantHotel && hotel && (
          <div style={{ background: 'var(--navy-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>🏨 Hotel</div>
                <div style={{ fontWeight: 600 }}>{hotel.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{'★'.repeat(hotel.stars)} · ${hotel.pricePerNight}/night</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--gold-light)' }}>${hotel.totalPrice.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Visa row from Gemini itinerary data */}
        <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 7, background: it.visaRequired ? 'rgba(232,85,85,0.08)' : 'rgba(45,212,160,0.07)', border: `1px solid ${it.visaRequired ? 'rgba(232,85,85,0.2)' : 'rgba(45,212,160,0.2)'}`, fontSize: 12, color: it.visaRequired ? 'var(--red)' : 'var(--green)' }}>
          {it.visaRequired ? `🛂 Visa required · ${it.visaInfo}` : '✓ No visa required for this destination'}
        </div>

        {/* Scores */}
        <div style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>NomadPilot Score — {it.score.overall}/100</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <ScoreBar label="Price"       value={it.score.price} />
            <ScoreBar label="Time"        value={it.score.time} />
            <ScoreBar label="Convenience" value={it.score.convenience} />
            <ScoreBar label="ESG"         value={it.score.esg} />
          </div>
        </div>

        {/* Book via partner section */}
        <div style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Book directly with partner · Saved to My Trips automatically</p>
            {saved.length > 0 && <span className="badge badge-green">✓ {saved.length} saved</span>}
          </div>

          {/* Category tabs — only show selected services */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {tabs.map(([id, label]) => (
              <button key={id} onClick={() => setSection(section === id ? null : id as any)} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${section === id ? 'var(--gold)' : 'var(--navy-border)'}`, background: section === id ? 'rgba(232,160,32,0.12)' : 'var(--navy-light)', color: section === id ? 'var(--gold)' : 'var(--text-dim)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Partner buttons */}
          {section === 'flights' && wantFlight && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {flightLinks(intent).map(p => (
                <PartnerBtn key={p.name} {...p} onBook={() => handleBook('flight', p.name, p.url, { from: intent.origin, to: intent.destination, date: intent.departureDate, returnDate: intent.returnDate, travelers: intent.travelers, estimatedPrice: flight?.price })} />
              ))}
            </div>
          )}
          {section === 'hotels' && wantHotel && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {hotelLinks(intent).map(p => (
                <PartnerBtn key={p.name} {...p} onBook={() => handleBook('hotel', p.name, p.url, { destination: intent.destination, checkIn: intent.departureDate, checkOut: intent.returnDate, travelers: intent.travelers, estimatedPrice: hotel?.totalPrice })} />
              ))}
            </div>
          )}
          {section === 'cars' && wantCar && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {carLinks(intent).map(p => (
                <PartnerBtn key={p.name} {...p} onBook={() => handleBook('car', p.name, p.url, { destination: intent.destination, pickUp: intent.departureDate, dropOff: intent.returnDate })} />
              ))}
            </div>
          )}
          {section === 'trains' && wantTrain && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {trainLinks(intent).map(p => (
                <PartnerBtn key={p.name} {...p} onBook={() => handleBook('train', p.name, p.url, { from: intent.origin, to: intent.destination, date: intent.departureDate })} />
              ))}
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
            Clicking a partner opens their site in a new tab. Your booking details are saved to My Trips automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConfirmationStage({ itineraries, intent, onSaveBooking }: {
  itineraries: Itinerary[];
  intent: TripIntent;
  onSaveBooking: (type: string, partner: string, url: string, details: object) => void;
}) {
  const nationality = intent.constraints?.visaPassport || (intent as any).nationality || '';

  // Debug in browser console
  if (typeof window !== 'undefined') {
    console.log('[ConfirmationStage] itineraries:', itineraries?.length, 'services:', intent.services);
  }

  return (
    <div className="fade-up" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 34, fontWeight: 700, marginBottom: 6 }}>Your top options</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 15, marginBottom: 16 }}>
          {intent.origin} → {intent.destination}
          {intent.departureDate && ` · ${new Date(intent.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          {intent.returnDate && ` → ${new Date(intent.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        </p>
        {nationality && !/^[A-Z]{3}$/.test(nationality.toUpperCase()) && (
          <VisaChecker
            nationality={nationality}
            destination={intent.destination}
            inline={true}
          />
        )}
      </div>

      {(!itineraries || itineraries.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✈</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>No results found</h3>
          <p style={{ fontSize: 14, marginBottom: 16 }}>
            No flights found for {(intent.origin || '').toUpperCase()} → {(intent.destination || '').toUpperCase()} on {intent.departureDate}.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Try different dates, or note that the Amadeus test environment has limited routes.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {itineraries.map((it, i) => (
            <ItineraryCard key={it.id} it={it} index={i} intent={intent} onSaveBooking={onSaveBooking} />
          ))}
        </div>
      )}
    </div>
  );
}
