'use client';
import { useState } from 'react';
import VisaChecker from '@/components/trip/VisaChecker';

const NATIONALITIES = [
  'Afghan','Albanian','Algerian','American','Argentine','Armenian','Australian',
  'Austrian','Azerbaijani','Bahraini','Bangladeshi','Belgian','Brazilian','British',
  'Bulgarian','Cambodian','Canadian','Chilean','Chinese','Colombian','Croatian',
  'Czech','Danish','Dutch','Egyptian','Emirati','Estonian','Ethiopian','Finnish',
  'French','Georgian','German','Ghanaian','Greek','Hungarian','Indian','Indonesian',
  'Iranian','Iraqi','Irish','Israeli','Italian','Japanese','Jordanian','Kazakh',
  'Kenyan','Korean','Kuwaiti','Latvian','Lebanese','Lithuanian','Malaysian',
  'Mexican','Moroccan','Nigerian','Norwegian','Omani','Pakistani','Philippine',
  'Polish','Portuguese','Qatari','Romanian','Russian','Saudi','Serbian',
  'Singaporean','South African','Spanish','Sri Lankan','Swedish','Swiss','Syrian',
  'Taiwanese','Thai','Turkish','Ukrainian','Venezuelan','Vietnamese',
];

const POPULAR_DESTINATIONS = [
  { label: 'India (DEL)', code: 'DEL' },
  { label: 'UAE (DXB)', code: 'DXB' },
  { label: 'Thailand (BKK)', code: 'BKK' },
  { label: 'UK (LHR)', code: 'LHR' },
  { label: 'USA (JFK)', code: 'JFK' },
  { label: 'Schengen (FRA)', code: 'FRA' },
  { label: 'Japan (NRT)', code: 'NRT' },
  { label: 'Australia (SYD)', code: 'SYD' },
  { label: 'Singapore (SIN)', code: 'SIN' },
  { label: 'Canada (YYZ)', code: 'YYZ' },
];

export default function VisaCalendar({ nationality: defaultNationality = '' }: { nationality?: string }) {
  const [nationality, setNationality] = useState(defaultNationality);
  const [destination, setDestination] = useState('');
  const [customDest, setCustomDest]   = useState('');
  const [checked, setChecked]         = useState(false);

  const activeDest = customDest.trim() || destination;

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 22 }}>🛂</span>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Visa Requirements Checker</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Real-time data via Travel Buddy AI · 200 free checks/month</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Your Nationality</label>
          <select className="input-field" value={nationality} onChange={e => { setNationality(e.target.value); setChecked(false); }}>
            <option value="">Select nationality</option>
            {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Destination</label>
          <select className="input-field" value={destination} onChange={e => { setDestination(e.target.value); setCustomDest(''); setChecked(false); }}>
            <option value="">Popular destinations</option>
            {POPULAR_DESTINATIONS.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Or enter any city / IATA code</label>
        <input className="input-field" placeholder="e.g. Delhi, DEL, Mumbai, BOM, London..." value={customDest} onChange={e => { setCustomDest(e.target.value); setDestination(''); setChecked(false); }} />
      </div>

      <button className="btn btn-gold" disabled={!nationality || !activeDest} onClick={() => setChecked(true)} style={{ width: '100%', justifyContent: 'center', marginBottom: checked ? 16 : 0 }}>
        🛂 Check Visa Requirements
      </button>

      {checked && nationality && activeDest && (
        <VisaChecker nationality={nationality} destination={activeDest} inline={false} />
      )}
    </div>
  );
}
