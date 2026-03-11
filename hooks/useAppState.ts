'use client';

import { useState, useCallback } from 'react';
import { AppState, AppStage, TripIntent, Itinerary, BookingResult } from '@/types';

const initialState: AppState = { stage: 'input' };

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStage = useCallback((stage: AppStage) => {
    setState(prev => ({ ...prev, stage }));
  }, []);

  // Stage 1 → 2: Parse user intent via AI Brain
  const processInput = useCallback(async (userInput: string) => {
    setLoading(true);
    setError(null);
    setState(prev => ({ ...prev, stage: 'processing' }));

    try {
      const res = await fetch('/api/ai-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput, userId: state.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setState(prev => ({
        ...prev,
        stage: 'generation',
        intent: data.intent,
        tripId: data.tripId,
      }));

      // Auto-trigger generation
      await generateTrip(data.intent, data.tripId);
    } catch (err: any) {
      setError(err.message);
      setState(prev => ({ ...prev, stage: 'input' }));
    } finally {
      setLoading(false);
    }
  }, [state.userId]);

  // Stage 2 → 3: Generate itineraries
  const generateTrip = useCallback(async (intent: TripIntent, tripId?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/trip-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setState(prev => ({
        ...prev,
        stage: 'confirmation',
        itineraries: data.itineraries,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Stage 3 → 4: User selects + confirms itinerary
  const confirmItinerary = useCallback((itinerary: Itinerary) => {
    setState(prev => ({
      ...prev,
      stage: 'booking',
      selectedItinerary: itinerary,
    }));
  }, []);

  // Stage 4 → 5: Book everything
  const bookTrip = useCallback(async (travelerInfo: object) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary: state.selectedItinerary,
          travelerInfo,
          tripId: state.tripId,
          userId: state.userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setState(prev => ({
        ...prev,
        stage: 'ops',
        booking: data.booking,
      }));
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
