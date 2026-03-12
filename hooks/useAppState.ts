'use client';

import { useState, useCallback } from 'react';
import { AppState, AppStage, TripIntent, Itinerary } from '@/types';

const initialState: AppState = { stage: 'input' };

function safeIntent(raw: any): TripIntent {
  return {
    raw:           raw?.raw           || '',
    origin:        raw?.origin        || raw?.from || '',
    destination:   raw?.destination   || raw?.to   || '',
    departureDate: raw?.departureDate || raw?.date  || '',
    returnDate:    raw?.returnDate    || raw?.return || '',
    travelers:     Number(raw?.travelers) || 1,
    budget:        raw?.preferences?.maxBudget || raw?.budget || undefined,
    nationality:   raw?.nationality   || undefined,
    tripType:      raw?.tripType      || 'return',
    preferences: {
      cabinClass: raw?.preferences?.cabinClass || 'economy',
    },
    constraints: {
      visaPassport: raw?.nationality || undefined,
    },
  } as TripIntent & { nationality?: string; tripType?: string };
}

export function useAppState() {
  const [state, setState]     = useState<AppState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const setStage = useCallback((stage: AppStage) => {
    setState(prev => ({ ...prev, stage }));
  }, []);

  const processInput = useCallback(async (userInput: string) => {
    setLoading(true);
    setError(null);
    setState(prev => ({ ...prev, stage: 'processing' }));

    try {
      const res  = await fetch('/api/ai-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: userInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI brain failed');

      const intent = safeIntent(data.intent || data);

      if (!intent.origin && !intent.destination && !intent.raw) {
throw new Error('Please enter both origin and destination.');
      }

      const tripId = data.tripId || `trip_${Date.now()}`;
      setState(prev => ({ ...prev, stage: 'generation', intent, tripId }));
      await generateTrip(intent, tripId);
    } catch (err: any) {
      setError(err.message);
      setState(prev => ({ ...prev, stage: 'input' }));
    } finally {
      setLoading(false);
    }
  }, []);

  const generateTrip = useCallback(async (intent: TripIntent, tripId?: string) => {
    setLoading(true);
    try {
      const res  = await fetch('/api/trip-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trip generation failed');
      setState(prev => ({ ...prev, stage: 'confirmation', itineraries: data.itineraries || [] }));
    } catch (err: any) {
      setError(err.message);
      setState(prev => ({ ...prev, stage: 'input' }));
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmItinerary = useCallback((itinerary: Itinerary) => {
    setState(prev => ({ ...prev, stage: 'booking', selectedItinerary: itinerary }));
  }, []);

  const bookTrip = useCallback(async (travelerInfo: object) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary: state.selectedItinerary,
          travelerInfo,
          tripId:    state.tripId,
          userId:    state.userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      setState(prev => ({ ...prev, stage: 'ops', booking: data.booking }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [state.selectedItinerary, state.tripId, state.userId]);

  const reset = useCallback(() => {
    setState(initialState);
    setError(null);
  }, []);

  return { state, loading, error, processInput, confirmItinerary, bookTrip, setStage, reset };
}
