'use client';
import { useEffect, useState } from 'react';

interface Trip {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'train';
  partner_name: string;
  partner_url: string;
  details: any;
  status: string;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = { flight: '✈', hotel: '🏨', car: '🚗', train: '🚂' };
const TYPE_COLOR: Record<string, string> = { flight: 'var(--gold)', hotel: '#4285F4', car: '#E87722', train: '#00C853' };

function TripCard({ trip, onDelete }: { trip: Trip; onDelete: (id: string) => void }) {
  const d = trip.details || {};
  const icon  = TYPE_ICON[trip.type] || '📋';
  const color = TYPE_COLOR[trip.type] || 'var(--gold)';

  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}`, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              {trip.type === 'flight' ? `${d.from || '?'} → ${d.to || '?'}` :
               trip.type === 'hotel'  ? `Hotel · ${d.destination || '?'}` :
               trip.type === 'car'    ? `Car Rental · ${d.destination || '?'}` :
                                        `Train · ${d.from || '?'} → ${d.to || '?'}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Booked via {trip.partner_name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-green">✓ {trip.status}</span>
          <button onClick={() => onDelete(trip.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
        {d.date && <div style={{ background: 'var(--navy-light)', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase' }}>Date</div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.date}</div></div>}
        {d.returnDate && <div style={{ background: 'var(--navy-light)', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase' }}>Return</div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.returnDate}</div></div>}
        {d.checkIn && <div style={{ background: 'var(--navy-light)', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase' }}>Check-in</div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.checkIn}</div></div>}
        {d.checkOut && <div style={{ background: 'var(--navy-light)', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase' }}>Check-out</div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.checkOut}</div></div>}
        {d.travelers && <div style={{ background: 'var(--navy-light)', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase' }}>Travelers</div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.travelers}</div></div>}
        {d.estimatedPrice && <div style={{ background: 'var(--navy-light)', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase' }}>Est. Price</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>${Number(d.estimatedPrice).toLocaleString()}</div></div>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <a href={trip.partner_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <button className="btn btn-navy" style={{ fontSize: 12, padding: '7px 14px' }}>↗ View on {trip.partner_name}</button>
        </a>
      </div>
    </div>
  );
}

export default function MyTripsTab({ userId }: { userId?: string }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all'|'flight'|'hotel'|'car'|'train'>('all');

  useEffect(() => {
    // Load from localStorage as fallback (no auth yet)
    const stored = localStorage.getItem('nomadpilot_trips');
    if (stored) {
      try { setTrips(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    const updated = trips.filter(t => t.id !== id);
    setTrips(updated);
    localStorage.setItem('nomadpilot_trips', JSON.stringify(updated));
  };

  const filtered = filter === 'all' ? trips : trips.filter(t => t.type === filter);

  const stats = {
    flights: trips.filter(t => t.type === 'flight').length,
    hotels:  trips.filter(t => t.type === 'hotel').length,
    cars:    trips.filter(t => t.type === 'car').length,
    trains:  trips.filter(t => t.type === 'train').length,
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
        <div className="spin" style={{ fontSize: 28, marginBottom: 12 }}>◌</div>
        <p>Loading your trips...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 0' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 6 }}>My Trips</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>All your bookings in one place</p>
      </div>

      {trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--navy-mid)', borderRadius: 16, border: '1px dashed var(--navy-border)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✈</div>
          <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No trips yet</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 15, maxWidth: 340, margin: '0 auto' }}>
            Search for flights, hotels, cars or trains — when you click a partner to book, it'll appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Flights', count: stats.flights, icon: '✈', color: 'var(--gold)' },
              { label: 'Hotels',  count: stats.hotels,  icon: '🏨', color: '#4285F4' },
              { label: 'Cars',    count: stats.cars,    icon: '🚗', color: '#E87722' },
              { label: 'Trains',  count: stats.trains,  icon: '🚂', color: '#00C853' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center', padding: 14, borderTop: `2px solid ${s.color}` }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {(['all','flight','hotel','car','train'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--navy-border)'}`, background: filter === f ? 'rgba(232,160,32,0.12)' : 'var(--navy-light)', color: filter === f ? 'var(--gold)' : 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                {f === 'all' ? `All (${trips.length})` : `${TYPE_ICON[f]} ${f}s (${stats[f as keyof typeof stats]})`}
              </button>
            ))}
          </div>

          {/* Trip list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(trip => (
              <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
