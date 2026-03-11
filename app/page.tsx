'use client';
import { useState, useCallback } from 'react';
import { useAppState } from '@/hooks/useAppState';
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

type Tab = 'search'|'mytrips'|'destination'|'account';

export default function HomePage() {
  const { state, loading, error, processInput, confirmItinerary, bookTrip, setStage, reset } = useAppState();
  const [tab, setTab]             = useState<Tab>('search');
  const [nationality, setNationality] = useState('');
  const [showVisa, setShowVisa]   = useState(false);
  const [tripCount, setTripCount] = useState(0);

  // Save booking to localStorage + increment counter
  const handleSaveBooking = useCallback((type: string, partner: string, url: string, details: object) => {
    const stored = localStorage.getItem('nomadpilot_trips');
    const trips = stored ? JSON.parse(stored) : [];
    const newTrip = {
      id: Math.random().toString(36).slice(2),
      type, partner_name: partner, partner_url: url,
      details, status: 'booked',
      created_at: new Date().toISOString(),
    };
    const updated = [newTrip, ...trips];
    localStorage.setItem('nomadpilot_trips', JSON.stringify(updated));
    setTripCount(updated.length);

    // Flash My Trips tab
    const el = document.getElementById('mytrips-badge');
    if (el) { el.style.transform = 'scale(1.4)'; setTimeout(() => { el.style.transform = 'scale(1)'; }, 300); }
  }, []);

  const handleSearchSubmit = (data: object) => {
    const d = data as any;
    if (d.nationality) setNationality(d.nationality);
    const leg = d.legs?.[0] || {};
    const text = `I want to travel from ${leg.from||leg.from||'origin'} to ${leg.to||'destination'} on ${leg.date||leg.departure||'soon'}, ${d.travelers||1} traveler(s), ${d.cabinClass||'economy'} class. Services: ${(d.services||[]).join(', ')}.${d.nationality?` Nationality: ${d.nationality}.`:''}`;
    processInput(text);
  };

  const inSearch = tab === 'search';
  const showProgress = inSearch && state.stage !== 'input';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      {/* BG */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 45% at 50% -5%, rgba(232,160,32,0.07), transparent)' }} />

      {/* Header */}
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
            <button onClick={() => setShowVisa(v => !v)} className="btn btn-navy" style={{ fontSize: 12, padding: '6px 12px' }}>
              🛂 Visa
            </button>
          )}
          {inSearch && state.stage !== 'input' && (
            <button className="btn btn-navy" onClick={() => { reset(); }} style={{ fontSize: 12, padding: '6px 12px' }}>← New Search</button>
          )}
        </div>
      </header>

      {/* Tab nav */}
      <TabNav active={tab} onChange={t => { setTab(t); if (t !== 'search') reset(); }} tripCount={tripCount} />

      {/* Error */}
      {error && tab === 'search' && (
        <div style={{ background: 'rgba(232,85,85,0.1)', border: '1px solid rgba(232,85,85,0.3)', borderRadius: 0, padding: '10px 24px', color: 'var(--red)', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, padding: '40px 24px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* ─ Search Tab ─ */}
        {tab === 'search' && (
          <>
            {state.stage === 'input' && (
              <>
                <InputStage onSubmit={handleSearchSubmit} onAISubmit={processInput} loading={loading} />
                {showVisa && (
                  <div style={{ maxWidth: 880, margin: '28px auto 0' }}>
                    <VisaCalendar nationality={nationality} />
                  </div>
                )}
              </>
            )}

            {(state.stage === 'processing' || state.stage === 'generation' || state.stage === 'optimization') && (
              <ProcessingStage currentStage={state.stage} />
            )}

            {state.stage === 'confirmation' && state.itineraries && state.intent && (
              <ConfirmationStage
                itineraries={state.itineraries}
                intent={state.intent}
                onSaveBooking={handleSaveBooking}
              />
            )}

            {state.stage === 'booking' && state.selectedItinerary && (
              <BookingStage itinerary={state.selectedItinerary} onBook={bookTrip} loading={loading} />
            )}

            {state.stage === 'ops' && state.booking && state.selectedItinerary && (
              <OpsStage booking={state.booking} itinerary={state.selectedItinerary} tripId={state.tripId} onContinue={() => setStage('organizer')} />
            )}

            {state.stage === 'organizer' && state.selectedItinerary && state.booking && (
              <OrganizerStage itinerary={state.selectedItinerary} booking={state.booking} onContinue={() => setStage('post_trip')} />
            )}

            {state.stage === 'post_trip' && state.selectedItinerary && (
              <PostTripStage itinerary={state.selectedItinerary} onReset={() => { reset(); }} />
            )}
          </>
        )}

        {/* ─ My Trips Tab ─ */}
        {tab === 'mytrips' && <MyTripsTab />}

        {/* ─ Destination Tab ─ */}
        {tab === 'destination' && <DestinationTab />}

        {/* ─ Account Tab ─ */}
        {tab === 'account' && <AccountTab currentPlan="free" />}
      </main>
    </div>
  );
}
