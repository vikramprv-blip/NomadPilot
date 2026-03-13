'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup' | 'forgot';

// Password strength checker
// Password rules — all must pass before signup is allowed
const PASSWORD_RULES = [
  { id: 'length',    label: 'At least 8 characters',           test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)',       test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a–z)',       test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number (0–9)',                 test: (p: string) => /[0-9]/.test(p) },
  { id: 'special',   label: 'One special character (!@#$...)',  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function passwordStrength(p: string): { score: number; label: string; color: string; rules: { id: string; label: string; pass: boolean }[] } {
  if (!p) return { score: 0, label: '', color: '', rules: PASSWORD_RULES.map(r => ({ ...r, pass: false })) };
  const rules = PASSWORD_RULES.map(r => ({ ...r, pass: r.test(p) }));
  const score = rules.filter(r => r.pass).length;
  if (score <= 1) return { score, label: 'Too weak', color: '#ef4444', rules };
  if (score <= 2) return { score, label: 'Weak',     color: '#f97316', rules };
  if (score <= 3) return { score, label: 'Fair',     color: '#f59e0b', rules };
  if (score <= 4) return { score, label: 'Good',     color: '#3b82f6', rules };
  return              { score, label: 'Strong',   color: '#2dd4a0', rules };
}

export default function AuthModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (user: any) => void;
}) {
  const [mode, setMode]         = useState<Mode>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPass]     = useState('');
  const [confirmPass, setConfirm] = useState('');
  const [name, setName]         = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');

  const supabase = createClient();
  const strength = passwordStrength(password);

  const validate = () => {
    if (!email || !email.includes('@')) { setError('Valid email required'); return false; }
    if (mode !== 'forgot' && !password) { setError('Password required'); return false; }
    if (mode === 'signup') {
      const failedRules = strength.rules.filter(r => !r.pass);
      if (failedRules.length > 0) {
        setError(`Password requirements not met: ${failedRules.map(r => r.label).join(', ')}`);
        return false;
      }
      if (password !== confirmPass) { setError('Passwords do not match'); return false; }
    }
    return true;
  };

  const handle = async () => {
    setError(''); setMessage('');
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (e) throw e;
        if (data.user?.identities?.length === 0) {
          setError('An account with this email already exists. Please sign in.');
          return;
        }
        // Fire welcome email (non-blocking)
        fetch('/api/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
        }).catch(() => {});
        setMessage('✓ Account created! Check your email to confirm your address, then sign in.');
        setMode('signin');

      } else if (mode === 'signin') {
        const { data, error: e } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (e) {
          if (e.message.includes('Invalid login')) throw new Error('Incorrect email or password');
          if (e.message.includes('Email not confirmed')) throw new Error('Please confirm your email first — check your inbox');
          throw e;
        }
        onSuccess(data.user);

      } else if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (e) throw e;
        setMessage('✓ Password reset link sent — check your email');
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

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--navy-light)', border: '1px solid var(--navy-border)',
    borderRadius: 8, padding: '11px 14px', color: 'var(--text)',
    fontFamily: 'DM Sans', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-dim)', fontWeight: 600,
    letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  };

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card" style={{ width:'100%', maxWidth:420, padding:32, margin:16, animation:'fadeUp 0.3s ease' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div>
            <h2 style={{ fontSize:24, fontWeight:700, marginBottom:4 }}>
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h2>
            <p style={{ fontSize:13, color:'var(--text-dim)' }}>
              {mode === 'signin'  ? 'Sign in to access NomadPilot' :
               mode === 'signup' ? 'Create your account — free forever' :
               "We'll send you a reset link"}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, padding:4, lineHeight:1 }}>✕</button>
        </div>

        {/* Google OAuth */}
        {mode !== 'forgot' && (
          <>
            <button onClick={handleGoogle} disabled={loading}
              style={{ width:'100%', padding:'11px', borderRadius:8, border:'1px solid var(--navy-border)', background:'var(--navy-light)', color:'var(--text)', cursor:'pointer', fontFamily:'DM Sans', fontWeight:600, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:20, transition:'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,160,32,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--navy-border)')}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.2 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.3C9.6 35.7 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.3C41.2 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              Continue with Google
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:'var(--navy-border)' }} />
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>or continue with email</span>
              <div style={{ flex:1, height:1, background:'var(--navy-border)' }} />
            </div>
          </>
        )}

        {/* Form fields */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {mode === 'signup' && (
            <div>
              <label style={lbl}>Full Name</label>
              <input style={inp} placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} autoComplete="name" />
            </div>
          )}

          <div>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" placeholder="you@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              autoComplete="email" />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ ...lbl, marginBottom:0 }}>Password</label>
                {mode === 'signin' && (
                  <button onClick={() => setMode('forgot')}
                    style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', fontSize:12, fontFamily:'DM Sans' }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position:'relative' }}>
                <input style={{ ...inp, paddingRight:42 }}
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && mode === 'signin' && handle()}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                <button onClick={() => setShowPass(!showPass)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, padding:0 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>

              {/* Password strength meter — only on signup */}
              {mode === 'signup' && password && (
                <div style={{ marginTop:8 }}>
                  {/* Strength bar */}
                  <div style={{ display:'flex', gap:3, marginBottom:6 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= strength.score ? strength.color : 'var(--navy-border)', transition:'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize:11, color:strength.color, fontWeight:700 }}>{strength.label}</span>
                  {/* Rule checklist */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', marginTop:8 }}>
                    {strength.rules.map(r => (
                      <div key={r.id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
                        <span style={{ color: r.pass ? '#2dd4a0' : '#ef4444', fontSize:10, flexShrink:0 }}>
                          {r.pass ? '✓' : '✗'}
                        </span>
                        <span style={{ color: r.pass ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)', textDecoration: r.pass ? 'line-through' : 'none' }}>
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirm password — signup only */}
          {mode === 'signup' && (
            <div>
              <label style={lbl}>Confirm Password</label>
              <input style={{ ...inp, borderColor: confirmPass && confirmPass !== password ? '#ef4444' : confirmPass && confirmPass === password ? '#2dd4a0' : 'var(--navy-border)' }}
                type={showPass ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirmPass}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()}
                autoComplete="new-password" />
              {confirmPass && confirmPass !== password && (
                <span style={{ fontSize:11, color:'#ef4444', marginTop:4, display:'block' }}>Passwords don't match</span>
              )}
              {confirmPass && confirmPass === password && (
                <span style={{ fontSize:11, color:'#2dd4a0', marginTop:4, display:'block' }}>✓ Passwords match</span>
              )}
            </div>
          )}
        </div>

        {/* Privacy notice on signup */}
        {mode === 'signup' && (
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:14, lineHeight:1.5 }}>
            By creating an account you agree that your data is handled securely. Passport and payment information is never stored on our servers — it is passed directly to booking providers.
          </p>
        )}

        {error   && <p style={{ color:'#ef4444', fontSize:13, marginTop:12, lineHeight:1.4 }}>⚠ {error}</p>}
        {message && <p style={{ color:'var(--green)', fontSize:13, marginTop:12, lineHeight:1.4 }}>{message}</p>}

        <button className="btn btn-gold btn-lg" onClick={handle}
          disabled={loading || !email || (mode !== 'forgot' && !password) || (mode === 'signup' && (strength.score < 5 || password !== confirmPass))}
          style={{ width:'100%', justifyContent:'center', marginTop:18 }}>
          {loading ? <span className="spin">◌</span> :
           mode === 'signin'  ? 'Sign In' :
           mode === 'signup'  ? 'Create Account' : 'Send Reset Link'}
        </button>

        <p style={{ textAlign:'center', fontSize:13, color:'var(--text-dim)', marginTop:16 }}>
          {mode === 'signin' ? (
            <>No account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
                style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', fontSize:13, fontFamily:'DM Sans', fontWeight:600 }}>
                Create one free
              </button>
            </>
          ) : mode === 'signup' ? (
            <>Already have one?{' '}
              <button onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
                style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', fontSize:13, fontFamily:'DM Sans', fontWeight:600 }}>
                Sign in
              </button>
            </>
          ) : (
            <button onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
              style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', fontSize:13, fontFamily:'DM Sans', fontWeight:600 }}>
              ← Back to sign in
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
