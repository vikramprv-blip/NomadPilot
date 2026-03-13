'use client';
import { useState, useEffect } from 'react';

const PLANS = [
  {
    id: 'free', name: 'FREE', price: { monthly: 0, annual: 0 },
    tagline: 'Free tier with basic features',
    highlight: false,
  },
  {
    id: 'premium', name: 'PREMIUM', price: { monthly: 9.99, annual: 99 },
    tagline: 'Premium tier with enhanced features',
    highlight: false,
    color: '#3b82f6',
  },
  {
    id: 'pro', name: 'PRO', price: { monthly: 24.99, annual: 249 },
    tagline: 'Pro tier with professional features',
    highlight: true,
    badge: '👑 MOST POPULAR',
    color: '#8b5cf6',
  },
  {
    id: 'elite', name: 'ELITE', price: { monthly: 49.99, annual: 499 },
    tagline: 'Elite tier with premium features',
    highlight: false,
    color: '#e8a020',
  },
];

const FEATURES = [
  { category: 'TRIP PLANNING', items: [
    { name: 'Flight & Hotel Search',   free: true,  premium: true,  pro: true,  elite: true },
    { name: 'Basic Itinerary Builder', free: true,  premium: true,  pro: true,  elite: true },
    { name: '3 AI Trips Per Month',    free: true,  premium: true,  pro: false, elite: false },
    { name: 'Unlimited AI Trips',      free: false, premium: false, pro: true,  elite: true },
    { name: 'Multi-City Routing',      free: false, premium: false, pro: true,  elite: true },
  ]},
  { category: 'TRAVEL INTELLIGENCE', items: [
    { name: 'Visa Requirement Info',   free: true,  premium: true,  pro: true,  elite: true },
    { name: 'Embassy Database',        free: true,  premium: true,  pro: true,  elite: true },
    { name: 'Safety Alerts',           free: false, premium: true,  pro: true,  elite: true },
    { name: 'Flight Tracker',          free: false, premium: true,  pro: true,  elite: true },
    { name: 'Destination Guides',      free: false, premium: true,  pro: true,  elite: true },
  ]},
  { category: 'BOOKING & PARTNERS', items: [
    { name: 'Partner Booking Links',   free: true,  premium: true,  pro: true,  elite: true },
    { name: 'My Trips Dashboard',      free: true,  premium: true,  pro: true,  elite: true },
    { name: 'Car Rental Search',       free: false, premium: true,  pro: true,  elite: true },
    { name: 'Train Search',            free: false, premium: true,  pro: true,  elite: true },
    { name: 'Priority Partner Rates',  free: false, premium: false, pro: true,  elite: true },
  ]},
  { category: 'CONCIERGE & SUPPORT', items: [
    { name: 'Restaurant Finder',       free: false, premium: true,  pro: true,  elite: true },
    { name: 'Weather Forecasts',       free: true,  premium: true,  pro: true,  elite: true },
    { name: 'Offline Maps Access',     free: false, premium: false, pro: true,  elite: true },
    { name: 'Real-time Ops Monitoring',free: false, premium: false, pro: true,  elite: true },
    { name: '24/7 Concierge Support',  free: false, premium: false, pro: false, elite: true },
    { name: 'Dedicated Account Mgr',   free: false, premium: false, pro: false, elite: true },
  ]},
];

function PriceAlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/price-alert')
      .then(r => r.ok ? r.json() : { alerts: [] })
      .then(d => setAlerts(d.alerts || []))
      .finally(() => setLoading(false));
  }, []);

  const deleteAlert = async (id: string) => {
    await fetch(`/api/price-alert?id=${id}`, { method: 'DELETE' });
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (loading)
    return <div style={{ padding: 20, textAlign:'center', color:'var(--text-dim)' }}>Loading alerts...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🔔 Price Alerts</h3>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          We'll notify you by email when flight prices drop below your target.
        </p>
      </div>

      {alerts.length === 0 ? (
        <div style={{
          padding: '32px 24px', textAlign:'center', borderRadius: 10,
          background:'var(--navy-mid)', border:'1px dashed var(--navy-border)'
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
          <p style={{ color:'var(--text-dim)', fontSize: 14 }}>
            No price alerts yet. Search for a flight and click "Alert me if cheaper".
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          {alerts.map(a => (
            <div key={a.id} style={{
              padding:'14px 18px', borderRadius:10, background:'var(--navy-mid)',
              border:'1px solid var(--navy-border)', display:'flex',
              justifyContent:'space-between', alignItems:'center', gap: 12, flexWrap:'wrap'
            }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>
                  {a.origin} → {a.destination}
                </div>
                <div style={{ fontSize:12, color:'var(--text-dim)' }}>
                  {a.date}
                  {a.target_price && (
                    <span style={{ marginLeft: 10, color:'var(--gold)' }}>
                      Target: {a.currency}{Number(a.target_price).toLocaleString()}
                    </span>
                  )}
                  {a.last_price && (
                    <span style={{ marginLeft: 10 }}>
                      Last seen: {a.currency}{Number(a.last_price).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{
                  fontSize:10, padding:'3px 8px', borderRadius:20,
                  background: a.active ? 'rgba(45,212,160,0.12)' : 'rgba(255,255,255,0.06)',
                  color: a.active ? 'var(--green)' : 'var(--text-muted)', fontWeight:700
                }}>
                  {a.triggered ? '✓ Triggered' : a.active ? '● Active' : '○ Paused'}
                </span>

                <button
                  onClick={() => deleteAlert(a.id)}
                  style={{
                    background:'none', border:'1px solid var(--navy-border)',
                    borderRadius:6, color:'var(--text-muted)', cursor:'pointer',
                    fontSize:13, padding:'4px 10px'
                  }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountTab({ currentPlan = 'free' }: { currentPlan?: string }) {
  const [billing, setBilling] = useState<'monthly'|'annual'>('monthly');
  const [loading, setLoading] = useState<string|null>(null);
  const [section, setSection] = useState<'plans'|'alerts'>('plans');

  const handleSubscribe = async (planId: string, provider: 'stripe'|'paypal') => {
    if (planId === 'free') return;

    setLoading(`${planId}-${provider}`);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billing, provider }),
      });

      const { url, error } = await res.json();
      if (error) { alert(error); return; }

      if (url) window.location.href = url;
    } catch {
      alert('Checkout unavailable. Add Stripe/PayPal keys to Vercel env vars.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 0' }}>

      {/* Header Tabs */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 6 }}>Account & Plans</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>
          Choose the plan that fits your travel needs
        </p>

        <div style={{ display:'flex', gap:8, marginTop: 16 }}>
          {[{id:'plans',label:'💳 Plans & Billing'}, {id:'alerts',label:'🔔 Price Alerts'}].map(s => (
            <button key={s.id} onClick={() => setSection(s.id as any)}
              style={{
                padding:'7px 16px', borderRadius:7,
                border:`1px solid ${section===s.id?'var(--gold)':'var(--navy-border)'}`,
                background:section===s.id?'rgba(232,160,32,0.12)':'transparent',
                color:section===s.id?'var(--gold)':'var(--text-dim)',
                fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans'
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION SWITCH */}
      {section === 'alerts' ? (
        <PriceAlertsPanel />
      ) : (
        <>
          {/* Billing toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex', background: 'var(--navy-mid)',
              border: '1px solid var(--navy-border)', borderRadius: 10,
              padding: 4, gap: 4
            }}>
              {(['monthly','annual'] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  style={{
                    padding: '8px 24px', borderRadius: 7, border: 'none',
                    cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600,
                    fontSize: 13,
                    background: billing === b ? 'var(--gold)' : 'transparent',
                    color: billing === b ? 'var(--navy)' : 'var(--text-dim)',
                    transition: 'all 0.2s'
                  }}>
                  {b === 'monthly'
                    ? 'Monthly'
                    : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Annual
                        <span style={{
                          fontSize: 10, background: 'rgba(45,212,160,0.2)',
                          color: 'var(--green)', padding: '1px 6px', borderRadius: 4
                        }}>
                          Save 20%
                        </span>
                      </span>
                    )}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16, marginBottom: 48
          }}>
            {PLANS.map(plan => {
              const isCurrent = plan.id === currentPlan;
              const price = plan.price[billing];
              const col = (plan as any).color || 'var(--navy-border)';

              return (
                <div key={plan.id} style={{
                  border: `2px solid ${plan.highlight ? col : 'var(--navy-border)'}`,
                  borderRadius: 14, padding: 24,
                  background: plan.highlight ? `${col}08` : 'var(--navy-mid)',
                  position: 'relative',
                  boxShadow: plan.highlight ? `0 0 28px ${col}20` : 'none'
                }}>
                  {(plan as any).badge && (
                    <div style={{
                      position: 'absolute', top: -13, left: '50%',
                      transform: 'translateX(-50%)', whiteSpace: 'nowrap'
                    }}>
                      <span style={{
                        background: 'var(--navy)', border: `1px solid ${col}`,
                        color: col, borderRadius: 20, padding: '3px 12px',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em'
                      }}>
                        {(plan as any).badge}
                      </span>
                    </div>
                  )}

                  <h3 style={{
                    fontSize: 16, fontWeight: 800, letterSpacing: '0.06em',
                    marginBottom: 4, color: (plan as any).color || 'var(--text)'
                  }}>{plan.name}</h3>

                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: 42, fontWeight: 700,
                      color: (plan as any).color || 'var(--text)'
                    }}>
                      ${price}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/mo</span>

                    {billing === 'annual' && price > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--green)' }}>
                        Billed ${plan.price.annual}/year
                      </div>
                    )}
                  </div>

                  <p style={{
                    fontSize: 12, color: 'var(--text-dim)',
                    marginBottom: 20, fontStyle: 'italic'
                  }}>{plan.tagline}</p>

                  <p style={{
                    fontSize: 11, color: 'var(--text-muted)',
                    marginBottom: 16, fontStyle: 'italic'
                  }}>See full feature comparison below</p>

                  {isCurrent ? (
                    <button style={{
                      width: '100%', padding: '10px', borderRadius: 8,
                      border: '1px solid var(--navy-border)',
                      background: 'var(--navy-light)', color: 'var(--text-muted)',
                      cursor: 'default', fontFamily: 'DM Sans', fontWeight: 600,
