'use client';

import { useState, useCallback } from 'react';
import { AppState, AppStage, TripIntent, Itinerary } from '@/types';

const initialState: AppState = { stage: 'input' };

function safeIntent(raw: any): TripIntent {
  const legs = Array.isArray(raw?.legs) && raw.legs.length > 0 ? raw.legs : null;
  // Derive origin/destination from legs if not directly set
  const origin      = raw?.origin      || raw?.from || legs?.[0]?.from || '';
  const destination = raw?.destination || raw?.to   || legs?.[legs.length - 1]?.to || '';
  const depDate     = raw?.departureDate || raw?.date || legs?.[0]?.date || '';

  return {
    raw:              raw?.raw   || '',
    origin,
    destination,
    departureDate:    depDate,
    returnDate:       raw?.returnDate || raw?.return || null,
    travelers:        Number(raw?.travelers) || 1,
    budget:           raw?.budget    || undefined,
    currency:         raw?.currency  || 'USD',
    services:         raw?.services  || ['flight'],
    tripType:         raw?.tripType  || (legs && legs.length > 1 ? 'multicity' : 'oneway'),
    legs:             legs || (origin && destination ? [{ from: origin, to: destination, date: depDate, cabinClass: raw?.preferences?.cabinClass || 'economy' }] : []),
    hotelDestination: raw?.hotelDestination || null,
    nights:           raw?.nights           || null,
    nationality:      raw?.nationality      || raw?.constraints?.visaPassport || undefined,
    preferences: {
      cabinClass:  raw?.preferences?.cabinClass  || raw?.cabinClass  || 'economy',
      hotelStars:  raw?.preferences?.hotelStars  || raw?.hotelStars  || null,
    },
    constraints: {
      visaPassport: raw?.constraints?.visaPassport || raw?.nationality || undefined,
    },
  } as TripIntent & { nationality?: string };
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
      // For multi-city, last leg is the final destination
      const lastLeg = formData.legs?.[formData.legs.length - 1] || leg;
      const isMultiCity = formData.tripType === 'multicity' && formData.legs?.length > 1;

      const intent = safeIntent({
        origin:           leg.from        || '',
        destination:      lastLeg.to      || leg.to || '',
        departureDate:    leg.date        || leg.departure || '',
        returnDate:       leg.return      || formData.returnDate || '',
        travelers:        formData.travelers || 1,
        cabinClass:       formData.cabinClass || 'economy',
        nationality:      formData.nationality || '',
        currency:         formData.currency || 'USD',
        services:         formData.services || ['flight', 'hotel'],
        tripType:         formData.tripType || 'return',
        legs:             isMultiCity ? formData.legs : undefined,
        // Hotel-specific fields from form
        hotelDestination: formData.hotelCity || null,
        nights:           formData.hotelNights || null,
        preferences: {
          cabinClass:  formData.cabinClass || 'economy',
          hotelStars:  formData.hotelStars || null,
        },
        constraints: {
          visaPassport: formData.nationality || '',
        },
      });

      const hasLegs = isMultiCity && formData.legs?.some((l: any) => l.from && l.to);
      if (!hasLegs && (!intent.origin || !intent.destination)) {
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

      const hasLegs = Array.isArray((intent as any).legs) && (intent as any).legs.length > 0;
      if (!intent.origin && !intent.destination && !hasLegs) {
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
      setState(prev => ({ ...prev, stage: 'confirmation', itineraries: data.itineraries || [], cars: data.cars || [] }));
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
