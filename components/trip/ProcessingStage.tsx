'use client';

import { useEffect, useState } from 'react';
import { AppStage } from '@/types';

const STEPS: { stage: AppStage; label: string; detail: string }[] = [
  { stage: 'processing',   label: 'Parsing your intent',     detail: 'AI Brain extracting entities, dates & preferences' },
  { stage: 'generation',   label: 'Searching flights',        detail: 'Querying Amadeus GDS / NDC across 500+ airlines' },
  { stage: 'generation',   label: 'Searching hotels',         detail: 'Checking OTAs and direct hotel inventory' },
  { stage: 'optimization', label: 'Scoring options',          detail: 'Ranking by price, time, loyalty & ESG' },
  { stage: 'confirmation', label: 'Preparing your options',   detail: 'Top 3 itineraries ready for review' },
];

export default function ProcessingStage({ currentStage }: { currentStage: AppStage }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (currentStage === 'processing') setActiveStep(0);
    if (currentStage === 'generation') setActiveStep(1);
    if (currentStage === 'optimization') setActiveStep(3);
  }, [currentStage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => {
        const next = prev + 1;
        if (next >= STEPS.length) { clearInterval(interval); return prev; }
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fade-up" style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Animated globe */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 100, height: 100, margin: '0 auto 24px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(14,165,233,0.3), rgba(3,105,161,0.1))',
          border: '2px solid rgba(14,165,233,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40,
          animation: 'pulse-glow 2s ease-in-out infinite',
          position: 'relative',
        }}>
          ✈
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            border: '2px dashed rgba(14,165,233,0.2)',
            animation: 'spin 8s linear infinite',
          }} />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Planning your journey</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>
          Hang tight — our AI is searching hundreds of options for you
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {STEPS.map((step, i) => {
          const done = i < activeStep;
          const active = i === activeStep;

          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 18px',
                borderRadius: 12,
                background: active ? 'rgba(14,165,233,0.08)' : done ? 'rgba(16,185,129,0.05)' : 'transparent',
                border: `1px solid ${active ? 'rgba(14,165,233,0.25)' : done ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
                transition: 'all 0.4s',
                opacity: i > activeStep ? 0.3 : 1,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--green)' : active ? 'var(--sky)' : 'var(--night-border)',
                fontSize: 14, color: 'white',
              }}>
                {done ? '✓' : active ? <span className="spin">⟳</span> : i + 1}
              </div>
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 14 }}>{step.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{step.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
