'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AuthModal from '@/components/auth/AuthModal';

export default function BetaGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'approved' | 'pending' | 'not_logged_in'>('checking');
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setState('not_logged_in');
        setShowAuthModal(true);
        return;
      }

      setEmail(session.user.email ?? null);

      const { data: tester } = await supabase
        .from('beta_testers')
        .select('status')
        .eq('email', session.user.email!)
        .single();

      const approved = tester?.status === 'approved' || tester?.status === 'active';

      if (approved) {
        setState('approved');
      } else {
        setStatus(tester?.status ?? 'waitlist');
        setState('pending');
      }
    };

    check();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setState('checking');
      check();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setState('not_logged_in');
    setShowAuthModal(true);
  };

  if (state === 'checking') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy, #0a1628)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 32, color: '#e8a020' }}>◌</span>
    </div>
  );

  if (state === 'approved') return <>{children}</>;

  if (state === 'not_logged_in') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy, #0a1628)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e8a020', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32 }}>NomadPilot</div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 32px' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✈️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Welcome to NomadPilot</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>
            Sign in to access your beta account, or join the waitlist for early access.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setShowAuthModal(true)}
              style={{ width: '100%', padding: '13px', borderRadius: 10, background: '#e8a020', border: 'none', color: '#0a1628', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              Sign In
            </button>
            <a href="/beta" style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}>
              Join the Waitlist →
            </a>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 20 }}>
            By continuing you agree to our{' '}
            <a href="/privacy" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline' }}>Privacy Policy</a>.
            We never sell your data.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy, #0a1628)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e8a020', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 40 }}>NomadPilot</div>
        <div style={{ background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.2)', borderRadius: 20, padding: '40px 32px' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>⏳</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>You're on the waitlist!</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 24 }}>
            We're reviewing applications and rolling out access in batches. You'll get an email the moment you're approved.
          </p>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: 'rgba(232,160,32,0.2)', border: '1px solid rgba(232,160,32,0.4)', fontSize: 12, fontWeight: 700, color: '#e8a020', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 24 }}>
            {status ?? 'waitlist'}
          </div>
          {email && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>Signed in as <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{email}</strong></p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { label: '𝕏 Twitter', url: 'https://twitter.com/intent/tweet?text=Just+joined+the+%40NomadPilot+beta+%E2%80%94+AI-powered+travel+planning.+Join+the+waitlist%3A+https%3A%2F%2Fnomad-pilot.vercel.app%2Fbeta' },
              { label: 'LinkedIn', url: 'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fnomad-pilot.vercel.app%2Fbeta' },
            ].map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                {s.label}
              </a>
            ))}
          </div>
          <button onClick={handleSignOut} style={{ padding: '10px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
