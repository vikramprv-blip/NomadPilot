'use client';

const VISA_DATA: Record<string, { country: string; days: number; type: string; notes: string }[]> = {
  American: [
    { country: 'UK', days: 180, type: 'Visa-free', notes: 'Tourist entry, no work' },
    { country: 'Schengen (EU)', days: 90, type: 'Visa-free', notes: '90 days within any 180-day period' },
    { country: 'Japan', days: 90, type: 'Visa-free', notes: 'Per entry' },
    { country: 'Australia', days: 90, type: 'ETA required', notes: 'Apply online, AUD 20 fee' },
    { country: 'India', days: 60, type: 'e-Visa', notes: 'Apply 4 days before travel' },
    { country: 'UAE', days: 30, type: 'Visa on arrival', notes: 'Extendable' },
  ],
  British: [
    { country: 'Schengen (EU)', days: 90, type: 'Visa-free', notes: '90/180 days rule' },
    { country: 'USA', days: 90, type: 'ESTA required', notes: 'Apply online, $14 fee' },
    { country: 'Australia', days: 90, type: 'ETA required', notes: 'AUD 20' },
    { country: 'India', days: 60, type: 'e-Visa', notes: 'Apply online' },
    { country: 'UAE', days: 30, type: 'Visa on arrival', notes: 'Free for 30 days' },
    { country: 'Japan', days: 90, type: 'Visa-free', notes: 'Per entry' },
  ],
  Indian: [
    { country: 'Thailand', days: 30, type: 'Visa on arrival', notes: 'THB 2000 fee' },
    { country: 'UAE', days: 14, type: 'Visa required', notes: 'Sponsor or hotel required' },
    { country: 'UK', days: 180, type: 'Visa required', notes: 'Apply at VFS, 6-month validity' },
    { country: 'USA', days: 180, type: 'B1/B2 Visa', notes: 'Interview required' },
    { country: 'Maldives', days: 30, type: 'Visa on arrival', notes: 'Free, extendable' },
    { country: 'Sri Lanka', days: 30, type: 'e-Visa', notes: 'USD 20, apply online' },
    { country: 'Nepal', days: 30, type: 'Visa on arrival', notes: 'NPR 4000' },
    { country: 'Indonesia', days: 30, type: 'Visa on arrival', notes: 'IDR 500,000' },
  ],
  Australian: [
    { country: 'UK', days: 180, type: 'Visa-free', notes: 'Per entry' },
    { country: 'USA', days: 90, type: 'ESTA required', notes: 'USD 14' },
    { country: 'Schengen (EU)', days: 90, type: 'Visa-free', notes: '90/180 rule' },
    { country: 'Japan', days: 90, type: 'Visa-free', notes: 'Per entry' },
    { country: 'Indonesia', days: 30, type: 'Visa-free', notes: 'Bali & major airports' },
    { country: 'India', days: 60, type: 'e-Visa', notes: 'Apply online' },
  ],
};

function StayBar({ days, max = 180 }: { days: number; max?: number }) {
  const pct = Math.min((days / max) * 100, 100);
  const color = days >= 90 ? 'var(--green)' : days >= 30 ? 'var(--gold)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--navy-border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 52 }}>{days} days</span>
    </div>
  );
}

export default function VisaCalendar({ nationality }: { nationality: string }) {
  const data = VISA_DATA[nationality] || null;
  const typeColor = (t: string) => {
    if (t.toLowerCase().includes('free')) return 'badge-green';
    if (t.toLowerCase().includes('arrival') || t.toLowerCase().includes('e-visa') || t.toLowerCase().includes('eta')) return 'badge-gold';
    return 'badge-red';
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>🛂 Visa Calendar</h3>
        <span className="badge badge-navy">{nationality || 'Select nationality'}</span>
      </div>
      {!nationality ? (
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Select your nationality in the search form to see visa-free stays and requirements.</p>
      ) : !data ? (
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Select your nationality in the search form first, then click Visa Calendar to see requirements.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((row, i) => (
            <div key={i} style={{ borderBottom: i < data.length - 1 ? '1px solid var(--navy-border)' : 'none', paddingBottom: i < data.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{row.country}</span>
                <span className={`badge ${typeColor(row.type)}`}>{row.type}</span>
              </div>
              <StayBar days={row.days} />
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{row.notes}</p>
            </div>
          ))}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            ⚠ Always verify current visa rules with official embassy sources before travel.
          </p>
        </div>
      )}
    </div>
  );
}
