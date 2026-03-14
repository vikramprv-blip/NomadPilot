'use client';
import { useState, useEffect } from 'react';

export default function BetaGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking'|'approved'|'pending'|'unknown'>('checking');
  const [email, setEmail] = useState('');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setState('approved');
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
        if (!silent) { setStatus(data.status); setState('pending'); setEmail(emailToCheck); }
        else setState('unknown');
      }
    } catch (err) {
       console.error(err);
    } finally {
      if (!silent) setChecking(false);
    }
  };

  if (state === 'checking') return (
    <div style={{ minHeight:'100vh', background:'#0a1628', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:32, color:'#e8a020' }}>◌</span>
    </div>
  );

  if (state === 'approved') return <>{children}</>;

  return (
    <div style={{ minHeight:'100vh', background:'#0a1628', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:440, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#e8a020', marginBottom:20 }}>NomadPilot</div>
        {state === 'pending' ? (
          <>
            <div style={{ fontSize:52, marginBottom:16 }}>⏳</div>
            <h1>Waitlist</h1>
            <p>{email} is pending.</p>
            <button onClick={() => setState('unknown')}>Try again</button>
          </>
        ) : (
          <>
            <div style={{ fontSize:52, marginBottom:16 }}>🔐</div>
            <h1>Beta Access</h1>
            <input 
              type="email" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="your@email.com"
              style={{ padding:10, borderRadius:5, width:'100%', color:'#000' }}
            />
            <button 
              onClick={() => checkAccess(input)}
              style={{ marginTop:10, padding:10, background:'#e8a020', width:'100%', border:'none', cursor:'pointer' }}
            >
              {checking ? 'Checking...' : 'Check Access'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
