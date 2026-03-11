'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup' | 'forgot';

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

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
        const tempPassword = generatePassword();
        const { data, error: e } = await supabase.auth.signUp({
          email,
          password: tempPassword,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (e) throw e;
        setMessage(`Account created! Check your email (${email}) to confirm your account. Your temporary password has been sent — you can change it after signing in.`);

      } else if (mode === 'signin') {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        onSuccess(data.user);

      } else if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (e) throw e;
        setMessage('Password reset email sent! Check your inbox.');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = { width: '100%', background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: 8, padding: '11px 14px', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32, margin: 16, animation: 'fadeUp 0.3s ease' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {mode === 'signin' ? 'Sign in to sync your trips across devices' :
               mode === 'signup' ? 'Join NomadPilot — free forever, no credit card' :
               'We\'ll email you a reset link'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
        </div>

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
                <label style={{ ...lbl, marginBottom: 0 }}>{mode === 'signup' ? 'Choose Password' : 'Password'}</label>
                {mode === 'signin' && <button onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>Forgot?</button>}
              </div>
              <input style={inp} type="password" placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'} value={password} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
              {mode === 'signup' && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>You'll receive a confirmation email before your account is activated.</p>}
            </div>
          )}
        </div>

        {error   && <p style={{ color: 'var(--red)',   fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>⚠ {error}</p>}
        {message && <p style={{ color: 'var(--green)', fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>✓ {message}</p>}

        <button className="btn btn-gold btn-lg" onClick={handle} disabled={loading || !email || (mode !== 'forgot' && !password)} style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}>
          {loading ? <span className="spin">◌</span> :
           mode === 'signin' ? 'Sign In' :
           mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', marginTop: 16 }}>
          {mode === 'signin'
            ? <>No account? <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600 }}>Sign up free</button></>
            : mode === 'signup'
            ? <>Already have one? <button onClick={() => { setMode('signin'); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600 }}>Sign in</button></>
            : <button onClick={() => { setMode('signin'); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600 }}>← Back to sign in</button>}
        </p>
      </div>
    </div>
  );
}
