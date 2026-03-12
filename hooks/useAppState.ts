'use client';

import { useState, useCallback } from 'react';
import { AppState, AppStage, TripIntent, Itinerary } from '@/types';

const initialState: AppState = { stage: 'input' };

function safeIntent(raw: any): TripIntent {
  return {
    raw:           raw?.raw           || '',
    origin:        raw?.origin        || raw?.from || '',
    destination:   raw?.destination   || raw?.to   || '',
    departureDate: raw?.departureDate || raw?.date  || raw?.departure || '',
    returnDate:    raw?.returnDate    || raw?.return || '',
    travelers:     Number(raw?.travelers) || 1,
    budget:        raw?.budget        || undefined,
    preferences: {
      cabinClass: raw?.preferences?.cabinClass || raw?.cabinClass || 'economy',
    },
    constraints: {
      visaPassport: raw?.nationality || undefined,
    },
  };
}

export function useAppState() {
  const [state, setState]     = useState<AppState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const setStage = useCallback((stage: AppStage) => {
    setState(prev => ({ ...prev, stage }));
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

  // Structured search form — bypasses Gemini entirely
  const processStructuredSearch = useCallback(async (formData: any) => {
    setLoading(true);
    setError(null);
    setState(prev => ({ ...prev, stage: 'processing' }));
    try {
      const leg    = formData.legs?.[0] || {};
      const intent = safeIntent({
        origin:        leg.from       || '',
        destination:   leg.to         || '',
        departureDate: leg.departure  || leg.date || '',
        returnDate:    leg.return     || '',
        travelers:     formData.travelers  || 1,
        cabinClass:    formData.cabinClass || 'economy',
        nationality:   formData.nationality || '',
        preferences:   { cabinClass: formData.cabinClass || 'economy' },
        constraints:   { visaPassport: formData.nationality || '' },
      });
      if (!intent.origin || !intent.destination) {
        throw new Error('Please enter both origin and destination.');
      }
      if (!intent.departureDate) {
        throw new Error('Please select a departure date.');
      }
      const tripId = `trip_${Date.now()}`;
      setState(prev => ({ ...prev, stage: 'generation', intent, tripId }));
      await generateTrip(intent, tripId);
    } catch (err: any) {
      setError(err.message);
      setState(prev => ({ ...prev, stage: 'input' }));
    } finally {
      setLoading(false);
    }
  }, [generateTrip]);

  // AI planner tab — uses Gemini to parse natural language
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
      if (!intent.origin && !intent.destination) {
        throw new Error('Could not understand the request. Please use the Search tab instead.');
      }
      const tripId = `trip_${Date.now()}`;
      setState(prev => ({ ...prev, stage: 'generation', intent, tripId }));
      await generateTrip(intent, tripId);
    } catch (err: any) {
      setError(err.message);
      setState(prev => ({ ...prev, stage: 'input' }));
    } finally {
      setLoading(false);
    }
  }, [generateTrip]);

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

  return { state, loading, error, processInput, processStructuredSearch, confirmItinerary, bookTrip, setStage, reset };
}
