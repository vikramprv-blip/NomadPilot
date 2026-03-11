'use client';

import { useState } from 'react';
import { Itinerary } from '@/types';

export default function BookingStage({
  itinerary,
  onBook,
  loading,
}: {
  itinerary: Itinerary;
  onBook: (travelerInfo: object) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    passportNumber: '', nationality: '', dateOfBirth: '',
  });

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const valid = form.firstName && form.lastName && form.email && form.passportNumber;

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        className="input-field"
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => update(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Complete your booking</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 15, marginBottom: 32 }}>
        Enter traveler details to confirm your reservation
      </p>

      {/* Summary */}
      <div className="card" style={{ marginBottom: 28, background: 'rgba(14,165,233,0.05)', borderColor: 'rgba(14,165,233,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 4 }}>
              {itinerary.flights[0]?.origin} → {itinerary.flights[0]?.destination}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {itinerary.flights[0]?.airline} · {itinerary.hotels[0]?.name}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Syne' }}>
              ${itinerary.totalCost.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>total</div>
          </div>
        </div>
      </div>

      {/* Traveler form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {field('First Name', 'firstName', 'text', 'John')}
        {field('Last Name', 'lastName', 'text', 'Doe')}
        {field('Email', 'email', 'email', 'john@example.com')}
        {field('Phone', 'phone', 'tel', '+1 555 000 0000')}
        {field('Passport Number', 'passportNumber', 'text', 'A12345678')}
        {field('Nationality', 'nationality', 'text', 'US')}
        {field('Date of Birth', 'dateOfBirth', 'date')}
      </div>

      <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 24 }}>
        <span style={{ color: 'var(--amber)', fontSize: 13 }}>
          ⚠ In test mode — bookings use Amadeus sandbox, no real charges will be made.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={() => history.back()}>← Back</button>
        <button
          className="btn btn-success"
          onClick={() => onBook(form)}
          disabled={!valid || loading}
          style={{ padding: '14px 32px', fontSize: 16 }}
        >
          {loading ? <span className="spin">⟳</span> : '◈'}
          {loading ? 'Booking...' : `Confirm & Book — $${itinerary.totalCost.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
