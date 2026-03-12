'use client';
import { useState, useEffect } from 'react';

interface VisaResult {
  required: boolean;
  status: string;
  stayDuration: number | null;
  passportValidity: string | null;
  evisaAvailable: boolean;
  evisaUrl: string | null;
  notes: string | null;
  passportCode: string;
  destCode: string;
  source: string;
  lastUpdated: string;
  error?: string;
  api_key_missing?: boolean;
  message?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  'Visa Free':         { color: '#2dd4a0', bg: 'rgba(45,212,160,0.1)',  border: 'rgba(45,212,160,0.25)', icon: '✅' },
  'Visa on Arrival':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', icon: '🛬' },
  'eVisa':             { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)', icon: '💻' },
  'Visa Required':     { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: '🛂' },
  'Freedom of movement':{ color: '#2dd4a0', bg: 'rgba(45,212,160,0.1)', border: 'rgba(45,212,160,0.25)', icon: '🇪🇺' },
  'unknown':           { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.25)', icon: '❓' },
};

function getConfig(status: string) {
  for (const key of Object.keys(STATUS_CONFIG)) {
    if (status?.toLowerCase().includes(key.toLowerCase())) return STATUS_CONFIG[key];
  }
  return STATUS_CONFIG['unknown'];
}

export default function VisaChecker({
  nationality,
  destination,
  inline = false,
}: {
  nationality: string;
  destination: string;
  inline?: boolean;  // true = compact banner, false = full card
}) {
  const [result, setResult]   = useState<VisaResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nationality || !destination) return;
    setLoading(true);
    setResult(null);

    fetch(`/api/visa?nationality=${encodeURIComponent(nationality)}&destination=${encodeURIComponent(destination)}`)
      .then(r => r.json())
      .then(data => setResult(data))
      .catch(err => setResult({ error: err.message } as any))
      .finally(() => setLoading(false));
  }, [nationality, destination]);

  if (!nationality || !destination) return null;

  if (loading) return (
    <div style={{ padding: inline ? '8px 14px' : '16px 20px', borderRadius: 10, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
      <span className="spin" style={{ display: 'inline-block' }}>◌</span> Checking visa requirements for {nationality} → {destination}...
    </div>
  );

  if (!result) return null;

  // API key not configured
  if (result.message && !result.status) return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#f59e0b' }}>
      ⚠ Visa API not configured. {result.message}
    </div>
  );

  if (result.error) return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 12, color: '#f87171' }}>
      ⚠ Could not fetch visa info: {result.error}
    </div>
  );

  const cfg = getConfig(result.status);

  // ── Compact inline banner ──────────────────────────────────────────────────
  if (inline) return (
    <div style={{ padding: '8px 14px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{cfg.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{result.status}</span>
        {result.stayDuration && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>· Up to {result.stayDuration} days</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {result.evisaAvailable && result.evisaUrl && (
          <a href={result.evisaUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
            Apply eVisa ↗
          </a>
        )}
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>via {result.source}</span>
      </div>
    </div>
  );

  // ── Full card ──────────────────────────────────────────────────────────────
  return (
    <div style={{ borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color }}>{result.status}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>
              {nationality} passport → {destination}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
          {result.source}<br />Updated {result.lastUpdated}
        </span>
      </div>

      {/* Details grid */}
      <div style={{ padding: '0 18px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {result.stayDuration && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 3 }}>MAX STAY</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{result.stayDuration} <span style={{ fontSize: 12, fontWeight: 400 }}>days</span></div>
          </div>
        )}
        {result.passportValidity && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 3 }}>PASSPORT VALIDITY</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{result.passportValidity}</div>
          </div>
        )}
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 3 }}>EVISA</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: result.evisaAvailable ? '#60a5fa' : 'var(--text-dim)' }}>
            {result.evisaAvailable ? '✓ Available online' : '✗ Not available'}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 3 }}>PASSPORT CODES</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{result.passportCode} → {result.destCode}</div>
        </div>
      </div>

      {/* Notes */}
      {result.notes && (
        <div style={{ padding: '10px 18px', borderTop: `1px solid ${cfg.border}`, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          📋 {result.notes}
        </div>
      )}

      {/* eVisa CTA */}
      {result.evisaAvailable && result.evisaUrl && (
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${cfg.border}` }}>
          <a href={result.evisaUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
            💻 Apply for eVisa online ↗
          </a>
        </div>
      )}
    </div>
  );
}
