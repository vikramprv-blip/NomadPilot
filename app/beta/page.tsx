'use client';
import { useState } from 'react';

export default function BetaPage() {
  const [form, setForm] = useState({
    email: '', name: '', password: '', country: '', travel_type: '', how_heard: '', use_case: '',
  });
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'beta-page' }),
      });
      const data = await res.json();
      setResult(data);
      setStatus(data.success ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '80px 24px 48px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e8a020', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>🚀 Private Beta</div>
        <h1 style={{ fontSize: 52, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', marginBottom: 16, lineHeight: 1.15 }}>
          Travel smarter.<br /><span style={{ color: '#e8a020' }}>AI-powered.</span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', maxWidth: 520, margin: '0 auto 12px', lineHeight: 1.6 }}>
          NomadPilot searches flights and hotels across Kiwi, Booking.com, Agoda and more — in one place, in your currency.
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 48 }}>Limited spots. Join the waitlist and get early access.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginBottom: 64, flexWrap: 'wrap' }}>
          {[['10+','Partners'],['100+','Countries'],['25+','Currencies'],['AI','Powered']].map(([n,l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', color: '#e8a020' }}>{n}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 24px 80px' }}>
        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '48px 32px', background: 'rgba(45,212,160,0.08)', borderRadius: 16, border: '1px solid rgba(45,212,160,0.2)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{result?.already ? "You're already on the list!" : "You're in!"}</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>{result?.message}</p>
            {result?.invite_code && (
              <div style={{ background: 'rgba(232,160,32,0.1)', borderRadius: 10, padding: '14px 20px', border: '1px solid rgba(232,160,32,0.2)', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Your invite code</div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', color: '#e8a020', fontFamily: 'monospace' }}>{result.invite_code}</div>
              </div>
            )}
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>We'll email you when approved. Sign in with your email and password.</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: '32px 28px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>Request Beta Access</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input style={inputStyle} type="text" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Password *</label>
                <input style={inputStyle} type="password" placeholder="Min 8 characters — you'll use this to sign in" value={form.password} onChange={e => set('password', e.target.value)} />
                {form.password && form.password.length < 8 && (
                  <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 4 }}>Password must be at least 8 characters</p>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Country</label>
                  <input style={inputStyle} type="text" placeholder="e.g. India" value={form.country} onChange={e => set('country', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Travel type</label>
                  <select style={inputStyle} value={form.travel_type} onChange={e => set('travel_type', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="business">Business</option>
                    <option value="leisure">Leisure</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>How did you hear about us?</label>
                <select style={inputStyle} value={form.how_heard} onChange={e => set('how_heard', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="friend">Friend / Colleague</option>
                  <option value="google">Google Search</option>
                  <option value="producthunt">Product Hunt</option>
                  <option value="reddit">Reddit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>What will you use NomadPilot for?</label>
                <textarea style={{ ...inputStyle, height: 80, resize: 'none' }} placeholder="e.g. planning monthly business trips..." value={form.use_case} onChange={e => set('use_case', e.target.value)} />
              </div>
              <button onClick={submit} disabled={status === 'loading' || !form.email || !form.password || form.password.length < 8}
                style={{ width: '100%', padding: '14px', borderRadius: 10, background: (form.email && form.password && form.password.length >= 8) ? '#e8a020' : 'rgba(232,160,32,0.3)', border: 'none', color: (form.email && form.password && form.password.length >= 8) ? '#0a1628' : 'rgba(10,22,40,0.5)', fontSize: 15, fontWeight: 700, cursor: (form.email && form.password && form.password.length >= 8) ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif' }}>
                {status === 'loading' ? '⏳ Joining...' : '🚀 Join Beta Waitlist'}
              </button>
              {status === 'error' && <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>{result?.message || result?.error || 'Something went wrong. Please try again.'}</p>}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>No spam. We'll only email you with your invite. Use this password to sign in once approved.</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 24px', maxWidth: 760, margin: '0 auto' }}>
        <h3 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', marginBottom: 40 }}>What beta testers get</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            { icon: '✈', title: 'Real flight data', desc: 'Live prices from Kiwi, Aviasales, Booking.com' },
            { icon: '🏨', title: 'Hotel search', desc: 'Booking.com, Agoda, Hotels.com in one search' },
            { icon: '🤖', title: 'AI trip planner', desc: 'Just type your trip in plain English' },
            { icon: '💱', title: 'Your currency', desc: '25+ currencies — prices shown your way' },
            { icon: '🛂', title: 'Visa checker', desc: 'Instant visa requirements for your passport' },
            { icon: '📍', title: 'Destination hub', desc: 'Weather, restaurants, safety, attractions' },
          ].map(f => (
            <div key={f.title} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
