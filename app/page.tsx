'use client';

import { useAppState } from '@/hooks/useAppState';
import StageProgress from '@/components/layout/StageProgress';
import InputStage from '@/components/trip/InputStage';
import ProcessingStage from '@/components/trip/ProcessingStage';
import ConfirmationStage from '@/components/trip/ConfirmationStage';
import BookingStage from '@/components/trip/BookingStage';
import { OpsStage, OrganizerStage, PostTripStage } from '@/components/trip/LateStages';

export default function HomePage() {
  const { state, loading, error, processInput, confirmItinerary, bookTrip, setStage, reset } = useAppState();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--night)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--night-border)',
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,15,30,0.8)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={reset}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--sky), var(--sky-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>✈</div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
            NomadPilot
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 32px' }}>
          {state.stage !== 'input' && (
            <StageProgress current={state.stage} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, minWidth: 160, justifyContent: 'flex-end' }}>
          {state.stage !== 'input' && (
            <button className="btn btn-ghost" onClick={reset} style={{ padding: '8px 16px', fontSize: 13 }}>
              ← New Trip
            </button>
          )}
        </div>
      </header>

      {/* Background effect */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(14,165,233,0.12), transparent)',
      }} />

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 1, padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 28, color: 'var(--red)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>⚠</span> {error}
            <button onClick={() => {}} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        )}

        {(state.stage === 'input') && (
          <InputStage onSubmit={processInput} loading={loading} />
        )}

        {(state.stage === 'processing' || state.stage === 'generation' || state.stage === 'optimization') && (
          <ProcessingStage currentStage={state.stage} />
        )}

        {state.stage === 'confirmation' && state.itineraries && state.intent && (
          <ConfirmationStage
            itineraries={state.itineraries}
            intent={state.intent}
            onConfirm={confirmItinerary}
          />
        )}

        {state.stage === 'booking' && state.selectedItinerary && (
          <BookingStage
            itinerary={state.selectedItinerary}
            onBook={bookTrip}
            loading={loading}
          />
        )}

        {state.stage === 'ops' && state.booking && state.selectedItinerary && (
          <OpsStage
            booking={state.booking}
            itinerary={state.selectedItinerary}
            tripId={state.tripId}
            onContinue={() => setStage('organizer')}
          />
        )}

        {state.stage === 'organizer' && state.selectedItinerary && state.booking && (
          <OrganizerStage
            itinerary={state.selectedItinerary}
            booking={state.booking}
            onContinue={() => setStage('post_trip')}
          />
        )}

        {state.stage === 'post_trip' && state.selectedItinerary && (
          <PostTripStage
            itinerary={state.selectedItinerary}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}
