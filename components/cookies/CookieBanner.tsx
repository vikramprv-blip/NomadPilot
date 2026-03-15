'use client';
import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('np_cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('np_cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('np_cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: '100%', maxWidth: 560, padding: '0 16px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'rgba(10,22,40,0.97)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: '20px 24px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>🍪</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: '0 0 4px', fontWeight: 600 }}>
              We use cookies
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 16px', lineHeight: 1.5 }}>
              We use essential cookies to keep you signed in and remember your preferences.
              We <strong style={{ color: 'rgba(255,255,255,0.7)' }}>never sell your data</strong> or use cookies for advertising.
              See our{' '}
              <a href="/privacy" style={{ color: '#e8a020', textDecoration: 'underline' }}>Privacy Policy</a>.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={accept}
                style={{ padding: '8px 20px', borderRadius: 8, background: '#e8a020', border: 'none', color: '#0a1628', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Accept
              </button>
              <button
                onClick={decline}
                style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                Essential only
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
