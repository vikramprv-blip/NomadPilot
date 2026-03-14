'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function BetaStatusPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = '/?auth=login';
        return;
      }

      setEmail(session.user.email ?? null);

      const { data } = await supabase
        .from('beta_testers')
        .select('status')
        .eq('email', session.user.email!)
        .single();

      setStatus(data?.status ?? 'waitlist');
      setLoading(false);

      // If somehow approved, send them to the app
      if (data?.status === 'approved' || data?.status === 'active') {
        window.location.href = '/';
      }
    };

    fetchStatus();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/beta';
  };

  const statusConfig: Record<string, { icon: string; title: string; message: string; color: string; bg: string }> = {
    waitlist: {
      icon: '✈️',
      title: "You're on the waitlist!",
      message: "We're reviewing applications and rolling out access in batches. You'll get an email the moment you're approved.",
      color: '#e8a020',
      bg: 'rgba(232,160,32,0.08)',
    },
    invited: {
      icon: '🎉',
      title: "You've been invited!",
      message: "Check your inbox — your access link should be there. If not, try signing in again.",
      color: '#2dd4a0',
      bg: 'rgba(45,212,160,0.08)',
    },
    rejected: {
      icon: '🙁',
      title: "Not approved yet",
      message: "We couldn't approve your account at this time. We may open up more spots soon.",
      color: '#ff6b6b',
      bg: 'rgba(255,107,107,0.08)',
    },
  };

  const cfg = statusConfig[status ?? 'waitlist'] ?? statusConfig['waitlist'];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1628',
      color: '#fff',
      fontFamily: 'DM Sans, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {loading ? (
        <span style={{ fontSize: 32, color: '#e8a020' }}>◌</span>
      ) : (
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8a020', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 40 }}>
            NomadPilot
          </div>

          {/* Status card */}
          <div style={{
            background: cfg.bg,
            border: `1px solid ${cfg.color}33`,
            borderRadius: 20,
            padding: '40px 32px',
          }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>{cfg.icon}</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>{cfg.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 24 }}>{cfg.message}</p>

            {/* Status badge */}
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: 100,
              background: `${cfg.color}20`,
              border: `1px solid ${cfg.color}44`,
              fontSize: 12,
              fontWeight: 700,
              color: cfg.color,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 28,
            }}>
              {status ?? 'waitlist'}
            </div>

            {email && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>
                Signed in as <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{email}</strong>
              </p>
            )}

            {/* Share nudge */}
            {status === 'waitlist' && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                  Help us grow — share NomadPilot 🚀
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[
                    { label: '𝕏 Twitter', url: `https://twitter.com/intent/tweet?text=Just+joined+the+%40NomadPilot+beta+%E2%80%94+AI-powered+travel+planning.+Join+the+waitlist%3A+https%3A%2F%2Fnomadpilot.vercel.app%2Fbeta` },
                    { label: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fnomadpilot.vercel.app%2Fbeta` },
                  ].map((s) => (
                    <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                      padding: '8px 18px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    }}>
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSignOut}
              style={{
                padding: '10px 24px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.5)', fontSize: 13,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
