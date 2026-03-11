'use client';
import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import StageProgress from '@/components/layout/StageProgress';
import InputStage from '@/components/trip/InputStage';
import ProcessingStage from '@/components/trip/ProcessingStage';
import ConfirmationStage from '@/components/trip/ConfirmationStage';
import BookingStage from '@/components/trip/BookingStage';
import VisaCalendar from '@/components/trip/VisaCalendar';
import { OpsStage, OrganizerStage, PostTripStage } from '@/components/trip/LateStages';

export default function HomePage() {
  const { state, loading, error, processInput, confirmItinerary, bookTrip, setStage, reset } = useAppState();
  const [nationality, setNationality] = useState('');
  const [showVisa, setShowVisa] = useState(false);

  const handleSearchSubmit = (data: object) => {
    const d = data as any;
    if (d.nationality) setNationality(d.nationality);
    const leg = d.legs?.[0] || {};
    const text = `I want to travel from ${leg.from||'origin'} to ${leg.to||'destination'} on ${leg.date||leg.departure||'soon'}, ${d.travelers||1} traveler(s), ${d.cabinClass||'economy'} class. Services: ${(d.services||[]).join(', ')}.${d.nationality?` Nationality: ${d.nationality}.`:''}`;
    processInput(text);
  };

  return (
    <div style={{minHeight:'100vh',background:'var(--navy)'}}>
      <div style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',background:'radial-gradient(ellipse 80% 45% at 50% -5%, rgba(232,160,32,0.08), transparent)'}} />

      <header style={{borderBottom:'1px solid var(--navy-border)',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(10,22,40,0.85)',backdropFilter:'blur(16px)',position:'sticky',top:0,zIndex:100,height:64}}>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexShrink:0}} onClick={reset}>
          <img src="/NP_Logo.jpg" alt="NomadPilot" style={{width:36,height:36,borderRadius:8,objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
          <span style={{fontFamily:'Cormorant Garamond, serif',fontWeight:700,fontSize:20,color:'var(--gold)'}}>NomadPilot</span>
        </div>

        <div style={{flex:1,display:'flex',justifyContent:'center',padding:'0 24px'}}>
          {state.stage!=='input'&&<StageProgress current={state.stage} />}
        </div>

        <div style={{display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
          {state.stage==='input'&&(
            <>
              <button onClick={()=>setShowVisa(v=>!v)} className="btn btn-navy" style={{fontSize:12,padding:'7px 14px'}}>🛂 Visa Calendar</button>
              <a href="/pricing" style={{textDecoration:'none'}}><button className="btn btn-outline" style={{fontSize:12,padding:'7px 14px'}}>✦ Plans & Pricing</button></a>
            </>
          )}
          {state.stage!=='input'&&(
            <button className="btn btn-navy" onClick={reset} style={{fontSize:12,padding:'7px 14px'}}>← New Trip</button>
          )}
        </div>
      </header>

      <main style={{position:'relative',zIndex:1,padding:'52px 24px',maxWidth:1100,margin:'0 auto'}}>
        {error&&(
          <div style={{background:'rgba(232,85,85,0.1)',border:'1px solid rgba(232,85,85,0.3)',borderRadius:10,padding:'12px 18px',marginBottom:24,color:'var(--red)',fontSize:14}}>
            ⚠ {error}
          </div>
        )}

        {state.stage==='input'&&(
          <>
            <InputStage onSubmit={handleSearchSubmit} onAISubmit={processInput} loading={loading} />
            {showVisa&&(
              <div style={{maxWidth:880,margin:'28px auto 0'}}>
                <VisaCalendar nationality={nationality} />
              </div>
            )}
          </>
        )}

        {(state.stage==='processing'||state.stage==='generation'||state.stage==='optimization')&&(
          <ProcessingStage currentStage={state.stage} />
        )}

        {state.stage==='confirmation'&&state.itineraries&&state.intent&&(
          <ConfirmationStage itineraries={state.itineraries} intent={state.intent} onConfirm={confirmItinerary} />
        )}

        {state.stage==='booking'&&state.selectedItinerary&&(
          <BookingStage itinerary={state.selectedItinerary} onBook={bookTrip} loading={loading} />
        )}

        {state.stage==='ops'&&state.booking&&state.selectedItinerary&&(
          <OpsStage booking={state.booking} itinerary={state.selectedItinerary} tripId={state.tripId} onContinue={()=>setStage('organizer')} />
        )}

        {state.stage==='organizer'&&state.selectedItinerary&&state.booking&&(
          <OrganizerStage itinerary={state.selectedItinerary} booking={state.booking} onContinue={()=>setStage('post_trip')} />
        )}

        {state.stage==='post_trip'&&state.selectedItinerary&&(
          <PostTripStage itinerary={state.selectedItinerary} onReset={reset} />
        )}
      </main>
    </div>
  );
}
