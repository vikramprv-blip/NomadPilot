'use client';

import { useState } from 'react';
import { Itinerary, TripIntent } from '@/types';

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Syne' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{value}</span>
      </div>
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ItineraryCard({
  itinerary,
  index,
  selected,
  onSelect,
}: {
  itinerary: Itinerary;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const flight = itinerary.flights[0];
  const hotel = itinerary.hotels[0];

  return (
    <div
      onClick={onSelect}
      style={{
        border: `2px solid ${selected ? 'var(--sky)' : 'var(--night-border)'}`,
        borderRadius: 16, padding: 24, cursor: 'pointer',
        background: selected ? 'rgba(14,165,233,0.06)' : 'var(--night-mid)',
        transition: 'all 0.25s',
        position: 'relative',
      }}
    >
      {index === 0 && (
        <div style={{ position: 'absolute', top: -12, left: 20 }}>
          <span className="badge badge-sky">★ Best Match</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Option {index + 1}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-sky">{flight?.stops === 0 ? 'Nonstop' : `${flight?.stops} stop`}</span>
            <span className="badge badge-amber">{flight?.cabin}</span>
            {itinerary.score.esg > 70 && <span className="badge badge-green">🌿 Eco</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne' }}>
            ${itinerary.totalCost.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>total est.</div>
        </div>
      </div>

      {/* Flight */}
      {flight && (
        <div style={{
          background: 'var(--night-light)', borderRadius: 10, padding: '12px 16px',
          marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 2 }}>✈ Flight</div>
            <div style={{ fontWeight: 600 }}>{flight.airline} {flight.flightNumber}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {new Date(flight.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
              {new Date(flight.arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' · '}{flight.duration}
            </div>
          </div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>
            ${flight.price.toLocaleString()}
          </div>
        </div>
      )}

      {/* Hotel */}
      {hotel && (
        <div style={{
          background: 'var(--night-light)', borderRadius: 10, padding: '12px 16px',
          marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 2 }}>🏨 Hotel</div>
            <div style={{ fontWeight: 600 }}>{hotel.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {'★'.repeat(hotel.stars)} · ${hotel.pricePerNight}/night
            </div>
          </div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>
            ${hotel.totalPrice.toLocaleString()}
          </div>
        </div>
      )}

      {/* Scores */}
      <div style={{ borderTop: '1px solid var(--night-border)', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `conic-gradient(var(--sky) ${itinerary.score.overall * 3.6}deg, var(--night-border) 0)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--night-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
              {itinerary.score.overall}
            </div>
          </div>
          <span style={{ fontSize: 13, fontFamily: 'Syne', fontWeight: 600 }}>NomadPilot Score</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <ScoreBar label="Price" value={itinerary.score.price} />
          <ScoreBar label="Time" value={itinerary.score.time} />
          <ScoreBar label="Convenience" value={itinerary.score.convenience} />
          <ScoreBar label="ESG" value={itinerary.score.esg} />
        </div>
      </div>

      {selected && (
        <div style={{
          marginTop: 16, padding: '10px 0',
          borderTop: '1px solid rgba(14,165,233,0.2)',
          display: 'flex', justifyContent: 'center',
          color: 'var(--sky)', fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
          letterSpacing: '0.05em',
        }}>
          ✓ SELECTED
        </div>
      )}
    </div>
  );
}

export default function ConfirmationStage({
  itineraries,
  intent,
  onConfirm,
}: {
  itineraries: Itinerary[];
  intent: TripIntent;
  onConfirm: (itinerary: Itinerary) => void;
}) {
  const [selected, setSelected] = useState<string>(itineraries[0]?.id);

  const selectedItinerary = itineraries.find(i => i.id === selected);

  return (
    <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          Your top options ✦
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 16 }}>
          {intent.origin} → {intent.destination} · {new Date(intent.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {intent.returnDate && ` → ${new Date(intent.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          {intent.budget && ` · Budget $${intent.budget.toLocaleString()}`}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        {itineraries.map((it, i) => (
          <ItineraryCard
            key={it.id}
            itinerary={it}
            index={i}
            selected={it.id === selected}
            onSelect={() => setSelected(it.id)}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          ← Start over
        </button>
        <button
          className="btn btn-primary"
          onClick={() => selectedItinerary && onConfirm(selectedItinerary)}
          disabled={!selectedItinerary}
          style={{ padding: '14px 32px', fontSize: 16 }}
        >
          Book Option {itineraries.findIndex(i => i.id === selected) + 1} →
        </button>
      </div>
    </div>
  );
}
