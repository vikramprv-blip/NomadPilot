'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (user: any) => void;
}) {
  const [mode, setMode]       = useState<Mode>('signin');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handle = async () => {
    setError(''); setMessage(''); setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } },
        });
        if (e) throw e;
        setMessage('Check your email to confirm your account!');
        if (data.user && !data.user.email_confirmed_at) return;
        if (data.user) onSuccess(data.user);

      } else if (mode === 'signin') {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        onSuccess(data.user);

      } else if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (e) throw e;
        setMessage('Password reset email sent!');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (e) { setError(e.message); setLoading(false); }
  };

  const inp: React.CSSProperties = { width: '100%', background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: 8, padding: '11px 14px', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32, margin: 16, animation: 'fadeUp 0.3s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {mode === 'signin' ? 'Sign in to sync your trips across devices' :
               mode === 'signup' ? 'Join NomadPilot — free forever' :
               'We\'ll email you a reset link'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        {/* Google */}
        {mode !== 'forgot' && (
          <>
            <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', padding: '11px', borderRadius: 8, border: '1px solid var(--navy-border)', background: 'var(--navy-light)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, transition: 'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,160,32,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--navy-border)')}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.2 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.3C9.6 35.7 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.3C41.2 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
              Continue with Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--navy-border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--navy-border)' }} />
            </div>
          </>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label style={lbl}>Full Name</label>
              <input style={inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
          </div>
          {mode !== 'forgot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Password</label>
                {mode === 'signin' && <button onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>Forgot?</button>}
              </div>
              <input style={inp} type="password" placeholder="••••••••" value={password} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
            </div>
          )}
        </div>

        {error   && <p style={{ color: 'var(--red)',   fontSize: 13, marginTop: 12 }}>⚠ {error}</p>}
        {message && <p style={{ color: 'var(--green)', fontSize: 13, marginTop: 12 }}>✓ {message}</p>}

        <button className="btn btn-gold btn-lg" onClick={handle} disabled={loading || !email} style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}>
          {loading ? <span className="spin">◌</span> :
           mode === 'signin' ? 'Sign In' :
           mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', marginTop: 16 }}>
          {mode === 'signin' ? <>No account? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600 }}>Sign up free</button></> :
           mode === 'signup' ? <>Already have one? <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600 }}>Sign in</button></> :
           <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600 }}>← Back to sign in</button>}
        </p>
      </div>
    </div>
  );
}
