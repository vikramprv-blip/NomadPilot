'use client';
import { useState, useEffect } from 'react';

export default function BetaGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'approved' | 'pending' | 'unknown'>('checking');
  const [email, setEmail] = useState('');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Check if we already have a verified email in localStorage
    const saved = localStorage.getItem('np_beta_email');
    if (saved) {
      checkAccess(saved, true);
    } else {
      setState('unknown');
    }
  }, []);

  const checkAccess = async (emailToCheck: string, silent = false) => {
    if (!silent) setChecking(true);
    try {
      const res = await fetch(`/api/beta/check?email=${encodeURIComponent(emailToCheck)}`);
      const data = await res.json();
      if (data.approved) {
        localStorage.setItem('np_beta_email', emailToCheck);
        setEmail(emailToCheck);
        setState('approved');
      } else {
        localStorage.removeItem('np_beta_email');
        if (!silent) {
          setStatus(data.status);
          setState('pending');
          setEmail(emailToCheck);
        } else {
          setState('unknown');
        }
      }
    } catch (err) {
      console.error(err);
      setState('unknown');
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
    outline: 'none', boxSizing: 'border-box', marginBottom: 10,
  };

  if (state === 'checking') return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 32, color: '#e8a020' }}>◌</span>
    </div>
  );

  if (state === 'approved') return <>{children}</>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e8a020', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32 }}>
          NomadPilot
        </div>

        {state === 'pending' ? (
          <div style={{ background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.2)', borderRadius: 20, padding: '40px 32px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>You're on the waitlist</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 20, lineHeight: 1.6 }}>
              <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong> is pending approval. We'll email you when you're in.
            </p>
            <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 100, background: 'rgba(232,160,32,0.15)', border: '1px solid rgba(232,160,32,0.3)', fontSize: 12, fontWeight: 700, color: '#e8a020', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 24 }}>
              {status ?? 'waitlist'}
            </span>
            <br />
            <button onClick={() => setState('unknown')} style={{ padding: '10px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Try a different email
            </button>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 32px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔐</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Beta Access</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 24, fontSize: 14 }}>
              Enter your approved email to continue
            </p>
            <input
              type="email"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && input && checkAccess(input)}
              placeholder="your@email.com"
              style={inputStyle}
            />
            <button
              onClick={() => checkAccess(input)}
              disabled={checking || !input}
              style={{
                width: '100%', padding: '13px', borderRadius: 10,
                background: input ? '#e8a020' : 'rgba(232,160,32,0.3)',
                border: 'none', color: input ? '#0a1628' : 'rgba(10,22,40,0.5)',
                fontSize: 15, fontWeight: 700, cursor: input ? 'pointer' : 'not-allowed',
                fontFamily: 'DM Sans, sans-serif', marginBottom: 16,
              }}
            >
              {checking ? 'Checking...' : 'Check Access'}
            </button>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
              Not signed up yet?{' '}
              <a href="/beta" style={{ color: '#e8a020', textDecoration: 'none' }}>Join the waitlist →</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
