'use client';
import { useState } from 'react';

const PLANS = [
  {
    id: 'explorer',
    name: 'Explorer',
    price: { monthly: 0, annual: 0 },
    tagline: 'Get started for free',
    features: ['5 trip searches/month', 'AI trip planner (basic)', 'Visa requirement checker', 'Flight & hotel results', 'Email itinerary'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    id: 'navigator',
    name: 'Navigator',
    price: { monthly: 19, annual: 15 },
    tagline: 'Best for frequent travelers',
    features: ['Unlimited trip searches', 'AI trip planner (advanced)', 'Multi-city planning', 'Car rental & train search', 'Real-time ops monitoring', 'Calendar sync', 'Priority support', 'No booking fees'],
    cta: 'Start Navigator',
    highlight: true,
    badge: '★ Most Popular',
  },
  {
    id: 'business',
    name: 'Business',
    price: { monthly: 49, annual: 39 },
    tagline: 'For teams & corporate travel',
    features: ['Everything in Navigator', 'Up to 10 team members', 'Corporate policy engine', 'T&E / ERP integration', 'Approval workflows', 'Dedicated account manager', 'Custom reporting', 'SLA support'],
    cta: 'Start Business',
    highlight: false,
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, provider: 'stripe' | 'paypal') => {
    setLoading(`${planId}-${provider}`);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billing, provider }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert('Checkout unavailable — please configure Stripe/PayPal keys in Vercel env vars.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', padding: '80px 24px' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(232,160,32,0.07), transparent)' }} />
      <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 20, marginBottom: 20, background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.2)' }}>
            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.12em' }}>SIMPLE PRICING</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, marginBottom: 12 }}>
            Travel smarter.<br /><span style={{ color: 'var(--gold)' }}>Pay less.</span>
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 16, maxWidth: 400, margin: '0 auto 28px' }}>
            One platform for flights, hotels, visas, cars, trains & AI planning.
          </p>
          <div style={{ display: 'inline-flex', background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 10, padding: 4, gap: 4 }}>
            {(['monthly', 'annual'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, background: billing === b ? 'var(--gold)' : 'transparent', color: billing === b ? 'var(--navy)' : 'var(--text-dim)', transition: 'all 0.2s' }}>
                {b === 'monthly' ? 'Monthly' : <span>Annual <span style={{ marginLeft: 4, fontSize: 10, background: 'rgba(45,212,160,0.2)', color: 'var(--green)', padding: '1px 6px', borderRadius: 4 }}>−20%</span></span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginBottom: 48 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ border: `2px solid ${plan.highlight ? 'var(--gold)' : 'var(--navy-border)'}`, borderRadius: 16, padding: 28, background: plan.highlight ? 'rgba(232,160,32,0.04)' : 'var(--navy-mid)', position: 'relative', boxShadow: plan.highlight ? '0 0 32px rgba(232,160,32,0.12)' : 'none' }}>
              {'badge' in plan && plan.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                  <span className="badge badge-gold">{plan.badge}</span>
                </div>
              )}
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>{plan.tagline}</p>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 40, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', color: plan.highlight ? 'var(--gold)' : 'var(--text)' }}>
                  ${plan.price[billing]}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>/mo</span>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
                    <span style={{ color: 'var(--green)', fontSize: 12, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan.price.monthly === 0 ? (
                <button className="btn btn-navy" style={{ width: '100%', justifyContent: 'center' }}>{plan.cta}</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleSubscribe(plan.id, 'stripe')} disabled={loading === `${plan.id}-stripe`}>
                    {loading === `${plan.id}-stripe` ? <span className="spin">◌</span> : '💳'} Pay with Card
                  </button>
                  <button className="btn btn-navy" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleSubscribe(plan.id, 'paypal')} disabled={loading === `${plan.id}-paypal`}>
                    {loading === `${plan.id}-paypal` ? <span className="spin">◌</span> : '🅿'} Pay with PayPal
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
          All plans include a 7-day free trial · Cancel anytime · No hidden fees
        </div>
      </div>
    </div>
  );
}
