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
                {b === 'monthly' ? 'Monthly' : <span>Annual <span style={{ marginLeft: 4, fontSize: 10, background: 'rgba(45,212,160,0.2)', color: 'var(--green)'
