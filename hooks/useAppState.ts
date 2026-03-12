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
    budget:        raw?.budget        || undefined,
    services:      raw?.services      || ['flight', 'hotel'],
    preferences: {
      cabinClass: raw?.preferences?.cabinClass || raw?.cabinClass || 'economy',
    },
    constraints: {
      visaPassport: raw?.constraints?.visaPassport || raw?.nationality || undefined,
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

  // Called from structured search form — skip AI, build intent directly
  const processStructuredSearch = useCallback(async (formData: any) => {
    setLoading(true);
    setError(null);
    setState(prev => ({ ...prev, stage: 'processing' }));

    try {
      const leg = formData.legs?.[0] || {};
      const intent = safeIntent({
        origin:        leg.from        || '',
        destination:   leg.to          || '',
        departureDate: leg.date        || leg.departure || '',
        returnDate:    leg.return      || formData.returnDate || '',
        travelers:     formData.travelers || 1,
        cabinClass:    formData.cabinClass || 'economy',
        nationality:   formData.nationality || '',
        services:      formData.services || ['flight', 'hotel'],
        preferences: {
          cabinClass: formData.cabinClass || 'economy',
        },
        constraints: {
          visaPassport: formData.nationality || '',
        },
      });

      if (!intent.origin || !intent.destination) {
        throw new Error('Please enter both origin and destination cities.');
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
  }, []);

  // Called from AI planner tab — use Gemini to parse natural language
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

      // Handle rate limit
      if (res.status === 429) {
        throw new Error(data.error || 'Too many requests, please wait a moment.');
      }

      const rawIntent = data.intent || data;
      const intent    = safeIntent(rawIntent);

      if (!intent.origin && !intent.destination) {
        throw new Error('Could not understand your travel request. Try the Search tab to enter details manually, or be more specific: "Fly from Dubai to London on 25 March, 2 people, business class"');
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

  return { state, loading, error, processInput, processStructuredSearch, confirmItinerary, bookTrip, setStage, reset };
}
