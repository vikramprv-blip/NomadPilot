'use client';

import { useState, useCallback } from 'react';
import { AppState, AppStage, TripIntent, Itinerary, BookingResult } from '@/types';

const initialState: AppState = { stage: 'input' };

// Safe intent with all fields defaulted
function safeIntent(raw: any): TripIntent {
  return {
    origin:        raw?.origin        || raw?.from        || '',
    destination:   raw?.destination   || raw?.to          || '',
    departureDate: raw?.departureDate || raw?.date        || '',
    returnDate:    raw?.returnDate    || raw?.return       || null,
    travelers:     Number(raw?.travelers) || 1,
    tripType:      raw?.tripType      || 'return',
    nationality:   raw?.nationality   || null,
    preferences: {
      cabinClass: raw?.preferences?.cabinClass || 'economy',
      maxBudget:  raw?.preferences?.maxBudget  || null,
      services:   raw?.preferences?.services   || ['flight', 'hotel'],
    },
  };
}

export function useAppState() {
  const [state, setState]   = useState<AppState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const setStage = useCallback((stage: AppStage) => {
    setState(prev => ({ ...prev, stage }));
  }, []);

  // Stage 1 → 2: Parse user intent via AI Brain
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

      // API returns intent directly OR wrapped in data.intent
      const rawIntent = data.intent || data;
      const intent    = safeIntent(rawIntent);

      // If we couldn't parse origin/destination, show friendly error
      if (!intent.origin && !intent.destination) {
        throw new Error('Could not understand your travel request. Please try being more specific, e.g. "Fly from Dubai to London next Friday"');
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

  // Stage 2 → 3: Generate itineraries
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

      setState(prev => ({
        ...prev,
        stage: 'confirmation',
        itineraries: data.itineraries || [],
      }));
    } catch (err: any) {
      setError(err.message);
      setState(prev => ({ ...prev, stage: 'input' }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Stage 3 → 4
  const confirmItinerary = useCallback((itinerary: Itinerary) => {
    setState(prev => ({ ...prev, stage: 'booking', selectedItinerary: itinerary }));
  }, []);

  // Stage 4 → 5
  const bookTrip = useCallback(async (travelerInfo: object) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary:    state.selectedItinerary,
          travelerInfo,
          tripId:       state.tripId,
          userId:       state.userId,
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
