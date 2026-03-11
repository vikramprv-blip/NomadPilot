'use client';
import { useState } from 'react';

type DestSection = 'overview'|'weather'|'map'|'restaurants'|'embassy'|'safety'|'flighttracker';

function LoadingCard() {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
      <div className="spin shimmer" style={{ fontSize: 24, display: 'block', marginBottom: 12 }}>◌</div>
      <p>Loading data...</p>
    </div>
  );
}

function WeatherWidget({ destination }: { destination: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Using Open-Meteo (free, no key needed) via geocoding first
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1`);
      const geoData = await geoRes.json();
      const loc = geoData.results?.[0];
      if (!loc) { setData({ error: 'Location not found' }); return; }

      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`);
      const w = await wRes.json();
      setData({ ...w, city: loc.name, country: loc.country });
    } finally {
      setLoading(false);
    }
  };

  const weatherDesc = (code: number) => {
    if (code === 0) return { desc: 'Clear sky', icon: '☀️' };
    if (code <= 3) return { desc: 'Partly cloudy', icon: '⛅' };
    if (code <= 48) return { desc: 'Foggy', icon: '🌫️' };
    if (code <= 67) return { desc: 'Rainy', icon: '🌧️' };
    if (code <= 77) return { desc: 'Snowy', icon: '❄️' };
    if (code <= 82) return { desc: 'Showers', icon: '🌦️' };
    return { desc: 'Stormy', icon: '⛈️' };
  };

  if (!data && !loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🌤️</div>
      <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>Get live weather for {destination}</p>
      <button className="btn btn-gold" onClick={load}>Load Weather</button>
    </div>
  );

  if (loading) return <LoadingCard />;
  if (data?.error) return <p style={{ color: 'var(--red)', padding: 20 }}>{data.error}</p>;

  const current = data.current;
  const daily   = data.daily;
  const { desc, icon } = weatherDesc(current.weather_code);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div>
      {/* Current */}
      <div className="card-gold" style={{ marginBottom: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{data.city}, {data.country}</div>
        <div style={{ fontSize: 64 }}>{icon}</div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 56, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>{Math.round(current.temperature_2m)}°C</div>
        <div style={{ fontSize: 16, color: 'var(--text-dim)', marginTop: 4 }}>{desc}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
          <span>💧 {current.relative_humidity_2m}%</span>
          <span>💨 {current.wind_speed_10m} km/h</span>
        </div>
      </div>
      {/* 7-day */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {daily.time.slice(0,7).map((date: string, i: number) => {
          const { icon: di } = weatherDesc(daily.weather_code[i]);
          return (
            <div key={date} className="card" style={{ textAlign: 'center', padding: '10px 4px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{days[new Date(date).getDay()]}</div>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{di}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{Math.round(daily.temperature_2m_max[i])}°</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(daily.temperature_2m_min[i])}°</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MapWidget({ destination }: { destination: string }) {
  return (
    <div>
      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <iframe
          title="map"
          width="100%" height="400"
          style={{ border: 'none', display: 'block' }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik&marker=0,0&query=${encodeURIComponent(destination)}`}
        />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <a href={`https://www.google.com/maps/search/${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <button className="btn btn-navy" style={{ fontSize: 13 }}>🗺️ Open in Google Maps</button>
        </a>
        <a href={`https://maps.apple.com/?q=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <button className="btn btn-navy" style={{ fontSize: 13 }}>🍎 Apple Maps</button>
        </a>
        <a href={`https://www.maps.me/`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <button className="btn btn-navy" style={{ fontSize: 13 }}>📴 Offline Maps (MAPS.ME)</button>
        </a>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>For offline maps, download MAPS.ME or Google Maps offline for {destination} before your trip.</p>
    </div>
  );
}

function AIDataWidget({ destination, type, title, icon }: { destination: string; type: string; title: string; icon: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/destination?destination=${encodeURIComponent(destination)}&type=${type}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>{title} for {destination}</p>
      <button className="btn btn-gold" onClick={load}>Load {title}</button>
    </div>
  );

  if (loading) return <LoadingCard />;

  // Restaurants
  if (type === 'restaurants' && data?.mustEat) return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {data.mustEat.map((r: any, i: number) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className="badge badge-navy">{r.cuisine}</span>
                <span className="badge badge-gold">{r.priceRange}</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>{r.description}</p>
            <p style={{ fontSize: 12, color: 'var(--gold-light)' }}>📍 {r.area} · 💡 {r.tip}</p>
          </div>
        ))}
      </div>
      {data.localDishes && (
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>Must-try local dishes</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.localDishes.map((d: any, i: number) => (
              <div key={i} style={{ background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: 8, padding: '8px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Embassy
  if (type === 'embassy' && data?.embassies) return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {data.embassies.map((e: any, i: number) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>🏛️ {e.country} Embassy</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
              <span>📍 {e.address}</span>
              <span>📞 {e.phone}</span>
              <span>📧 {e.email}</span>
              <span>🕒 {e.hours}</span>
            </div>
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(232,85,85,0.08)', border: '1px solid rgba(232,85,85,0.2)', fontSize: 12, color: 'var(--red)' }}>
              🚨 Emergency: {e.emergency}
            </div>
          </div>
        ))}
      </div>
      {data.localEmergency && (
        <div className="card-gold" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Local Emergency Numbers</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
            <span>🚔 Police: <strong>{data.localEmergency.police}</strong></span>
            <span>🚑 Ambulance: <strong>{data.localEmergency.ambulance}</strong></span>
            <span>🚒 Fire: <strong>{data.localEmergency.fire}</strong></span>
          </div>
        </div>
      )}
    </div>
  );

  // Safety
  if (type === 'safety' && data?.overallLevel) {
    const levelColor = ({ low: 'var(--green)', medium: 'var(--amber)', high: 'var(--red)', critical: '#ff0000' } as Record<string, string>)[data.overallLevel as string] || 'var(--text-dim)';
    return (
      <div>
        <div style={{ padding: '16px 20px', borderRadius: 10, background: `${levelColor}12`, border: `1px solid ${levelColor}40`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>{data.overallLevel === 'low' ? '🟢' : data.overallLevel === 'medium' ? '🟡' : '🔴'}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: levelColor, textTransform: 'capitalize' }}>Safety Level: {data.overallLevel}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Last updated: {data.lastUpdated}</div>
          </div>
        </div>
        {data.alerts?.map((a: any, i: number) => (
          <div key={i} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${a.severity === 'high' ? 'var(--red)' : a.severity === 'medium' ? 'var(--amber)' : 'var(--green)'}`, padding: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{a.description}</div>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {[['🚔 Crime', data.crimeAdvice], ['🚌 Transport', data.transportAdvice], ['🏥 Health', data.healthAdvice]].map(([label, text]) => (
            text && <div key={label as string} className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{label as string}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{text as string}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <pre style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>{JSON.stringify(data, null, 2)}</pre>;
}

function FlightTracker() {
  const [flightNum, setFlightNum] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const track = async () => {
    if (!flightNum.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/destination?type=flightTracker&flight=${encodeURIComponent(flightNum)}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<string, string> = { on_time: 'var(--green)', delayed: 'var(--amber)', cancelled: 'var(--red)', landed: 'var(--gold)', unknown: 'var(--text-muted)' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input className="input-field" placeholder="Enter flight number e.g. EK203" value={flightNum} onChange={e => setFlightNum(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && track()} style={{ flex: 1 }} />
        <button className="btn btn-gold" onClick={track} disabled={loading || !flightNum.trim()}>
          {loading ? <span className="spin">◌</span> : '🔍'} Track
        </button>
      </div>
      {loading && <LoadingCard />}
      {data && !loading && (
        <div className="card-gold" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 700 }}>{data.flightNumber}</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{data.airline}</div>
            </div>
            <span style={{ padding: '6px 16px', borderRadius: 20, background: `${statusColor[data.status] || 'var(--text-muted)'}20`, color: statusColor[data.status] || 'var(--text-muted)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', height: 'fit-content' }}>{data.status?.replace('_',' ')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{data.departure?.airport}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Scheduled: {data.departure?.scheduled}</div>
              <div style={{ fontSize: 13, color: 'var(--gold)' }}>Actual: {data.departure?.actual || '—'}</div>
              {data.gate && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Gate: {data.gate} · Terminal: {data.terminal}</div>}
            </div>
            <div style={{ fontSize: 28, color: 'var(--gold)' }}>✈</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{data.arrival?.airport}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Scheduled: {data.arrival?.scheduled}</div>
              <div style={{ fontSize: 13, color: 'var(--gold)' }}>Estimated: {data.arrival?.estimated || '—'}</div>
            </div>
          </div>
          {data.note && <p style={{ fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--navy-border)', paddingTop: 12 }}>ℹ️ {data.note}</p>}
        </div>
      )}
    </div>
  );
}

const SECTIONS: { id: DestSection; icon: string; label: string }[] = [
  { id: 'overview',      icon: '🌍', label: 'Overview' },
  { id: 'weather',       icon: '🌤️', label: 'Weather' },
  { id: 'map',           icon: '🗺️', label: 'Map' },
  { id: 'restaurants',   icon: '🍽️', label: 'Food' },
  { id: 'embassy',       icon: '🏛️', label: 'Embassy' },
  { id: 'safety',        icon: '🛡️', label: 'Safety' },
  { id: 'flighttracker', icon: '✈', label: 'Tracker' },
];

export default function DestinationTab() {
  const [destination, setDestination] = useState('');
  const [active, setDestination2] = useState('');
  const [section, setSection] = useState<DestSection>('weather');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const search = async () => {
    if (!destination.trim()) return;
    setDestination2(destination);
    setOverviewLoading(true);
    try {
      const res = await fetch(`/api/destination?destination=${encodeURIComponent(destination)}&type=all`);
      setOverviewData(await res.json());
    } finally {
      setOverviewLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 6 }}>Destination Guide</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 15, marginBottom: 16 }}>Weather, maps, food, safety & more for any destination</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="input-field" placeholder="Enter destination e.g. Tokyo, Japan" value={destination} onChange={e => setDestination(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} style={{ flex: 1 }} />
          <button className="btn btn-gold" onClick={search} disabled={!destination.trim()}>🔍 Explore</button>
        </div>
      </div>

      {active && (
        <>
          {/* Section tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${section === s.id ? 'var(--gold)' : 'var(--navy-border)'}`, background: section === s.id ? 'rgba(232,160,32,0.12)' : 'var(--navy-light)', color: section === s.id ? 'var(--gold)' : 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 24, minHeight: 300 }}>
            {section === 'overview' && (
              overviewLoading ? <LoadingCard /> :
              overviewData ? (
                <div>
                  <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{overviewData.overview}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
                    {[['Currency', overviewData.currency], ['Language', overviewData.language], ['Timezone', overviewData.timezone], ['Best Time', overviewData.bestTime]].filter(([,v])=>v).map(([k,v]) => (
                      <div key={k as string} style={{ background: 'var(--navy-light)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k as string}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{v as string}</div>
                      </div>
                    ))}
                  </div>
                  {overviewData.topAttractions && (
                    <div>
                      <h4 style={{ fontWeight: 700, marginBottom: 10 }}>Top Attractions</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {overviewData.topAttractions.map((a: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--navy-light)', borderRadius: 8 }}>
                            <span style={{ color: 'var(--gold)', fontSize: 16 }}>★</span>
                            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{a.description}</div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : <p style={{ color: 'var(--text-dim)' }}>Search a destination to see the overview.</p>
            )}
            {section === 'weather'       && <WeatherWidget destination={active} />}
            {section === 'map'           && <MapWidget destination={active} />}
            {section === 'restaurants'   && <AIDataWidget destination={active} type="restaurants" title="Top Restaurants" icon="🍽️" />}
            {section === 'embassy'       && <AIDataWidget destination={active} type="embassy" title="Embassy Information" icon="🏛️" />}
            {section === 'safety'        && <AIDataWidget destination={active} type="safety" title="Safety Alerts" icon="🛡️" />}
            {section === 'flighttracker' && <FlightTracker />}
          </div>
        </>
      )}

      {!active && (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--navy-mid)', borderRadius: 16, border: '1px dashed var(--navy-border)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
          <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>Enter a destination above to explore weather, maps, restaurants, embassy info, safety alerts and more.</p>
        </div>
      )}
    </div>
  );
}
