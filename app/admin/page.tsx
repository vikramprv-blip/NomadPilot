'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const PLAN_COLOR: Record<string, string> = {
  free: 'var(--text-muted)', premium: '#3b82f6', pro: '#8b5cf6', elite: 'var(--gold)'
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ borderTop: `2px solid ${color || 'var(--gold)'}`, padding: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 700, color: color || 'var(--gold)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, title }: { data: Record<string, number>; title: string }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="card" style={{ padding: 20 }}>
      <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>{title}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(data).sort((a,b) => b[1]-a[1]).map(([k, v]) => (
          <div key={k}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
            </div>
            <div style={{ height: 6, background: 'var(--navy-border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(v / max) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--gold-dark), var(--gold))', borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<'overview'|'users'|'subscriptions'>('overview');
  const [tabData, setTabData] = useState<any>(null);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    fetch('/api/admin?type=overview')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const loadTab = async (t: 'users'|'subscriptions') => {
    setTab(t); setTabLoading(true);
    try {
      const res = await fetch(`/api/admin?type=${t}`);
      const d   = await res.json();
      setTabData(d);
    } finally {
      setTabLoading(false);
    }
  };

  if (authLoading || loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
        <div className="spin" style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>◌</div>
        <p>Loading dashboard...</p>
      </div>
    </div>
  );

  if (error === 'Unauthorized') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Admin Access Only</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Add your email to the ADMIN_EMAILS environment variable in Vercel.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--navy-border)', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,22,40,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <img src="/NP_Logo.jpg" alt="NomadPilot" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </a>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 18, color: 'var(--gold)' }}>NomadPilot</span>
          <span style={{ fontSize: 11, background: 'rgba(232,160,32,0.15)', color: 'var(--gold)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 4, padding: '2px 8px', fontWeight: 700, letterSpacing: '0.06em' }}>ADMIN</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Signed in as <strong style={{ color: 'var(--text)' }}>{user?.email}</strong>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 6 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 32 }}>Real-time overview of NomadPilot</p>

        {error && error !== 'Unauthorized' && (
          <div style={{ background: 'rgba(232,85,85,0.1)', border: '1px solid rgba(232,85,85,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 24, color: 'var(--red)', fontSize: 13 }}>
            ⚠ {error} — Make sure ADMIN_EMAILS is set in Vercel env vars.
          </div>
        )}

        {data && (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Users"    value={data.totalUsers}  sub={`+${data.newUsers} this month`} color="var(--gold)" />
              <StatCard label="Total Bookings" value={data.totalTrips}  sub={`+${data.newTrips} this month`} color="#3b82f6" />
              <StatCard label="Active Subs"    value={data.activeSubscriptions} sub="paying customers" color="#8b5cf6" />
              <StatCard label="Monthly Revenue" value={`$${(data.monthlyRevenue || 0).toLocaleString()}`} sub="recurring" color="var(--green)" />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              <BarChart data={data.planBreakdown}    title="Users by Plan" />
              <BarChart data={data.partnerBreakdown} title="Bookings by Partner" />
            </div>

            {/* Tab nav */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['overview','users','subscriptions'] as const).map(t => (
                <button key={t} onClick={() => t === 'overview' ? setTab('overview') : loadTab(t as any)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${tab === t ? 'var(--gold)' : 'var(--navy-border)'}`, background: tab === t ? 'rgba(232,160,32,0.12)' : 'var(--navy-light)', color: tab === t ? 'var(--gold)' : 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Overview table */}
            {tab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Recent Users</h4>
                  {(data.recentUsers || []).slice(0,8).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--navy-border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text)' }}>{u.email || u.id.slice(0, 12) + '...'}</span>
                      <span style={{ color: PLAN_COLOR[u.plan || 'free'], fontWeight: 600, textTransform: 'capitalize' }}>{u.plan || 'free'}</span>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Recent Bookings</h4>
                  {(data.recentTrips || []).slice(0,8).map((t: any) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--navy-border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-dim)' }}>{t.type} via {t.partner_name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users table */}
            {tab === 'users' && (
              tabLoading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}><span className="spin" style={{ fontSize: 24 }}>◌</span></div> :
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'var(--navy)', padding: '12px 20px', borderBottom: '1px solid var(--navy-border)' }}>
                  {['Email','Plan','Created','Status'].map(h => <span key={h} style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>)}
                </div>
                {(tabData?.users || []).map((u: any, i: number) => (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid var(--navy-border)', background: i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent', fontSize: 13 }}>
                    <span style={{ color: 'var(--text)' }}>{u.email || '—'}</span>
                    <span style={{ color: PLAN_COLOR[u.plan || 'free'], fontWeight: 600, textTransform: 'capitalize' }}>{u.plan || 'free'}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{new Date(u.created_at).toLocaleDateString()}</span>
                    <span className={`badge ${u.plan && u.plan !== 'free' ? 'badge-green' : 'badge-navy'}`} style={{ width: 'fit-content' }}>{u.plan && u.plan !== 'free' ? 'Subscribed' : 'Free'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Subscriptions table */}
            {tab === 'subscriptions' && (
              tabLoading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}><span className="spin" style={{ fontSize: 24 }}>◌</span></div> :
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: 'var(--navy)', padding: '12px 20px', borderBottom: '1px solid var(--navy-border)' }}>
                  {['ID','Plan','Amount','Status','Date'].map(h => <span key={h} style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>)}
                </div>
                {(tabData?.subscriptions || []).map((s: any, i: number) => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid var(--navy-border)', background: i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: 11 }}>{s.id?.slice(0,16)}...</span>
                    <span style={{ color: PLAN_COLOR[s.plan] || 'var(--text)', textTransform: 'capitalize', fontWeight: 600 }}>{s.plan}</span>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>${s.amount}</span>
                    <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-red'}`} style={{ width: 'fit-content' }}>{s.status}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
