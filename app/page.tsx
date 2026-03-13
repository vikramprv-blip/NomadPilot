'use client';
import { useState, useCallback } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import BetaGate from '@/components/beta/BetaGate';
import VaultTab from '@/components/vault/VaultTab';
import TabNav from '@/components/tabs/TabNav';
import StageProgress from '@/components/layout/StageProgress';
import InputStage from '@/components/trip/InputStage';
import ProcessingStage from '@/components/trip/ProcessingStage';
import ConfirmationStage from '@/components/trip/ConfirmationStage';
import BookingStage from '@/components/trip/BookingStage';
import VisaCalendar from '@/components/trip/VisaCalendar';
import { OpsStage, OrganizerStage, PostTripStage } from '@/components/trip/LateStages';
import MyTripsTab from '@/components/mytrips/MyTripsTab';
import DestinationTab from '@/components/destination/DestinationTab';
import AccountTab from '@/components/account/AccountTab';
import AuthModal from '@/components/auth/AuthModal';
import ChatBot from '@/components/chat/ChatBot';

type Tab = 'search' | 'mytrips' | 'destination' | 'account' | 'vault';

export default function HomePage() {
  const { state, loading, error, processInput, processStructuredSearch, confirmItinerary, bookTrip, setStage, reset } = useAppState();
  const { user, loading: authLoading, signOut } = useAuth();
  const { permission, supported, requestPermission, notify } = usePushNotifications(user?.id);

  const [tab, setTab]                   = useState<Tab>('search');
  const [nationality, setNationality]   = useState('');
  const [showVisa, setShowVisa]         = useState(false);
  const [showAuth, setShowAuth]         = useState(false);
  const [tripCount, setTripCount]       = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifBanner, setNotifBanner]   = useState(true);

  const handleSaveBooking = useCallback((type: string, partner: string, url: string, details: object) => {
    const stored  = localStorage.getItem('nomadpilot_trips');
    const trips   = stored ? JSON.parse(stored) : [];
    const newTrip = {
      id: Math.random().toString(36).slice(2),
      type, partner_name: partner, partner_url: url,
      details, status: 'booked',
      created_at: new Date().toISOString(),
      user_id: user?.id,
    };
    const updated = [newTrip, ...trips];
    localStorage.setItem('nomadpilot_trips', JSON.stringify(updated));
    setTripCount(updated.length);
    notify(`${type === 'flight' ? '✈ Flight' : type === 'hotel' ? '🏨 Hotel' : type === 'car' ? '🚗 Car' : '🚂 Train'} saved to My Trips`, `Booked via ${partner}`);
  }, [user, notify]);

  // Structured search tab — bypass Gemini, parse form directly
  const handleSearchSubmit = useCallback((data: object) => {
    const d = data as any;
    if (d.nationality) setNationality(d.nationality);
    processStructuredSearch(d);
  }, [processStructuredSearch]);

  // AI planner tab — go through Gemini
  const handleAISubmit = useCallback((text: string) => {
    processInput(text);
  }, [processInput]);

  const inSearch     = tab === 'search';
  const showProgress = inSearch && state.stage !== 'input';
  const chatContext  = user ? { name: user.user_metadata?.full_name || user.email, email: user.email, plan: user.user_metadata?.plan || 'free', tripCount } : undefined;

  return (
    <BetaGate>
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 45% at 50% -5%, rgba(232,160,32,0.07), transparent)' }} />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}

      {supported && permission === 'default' && notifBanner && (
        <div style={{ background: 'rgba(232,160,32,0.1)', borderBottom: '1px solid rgba(232,160,32,0.2)', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, zIndex: 50 }}>
          <span style={{ color: 'var(--text-dim)' }}>🔔 Enable push notifications for flight delays & safety alerts</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={requestPermission} className="btn btn-gold" style={{ fontSize: 12, padding: '5px 14px' }}>Enable</button>
            <button onClick={() => setNotifBanner(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>
      )}

      <header style={{ borderBottom: '1px solid var(--navy-border)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,22,40,0.92)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100, height: 58, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }} onClick={() => { reset(); setTab('search'); }}>
          <img src="/NP_Logo.jpg" alt="NomadPilot" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 19, color: 'var(--gold)' }}>NomadPilot</span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
          {showProgress && <StageProgress current={state.stage} />}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {inSearch && state.stage === 'input' && (
            <button onClick={() => setShowVisa(v => !v)} className="btn btn-navy" style={{ fontSize: 12, padding: '6px 12px' }}>🛂 Visa</button>
          )}
          {inSearch && state.stage !== 'input' && (
            <button className="btn btn-navy" onClick={reset} style={{ fontSize: 12, padding: '6px 12px' }}>← New Search</button>
          )}
          {!authLoading && (
            user ? (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowUserMenu(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--navy)', fontWeight: 800 }}>
                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                </button>
                {showUserMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 10, padding: 8, minWidth: 180, zIndex: 200, boxShadow: 'var(--shadow)' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--navy-border)', marginBottom: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Signed in as</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.email}</div>
                    </div>
                    <a href="/admin" style={{ textDecoration: 'none', display: 'block' }}>
                      <button style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', borderRadius: 6 }}>⚙ Admin Dashboard</button>
                    </a>
                    <button onClick={() => { signOut(); setShowUserMenu(false); }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 12px', color: 'var(--red)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', borderRadius: 6 }}>↩ Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="btn btn-gold" style={{ fontSize: 12, padding: '6px 16px' }}>Sign In</button>
            )
          )}
        </div>
      </header>

      <TabNav active={tab} onChange={t => { setTab(t); if (t !== 'search') reset(); }} tripCount={tripCount} />

      {error && tab === 'search' && (
        <div style={{ background: 'rgba(232,85,85,0.1)', padding: '10px 24px', color: 'var(--red)', fontSize: 13 }}>⚠ {error}</div>
      )}

      {showUserMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 150 }} onClick={() => setShowUserMenu(false)} />}

      <main style={{ position: 'relative', zIndex: 1, flex: 1, padding: '40px 24px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {tab === 'search' && (
          <>
            {state.stage === 'input' && (
              <>
                <InputStage onSubmit={handleSearchSubmit} onAISubmit={handleAISubmit} loading={loading} />
                {showVisa && <div style={{ maxWidth: 880, margin: '28px auto 0' }}><VisaCalendar nationality={nationality} /></div>}
              </>
            )}
            {(state.stage === 'processing' || state.stage === 'generation' || state.stage === 'optimization') && <ProcessingStage currentStage={state.stage} />}
            {state.stage === 'confirmation' && state.itineraries && state.intent && (
              <ConfirmationStage itineraries={state.itineraries} intent={state.intent} onSaveBooking={handleSaveBooking} />
            )}
            {state.stage === 'booking'   && state.selectedItinerary && <BookingStage itinerary={state.selectedItinerary} onBook={bookTrip} loading={loading} />}
            {state.stage === 'ops'       && state.booking && state.selectedItinerary && <OpsStage booking={state.booking} itinerary={state.selectedItinerary} tripId={state.tripId} onContinue={() => setStage('organizer')} />}
            {state.stage === 'organizer' && state.selectedItinerary && state.booking  && <OrganizerStage itinerary={state.selectedItinerary} booking={state.booking} onContinue={() => setStage('post_trip')} />}
            {state.stage === 'post_trip' && state.selectedItinerary && <PostTripStage itinerary={state.selectedItinerary} onReset={reset} />}
          </>
        )}
        {tab === 'mytrips'     && <MyTripsTab userId={user?.id} />}
        {tab === 'destination' && <DestinationTab />}
        {tab === 'account'     && <AccountTab currentPlan={user?.user_metadata?.plan || 'free'} />}
        {tab === 'vault'       && <VaultTab user={user} />}
      </main>

      <ChatBot user={user} userContext={chatContext} />
    </div>
    </BetaGate>
  );
}
