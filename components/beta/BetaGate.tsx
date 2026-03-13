'use client';
import { useState, useEffect } from 'react';

export default function BetaGate({ children }: { children: React.ReactNode }) {
  const [state, setState]   = useState<'checking'|'approved'|'pending'|'unknown'>('checking');
  const [email, setEmail]   = useState('');
  const [input, setInput]   = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // If beta gate not enabled, pass everyone through
    if (!process.env.NEXT_PUBLIC_BETA_ENABLED) {
      setState('approved'); return;
    }
    const saved = localStorage.getItem('np_beta_email');
    if (saved) checkAccess(saved, true);
    else setState('unknown');
  }, []);

  const checkAccess = async (emailToCheck: string, silent = false) => {
    if (!silent) setChecking(true);
    try {
      const res  = await fetch(`/api/beta/check?email=${encodeURIComponent(emailToCheck)}`);
      const data = await res.json();
      if (data.approved) {
        localStorage.setItem('np_beta_email', emailToCheck);
        setEmail(emailToCheck);
        setState('approved');
        fetch('/api/beta/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToCheck, event: 'app_access', metadata: {} }),
        }).catch(() => {});
      } else {
        if (!silent) { setStatus(data.status); setState('pending'); setEmail(emailToCheck); }
        else setState('unknown');
      }
    } finally {
      if (!silent) setChecking(false);
    }
  };

  if (state === 'checking') return (
    <div style={{ minHeight:'100vh', background:'#0a1628', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span className="spin" style={{ fontSize:32, color:'var(--gold)' }}>◌</span>
    </div>
  );

  if (state === 'approved') return <>{children}</>;

  return (
    <div style={{ minHeight:'100vh', background:'#0a1628', color:'#fff', fontFamily:'DM Sans, sans-serif', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:440, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#e8a020', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:20 }}>NomadPilot</div>

        {state === 'pending' ? (
          <>
            <div style={{ fontSize:52, marginBottom:16 }}>⏳</div>
            <h1 style={{ fontSize:28, fontWeight:700, fontFamily:'Cormorant Garamond, serif', marginBottom:12 }}>You're on the waitlist</h1>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:15, lineHeight:1.6, marginBottom:8 }}>
              <strong style={{ color:'#fff' }}>{email}</strong> is{' '}
              <span style={{ color: status === 'rejected' ? '#ef4444' : '#e8a020', fontWeight:600 }}>
                {status === 'rejected' ? 'not approved' : 'pending approval'}
              </span>.
            </p>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:28 }}>
              {status === 'rejected'
                ? 'Unfortunately your application was not approved for this beta.'
                : "We're reviewing applications. You'll be emailed when approved."}
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={() => { setState('unknown'); setStatus(null); }}
                style={{ padding:'10px 20px', borderRadius:8, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans' }}>
                Try different email
              </button>
              <a href="/beta" style={{ padding:'10px 20px', borderRadius:8, background:'rgba(232,160,32,0.12)', border:'1px solid #e8a020', color:'#e8a020', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                Sign up →
              </a>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:52, marginBottom:16 }}>🔐</div>
            <h1 style={{ fontSize:32, fontWeight:700, fontFamily:'Cormorant Garamond, serif', marginBottom:12 }}>Beta Access</h1>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15, marginBottom:28, lineHeight:1.6 }}>
              NomadPilot is in private beta.<br />Enter your email to check if you're approved.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input type="email" placeholder="your@email.com" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && input && checkAccess(input)}
                style={{ padding:'14px 18px', borderRadius:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:15, fontFamily:'DM Sans, sans-serif', outline:'none', textAlign:'center' }} />
              <button onClick={() => input && checkAccess(input)} disabled={checking || !input}
                style={{ padding:'14px', borderRadius:10, background:input ? '#e8a020' : 'rgba(232,160,32,0.3)', border:'none', color:'#0a1628', fontSize:15, fontWeight:700, cursor:input ? 'pointer' : 'not-allowed', fontFamily:'DM Sans, sans-serif' }}>
                {checking ? '⏳ Checking...' : '→ Check Access'}
              </button>
            </div>
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13, marginTop:24 }}>
              No access?{' '}
              <a href="/beta" style={{ color:'#e8a020', textDecoration:'none', fontWeight:600 }}>Join the waitlist →</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
