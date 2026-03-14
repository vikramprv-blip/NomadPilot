'use client';

import { BookingResult, Itinerary, OpsAlert } from '@/types';
import { useEffect, useState } from 'react';

// ─── Ops Stage ────────────────────────────────────────────────────────────────

export function OpsStage({
  booking,
  itinerary,
  tripId,
  onContinue,
}: {
  booking: BookingResult;
  itinerary: Itinerary;
  tripId?: string;
  onContinue: () => void;
}) {
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);

  useEffect(() => {
    if (!tripId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/ops?tripId=${tripId}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
    }, 10000);
    return () => clearInterval(interval);
  }, [tripId]);

  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Confirmation banner */}
      <div style={{
        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 16, padding: 28, marginBottom: 28, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', marginBottom: 8 }}>
          Booking Confirmed!
        </h2>
        <div style={{ fontSize: 15, color: 'var(--text-dim)' }}>
          Confirmation: <strong style={{ color: 'var(--text)' }}>{booking.confirmationNumber}</strong>
        </div>
      </div>

      {/* Tickets */}
      <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 16 }}>Your Documents</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {booking.tickets.map((t, i) => (
          <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className={`badge ${t.type === 'flight' ? 'badge-sky' : 'badge-amber'}`} style={{ marginRight: 12 }}>
                {t.type === 'flight' ? '✈ Flight' : '🏨 Hotel'}
              </span>
              <span style={{ fontFamily: 'Syne', fontWeight: 600 }}>{t.reference}</span>
            </div>
            {t.qrCode && (
              <img src={t.qrCode} alt="QR" style={{ width: 48, height: 48, borderRadius: 6 }} />
            )}
          </div>
        ))}
      </div>

      {/* Live ops */}
      <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 16 }}>
        Live Monitoring
        <span style={{ marginLeft: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
      </h3>

      {alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⬡</div>
          All systems normal — monitoring your trip in real-time
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(a => (
            <div key={a.id} className={`card badge-${a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'amber' : 'sky'}`}
              style={{ borderLeft: `4px solid var(--${a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'amber' : 'sky'})` }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.type.replace('_', ' ').toUpperCase()}</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{a.message}</div>
              {a.autoResolved && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>✓ Auto-resolved</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={onContinue}>
          View Trip Organizer →
        </button>
      </div>
    </div>
  );
}

// ─── Organizer Stage ──────────────────────────────────────────────────────────

export function OrganizerStage({
  itinerary,
  booking,
  onContinue,
}: {
  itinerary: Itinerary;
  booking: BookingResult;
  onContinue: () => void;
}) {
  const flight = itinerary.flights[0];
  const hotel = itinerary.hotels[0];

  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Trip Organizer ◻</h2>
      <p style={{ color: 'var(--text-dim)', marginBottom: 32 }}>
        Your unified itinerary, documents, and receipts
      </p>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 32, marginBottom: 32 }}>
        <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: 'var(--night-border)' }} />
        {[
          { icon: '✈', label: 'Departure', detail: flight ? `${flight.origin} → ${flight.destination} · ${flight.airline} ${flight.flightNumber}` : '', date: flight?.departure },
          { icon: '🏨', label: 'Hotel Check-in', detail: hotel?.name || '', date: hotel?.checkIn },
          { icon: '🏨', label: 'Hotel Check-out', detail: hotel?.name || '', date: hotel?.checkOut },
          { icon: '✈', label: 'Return Flight', detail: `${flight?.destination} → ${flight?.origin}`, date: itinerary.flights[1]?.departure || hotel?.checkOut },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'var(--night-mid)', border: '2px solid var(--night-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              marginLeft: -11,
            }}>
              {item.icon}
            </div>
            <div className="card" style={{ flex: 1, padding: '12px 16px' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{item.detail}</div>
              {item.date && (
                <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>
                  {new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }}>📅 Sync to Calendar</button>
        <button className="btn btn-ghost" style={{ flex: 1 }}>📧 Email Itinerary</button>
        <button className="btn btn-ghost" style={{ flex: 1 }}>⬇ Download PDF</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={onContinue}>
          Complete Trip →
        </button>
      </div>
    </div>
  );
}

// ─── Post-Trip Stage ──────────────────────────────────────────────────────────

export function PostTripStage({
  itinerary,
  onReset,
}: {
  itinerary: Itinerary;
  onReset: () => void;
}) {
  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>★</div>
      <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Trip Complete!</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 16, marginBottom: 40, maxWidth: 400, margin: '0 auto 40px' }}>
        Your expense report is ready and your preferences have been saved for smarter future trips.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 40 }}>
        {[
          { label: 'Total Spent', value: `$${itinerary.totalCost.toLocaleString()}`, icon: '💰' },
          { label: 'Miles Earned', value: `${(itinerary.flights[0]?.loyaltyMiles || 0).toLocaleString()}`, icon: '✈' },
          { label: 'CO₂ Saved', value: itinerary.score.esg > 70 ? '18kg' : '—', icon: '🌿' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-ghost">⬇ Download Expense Report</button>
        <button className="btn btn-primary" onClick={onReset}>
          ✦ Plan Next Trip
        </button>
      </div>
    </div>
  );
}
