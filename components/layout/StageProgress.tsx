'use client';

import { AppStage } from '@/types';

const STAGES: { key: AppStage; label: string; icon: string }[] = [
  { key: 'input',        label: 'Intent',    icon: '✦' },
  { key: 'processing',   label: 'AI Brain',  icon: '◎' },
  { key: 'generation',   label: 'Search',    icon: '⟳' },
  { key: 'confirmation', label: 'Options',   icon: '⊞' },
  { key: 'booking',      label: 'Book',      icon: '◈' },
  { key: 'ops',          label: 'Live Ops',  icon: '⬡' },
  { key: 'organizer',    label: 'Docs',      icon: '◻' },
  { key: 'post_trip',    label: 'Post-Trip', icon: '★' },
];

const ORDER = STAGES.map(s => s.key);

export default function StageProgress({ current }: { current: AppStage }) {
  const currentIdx = ORDER.indexOf(current);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
      {STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;

        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: done ? 'var(--green)' : active ? 'var(--sky)' : 'var(--night-light)',
                color: done || active ? 'white' : 'var(--muted)',
                border: active ? '2px solid rgba(14,165,233,0.4)' : '2px solid transparent',
                boxShadow: active ? '0 0 16px rgba(14,165,233,0.4)' : 'none',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : stage.icon}
              </div>
              <span style={{
                fontSize: 10, fontFamily: 'Syne, sans-serif', fontWeight: 600,
                color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--muted)',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div style={{
                width: 24, height: 2, margin: '0 2px', marginBottom: 20,
                background: done ? 'var(--green)' : 'var(--night-border)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
