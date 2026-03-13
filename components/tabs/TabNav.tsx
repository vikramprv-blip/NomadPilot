'use client';

type Tab = 'search' | 'mytrips' | 'destination' | 'account' | 'vault';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'search',      icon: '🔍', label: 'Search' },
  { id: 'mytrips',     icon: '✈', label: 'My Trips' },
  { id: 'destination', icon: '🌍', label: 'Destination' },
  { id: 'account',     icon: '👤', label: 'Account' },
  { id: 'vault',       icon: '🔐', label: 'Vault' },
];

export default function TabNav({ active, onChange, tripCount }: {
  active: Tab;
  onChange: (t: Tab) => void;
  tripCount?: number;
}) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--navy-border)', background: 'rgba(10,22,40,0.95)', backdropFilter: 'blur(12px)' }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', borderBottom: `2px solid ${active === t.id ? 'var(--gold)' : 'transparent'}`, transition: 'all 0.2s' }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: active === t.id ? 'var(--gold)' : 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t.label}</span>
          {t.id === 'mytrips' && tripCount && tripCount > 0 ? (
            <span style={{ position: 'absolute', top: 6, right: '25%', width: 16, height: 16, borderRadius: '50%', background: 'var(--gold)', color: 'var(--navy)', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tripCount}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
