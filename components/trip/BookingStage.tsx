'use client';
import { useState } from 'react';
import { Itinerary } from '@/types';

// Sanitize helpers — prevent XSS and bad data going to Amadeus
const sanitize = {
  name:      (v: string) => v.replace(/[^a-zA-Z\s\-']/g, '').slice(0, 50),
  email:     (v: string) => v.replace(/[^a-zA-Z0-9@._\-+]/g, '').slice(0, 100),
  phone:     (v: string) => v.replace(/[^0-9\s\+\-\(\)]/g, '').slice(0, 20),
  passport:  (v: string) => v.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 20),
  country:   (v: string) => v.replace(/[^a-zA-Z\s]/g, '').slice(0, 50),
  date:      (v: string) => v.replace(/[^0-9\-]/g, '').slice(0, 10),
};

// Mask passport for display (show only last 3 chars)
function maskPassport(p: string): string {
  if (!p || p.length < 4) return p;
  return '•'.repeat(p.length - 3) + p.slice(-3);
}

function validate(form: Record<string, string>): string | null {
  if (!form.firstName.trim()) return 'First name is required';
  if (!form.lastName.trim())  return 'Last name is required';
  if (!form.email.includes('@')) return 'Valid email is required';
  if (!form.passportNumber || form.passportNumber.length < 6) return 'Valid passport number is required (min 6 characters)';
  if (!form.dateOfBirth) return 'Date of birth is required';
  if (!form.nationality || form.nationality.length < 2) return 'Nationality is required';
  // Basic date of birth validation
  const dob = new Date(form.dateOfBirth);
  const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (isNaN(age) || age < 0 || age > 120) return 'Invalid date of birth';
  return null;
}

export default function BookingStage({
  itinerary, onBook, loading, user, currency,
}: {
  itinerary:  Itinerary;
  onBook:     (info: object) => void;
  loading:    boolean;
  user?:      any;
  currency?:  string;
}) {
  const [form, setForm] = useState({
    firstName: user?.user_metadata?.full_name?.split(' ')[0] || '',
    lastName:  user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
    email:     user?.email || '',
    phone:     '',
    passportNumber: '',
    nationality:    '',
    dateOfBirth:    '',
  });
  const [error, setError]     = useState('');
  const [agreed, setAgreed]   = useState(false);
  const [passportFocused, setPassportFocused] = useState(false);

  const upd = (field: string, raw: string) => {
    const s = sanitize[field as keyof typeof sanitize];
    setForm(p => ({ ...p, [field]: s ? s(raw) : raw }));
  };

  const handleSubmit = () => {
    setError('');
    const err = validate(form);
    if (err) { setError(err); return; }
    if (!agreed) { setError('Please confirm you accept the data handling notice'); return; }
    // Never log or store passport number — pass directly to booking API
    onBook(form);
  };

  const cur = currency || 'USD';
  const sym: Record<string,string> = { USD:'$', EUR:'€', GBP:'£', INR:'₹', DKK:'kr', SEK:'kr', NOK:'kr', AED:'د.إ', SGD:'S$', AUD:'A$', CAD:'C$' };
  const cs = sym[cur] || cur + ' ';

  const lbl: React.CSSProperties = {
    fontSize:11, color:'var(--text-dim)', fontWeight:600,
    letterSpacing:'0.05em', textTransform:'uppercase', display:'block', marginBottom:6,
  };
  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px', borderRadius:8,
    background:'var(--navy-light)', border:'1px solid var(--navy-border)',
    color:'var(--text)', fontSize:14, fontFamily:'DM Sans', outline:'none', boxSizing:'border-box',
  };

  return (
    <div className="fade-up" style={{ maxWidth:680, margin:'0 auto' }}>
      <h2 style={{ fontSize:32, fontWeight:700, marginBottom:6 }}>Traveler Details</h2>
      <p style={{ color:'var(--text-dim)', fontSize:15, marginBottom:28 }}>
        Enter your details as they appear on your passport
      </p>

      {/* Trip summary */}
      <div className="card-gold" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>
              {itinerary.flights[0]?.origin} → {itinerary.flights[0]?.destination}
            </div>
            <div style={{ fontSize:13, color:'var(--text-dim)' }}>
              {itinerary.flights[0]?.airline} · {itinerary.hotels[0]?.name || 'No hotel'}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:26, fontWeight:700, color:'var(--gold)', fontFamily:'Cormorant Garamond, serif' }}>
              {cs}{itinerary.totalCost.toLocaleString()}
            </div>
            <div style={{ fontSize:11, color:'var(--text-dim)' }}>total</div>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div style={{ padding:'12px 16px', borderRadius:8, background:'rgba(45,212,160,0.06)', border:'1px solid rgba(45,212,160,0.2)', marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
        <span style={{ fontSize:16 }}>🔒</span>
        <div style={{ fontSize:12, color:'rgba(45,212,160,0.9)', lineHeight:1.5 }}>
          <strong>Your data is secure.</strong> Passport details are encrypted in transit and passed directly to the booking provider. We never store passport numbers on our servers.
        </div>
      </div>

      {/* Form */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>

        <div>
          <label style={lbl}>First Name *</label>
          <input style={inp} placeholder="As on passport" value={form.firstName}
            onChange={e => upd('firstName', e.target.value)} autoComplete="given-name" />
        </div>
        <div>
          <label style={lbl}>Last Name *</label>
          <input style={inp} placeholder="As on passport" value={form.lastName}
            onChange={e => upd('lastName', e.target.value)} autoComplete="family-name" />
        </div>
        <div>
          <label style={lbl}>Email *</label>
          <input style={inp} type="email" placeholder="Booking confirmation goes here" value={form.email}
            onChange={e => upd('email', e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label style={lbl}>Phone</label>
          <input style={inp} type="tel" placeholder="+1 555 0000" value={form.phone}
            onChange={e => upd('phone', e.target.value)} autoComplete="tel" />
        </div>

        {/* Passport — masked when not focused */}
        <div>
          <label style={lbl}>Passport Number *</label>
          <div style={{ position:'relative' }}>
            <input
              style={{ ...inp, letterSpacing: !passportFocused && form.passportNumber ? '0.1em' : 'normal', fontFamily: !passportFocused && form.passportNumber ? 'monospace' : 'DM Sans' }}
              type="text"
              placeholder="A12345678"
              value={passportFocused ? form.passportNumber : (form.passportNumber ? maskPassport(form.passportNumber) : '')}
              onFocus={() => setPassportFocused(true)}
              onBlur={() => setPassportFocused(false)}
              onChange={e => upd('passportNumber', e.target.value)}
              autoComplete="off"
            />
            {!passportFocused && form.passportNumber && (
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:10, color:'var(--text-muted)' }}>🔒</span>
            )}
          </div>
          <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, display:'block' }}>
            Masked for security — click to edit
          </span>
        </div>

        <div>
          <label style={lbl}>Nationality *</label>
          <input style={inp} placeholder="e.g. Danish, British" value={form.nationality}
            onChange={e => upd('nationality', e.target.value)} autoComplete="off" />
        </div>
        <div style={{ gridColumn:'1 / -1' }}>
          <label style={lbl}>Date of Birth *</label>
          <input style={{ ...inp, maxWidth:220 }} type="date" value={form.dateOfBirth}
            onChange={e => upd('dateOfBirth', e.target.value)} autoComplete="bday" />
        </div>
      </div>

      {/* Data consent checkbox */}
      <div style={{ padding:'14px 16px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid var(--navy-border)', marginBottom:20 }}>
        <label style={{ display:'flex', gap:12, alignItems:'flex-start', cursor:'pointer' }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop:2, width:16, height:16, accentColor:'var(--gold)', flexShrink:0 }} />
          <span style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.5 }}>
            I understand that my passport details will be shared with the airline/booking provider to complete this reservation. NomadPilot does not store passport numbers.
          </span>
        </label>
      </div>

      {/* Sandbox warning */}
      <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', marginBottom:22, fontSize:13, color:'var(--amber)' }}>
        ⚠ Sandbox mode — bookings use Amadeus test environment. No real charges will be made.
      </div>

      {error && (
        <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:16, fontSize:13, color:'#f87171' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
        <button className="btn btn-navy">← Back</button>
        <button className="btn btn-gold btn-lg" onClick={handleSubmit}
          disabled={!agreed || loading}
          style={{ opacity: !agreed ? 0.6 : 1 }}>
          {loading ? <span className="spin">◌</span> : '🔒'}{' '}
          {loading ? 'Processing...' : `Confirm Booking — ${cs}${itinerary.totalCost.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
