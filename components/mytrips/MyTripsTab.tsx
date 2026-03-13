'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Trip {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'train';
  partner_name: string;
  partner_url: string;
  details: any;
  status: string;
  created_at: string;
}

const TYPE_ICON:  Record<string, string> = { flight:'✈', hotel:'🏨', car:'🚗', train:'🚂' };
const TYPE_COLOR: Record<string, string> = { flight:'var(--gold)', hotel:'#4285F4', car:'#E87722', train:'#00C853' };

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
  catch { return iso; }
}

function TripCard({ trip, onDelete }: { trip: Trip; onDelete: (id: string) => void }) {
  const d     = trip.details || {};
  const icon  = TYPE_ICON[trip.type]  || '📋';
  const color = TYPE_COLOR[trip.type] || 'var(--gold)';

  const title =
    trip.type === 'flight' ? `${d.from || '?'} → ${d.to || '?'}` :
    trip.type === 'hotel'  ? `Hotel · ${d.destination || d.hotel || '?'}` :
    trip.type === 'car'    ? `Car · ${d.destination || d.car || '?'}` :
                             `Train · ${d.from || '?'} → ${d.to || '?'}`;

  const metaItems = [
    d.airline      && { label: 'Airline',    value: d.airline },
    d.flightNumber && { label: 'Flight',     value: d.flightNumber },
    d.date         && { label: 'Date',       value: fmtDate(d.date) },
    d.returnDate   && { label: 'Return',     value: fmtDate(d.returnDate) },
    d.checkIn      && { label: 'Check-in',   value: fmtDate(d.checkIn) },
    d.checkOut     && { label: 'Check-out',  value: fmtDate(d.checkOut) },
    d.travelers    && { label: 'Travelers',  value: String(d.travelers) },
    d.price        && { label: 'Price',      value: `${d.currency || '$'}${Number(d.price).toLocaleString()}`, gold: true },
  ].filter(Boolean) as { label: string; value: string; gold?: boolean }[];

  return (
    <div style={{ border: '1px solid var(--navy-border)', borderLeft: `3px solid ${color}`, borderRadius: 12, background: 'var(--navy-mid)', padding: '16px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: metaItems.length ? 12 : 0 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{icon}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>{title}</div>
            <div style={{ fontSize:12, color:'var(--text-dim)' }}>
              via {trip.partner_name} · {fmtDate(trip.created_at)}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background:'rgba(45,212,160,0.12)', color:'var(--green)', letterSpacing:'0.05em' }}>✓ SAVED</span>
          <button onClick={() => onDelete(trip.id)}
            style={{ background:'none', border:'1px solid var(--navy-border)', borderRadius:6, color:'var(--text-muted)', cursor:'pointer', fontSize:14, padding:'3px 8px', lineHeight:1 }}>✕</button>
        </div>
      </div>

      {metaItems.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8, marginBottom:12 }}>
          {metaItems.map(m => (
            <div key={m.label} style={{ background:'var(--navy-light)', borderRadius:6, padding:'6px 10px' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.04em' }}>{m.label}</div>
              <div style={{ fontSize:13, fontWeight:600, color: m.gold ? 'var(--gold)' : 'var(--text)' }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      <a href={trip.partner_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none' }}>
        <button className="btn btn-navy" style={{ fontSize:12, padding:'7px 14px' }}>↗ View on {trip.partner_name}</button>
      </a>
    </div>
  );
}

export default function MyTripsTab({ userId }: { userId?: string }) {
  const [trips,   setTrips]   = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [synced,  setSynced]  = useState(false);
  const [filter,  setFilter]  = useState<'all'|'flight'|'hotel'|'car'|'train'>('all');
  const [sortBy,  setSortBy]  = useState<'newest'|'oldest'>('newest');

  const loadTrips = useCallback(async () => {
    setLoading(true);
    let allTrips: Trip[] = [];

    // 1. Load from localStorage
    try {
      const stored = localStorage.getItem('nomadpilot_trips');
      if (stored) allTrips = JSON.parse(stored);
    } catch {}

    // 2. If logged in, merge with Supabase
    if (userId) {
      try {
        const res = await fetch('/api/my-trips');
        if (res.ok) {
          const { trips: remote } = await res.json();
          if (Array.isArray(remote) && remote.length > 0) {
            // Merge: remote wins, dedup by id
            const remoteIds = new Set(remote.map((t: Trip) => t.id));
            const localOnly = allTrips.filter(t => !remoteIds.has(t.id));
            allTrips = [...remote, ...localOnly];
            setSynced(true);
          }
        }
      } catch {}
    }

    allTrips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTrips(allTrips);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const handleDelete = async (id: string) => {
    const updated = trips.filter(t => t.id !== id);
    setTrips(updated);
    localStorage.setItem('nomadpilot_trips', JSON.stringify(updated));
    if (userId) {
      try { await fetch(`/api/my-trips?id=${id}`, { method: 'DELETE' }); } catch {}
    }
  };

  const sorted   = [...trips].sort((a, b) =>
    sortBy === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const filtered = filter === 'all' ? sorted : sorted.filter(t => t.type === filter);
  const stats = {
    flights: trips.filter(t => t.type === 'flight').length,
    hotels:  trips.filter(t => t.type === 'hotel').length,
    cars:    trips.filter(t => t.type === 'car').length,
    trains:  trips.filter(t => t.type === 'train').length,
  };
  const countForFilter = (f: string) =>
    f === 'flight' ? stats.flights : f === 'hotel' ? stats.hotels :
    f === 'car' ? stats.cars : stats.trains;

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:'var(--text-dim)' }}>
      <div className="spin" style={{ fontSize:28, marginBottom:12 }}>◌</div>
      <p>Loading your trips...</p>
    </div>
  );

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'32px 0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:30, fontWeight:700, marginBottom:4 }}>My Trips</h2>
          <p style={{ color:'var(--text-dim)', fontSize:14 }}>
            {userId ? (synced ? '☁ Synced with your account' : '💾 Saving locally') : '💾 Sign in to sync across devices'}
          </p>
        </div>
        {trips.length > 0 && (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>Sort:</span>
            {(['newest','oldest'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${sortBy===s?'var(--gold)':'var(--navy-border)'}`, background:sortBy===s?'rgba(232,160,32,0.12)':'transparent', color:sortBy===s?'var(--gold)':'var(--text-dim)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans', textTransform:'capitalize' }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {trips.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 24px', background:'var(--navy-mid)', borderRadius:16, border:'1px dashed var(--navy-border)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✈</div>
          <h3 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>No trips yet</h3>
          <p style={{ color:'var(--text-dim)', fontSize:15, maxWidth:340, margin:'0 auto' }}>
            Search for flights, hotels, cars or trains — when you click a partner to book, it'll appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Flights', count:stats.flights, icon:'✈',  color:'var(--gold)' },
              { label:'Hotels',  count:stats.hotels,  icon:'🏨', color:'#4285F4' },
              { label:'Cars',    count:stats.cars,    icon:'🚗', color:'#E87722' },
              { label:'Trains',  count:stats.trains,  icon:'🚂', color:'#00C853' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--navy-mid)', borderRadius:10, padding:'12px 14px', textAlign:'center', borderTop:`2px solid ${s.color}`, border:`1px solid var(--navy-border)`, borderTopColor:s.color }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:22, fontWeight:700, color:s.color }}>{s.count}</div>
                <div style={{ fontSize:11, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
            {(['all','flight','hotel','car','train'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding:'6px 14px', borderRadius:6, border:`1px solid ${filter===f?'var(--gold)':'var(--navy-border)'}`, background:filter===f?'rgba(232,160,32,0.12)':'var(--navy-light)', color:filter===f?'var(--gold)':'var(--text-dim)', cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:'DM Sans', textTransform:'capitalize' }}>
                {f==='all' ? `All (${trips.length})` : `${TYPE_ICON[f]} ${f.charAt(0).toUpperCase()+f.slice(1)}s (${countForFilter(f)})`}
              </button>
            ))}
          </div>

          {/* Trip list */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(trip => (
              <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'32px', color:'var(--text-dim)' }}>
              No {filter} bookings yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}
