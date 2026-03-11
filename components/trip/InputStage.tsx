'use client';

import { useState } from 'react';

const EXAMPLES = [
  'Fly me from NYC to Tokyo next month, business class, budget $5000',
  'Weekend trip to Paris from London, cheapest option, returning Sunday',
  'Book San Francisco to Miami, 2 travelers, eco-friendly hotels',
];

export default function InputStage({
  onSubmit,
  loading,
}: {
  onSubmit: (input: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState('');

  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 20, marginBottom: 24,
          background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'Syne', fontWeight: 700, letterSpacing: '0.1em' }}>
            ✦ AUTONOMOUS AI TRAVEL
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.05, marginBottom: 16 }}>
          Where do you want<br />
          <span style={{ color: 'var(--sky)' }}>to go next?</span>
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 18, maxWidth: 480, margin: '0 auto' }}>
          Tell me in plain English. I'll handle flights, hotels, visas, and everything else.
        </p>
      </div>

      {/* Main input */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <textarea
          className="input-field"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
              e.preventDefault();
              onSubmit(value.trim());
            }
          }}
          placeholder="e.g. Fly me from NYC to Tokyo next month, business class, budget $5000..."
          rows={3}
          style={{ resize: 'none', paddingRight: 120, lineHeight: 1.6 }}
        />
        <button
          className="btn btn-primary"
          onClick={() => value.trim() && onSubmit(value.trim())}
          disabled={!value.trim() || loading}
          style={{ position: 'absolute', bottom: 12, right: 12 }}
        >
          {loading ? <span className="spin" style={{ fontSize: 16 }}>⟳</span> : '✦'}
          {loading ? 'Planning...' : 'Plan Trip'}
        </button>
      </div>

      {/* Examples */}
      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontFamily: 'Syne', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Try an example
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setValue(ex)}
              style={{
                background: 'transparent',
                border: '1px solid var(--night-border)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--text-dim)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'DM Sans',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.borderColor = 'var(--sky)';
                (e.target as HTMLElement).style.color = 'var(--text)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.borderColor = 'var(--night-border)';
                (e.target as HTMLElement).style.color = 'var(--text-dim)';
              }}
            >
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 48 }}>
        {[
          { icon: '✈', title: 'Flights + Hotels', desc: 'Searches 100s of options in seconds' },
          { icon: '◎', title: 'AI Optimized', desc: 'Price, time, loyalty & ESG scored' },
          { icon: '⬡', title: 'Live Monitoring', desc: 'Auto-rebooking if anything changes' },
        ].map(f => (
          <div key={f.title} className="card" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
