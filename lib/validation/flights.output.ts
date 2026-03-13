// lib/validation/flights.output.ts
import { z } from "zod";
import { IATACodeSchema, CabinClassSchema } from "./flights.input";

// ===========================
// Price Info
// ===========================
export const PriceSchema = z.object({
  currency: z.string().min(1),
  total: z.number(),
  base: z.number().optional(),
});

// ===========================
// Segment (one hop)
// ===========================
export const SegmentSchema = z.object({
  from: IATACodeSchema,
  to: IATACodeSchema,
  departTime: z.string(), // ISO datetime
  arriveTime: z.string(),
  carrier: z.string().min(2),
  flightNumber: z.string().min(1),
  aircraft: z.string().optional(),
  durationMinutes: z.number(),
});

// ===========================
// Itinerary (one‑way or return)
// ===========================
export const ItinerarySchema = z.object({
  segments: z.array(SegmentSchema).min(1),
  totalDurationMinutes: z.number(),
});

// ===========================
// Offer (single flight option)
// ===========================
export const FlightOfferSchema = z.object({
  id: z.string(),
  source: z.enum(["amadeus", "skyscanner", "kiwi"]),
  price: PriceSchema,
  cabin: CabinClassSchema,
  itineraries: z.array(ItinerarySchema).min(1),
  refundable: z.boolean().optional(),
  baggage: z
    .object({
      included: z.number().optional(),
      carryOn: z.number().optional(),
    })
    .optional(),
});

// ===========================
// Root result schema
// ===========================
export const FlightSearchResultSchema = z.object({
  query: z.object({
    origin: IATACodeSchema,
    destination: IATACodeSchema,
    departDate: z.string(),
    returnDate: z.string().optional(),
    cabin: CabinClassSchema,
    adults: z.number(),
  }),
  offers: z.array(FlightOfferSchema),
  meta: z
    .object({
      provider: z.string(),
      timestamp: z.string(),
    })
    .optional(),
});

export type FlightOffer = z.infer<typeof FlightOfferSchema>;
export type FlightSearchResult = z.infer<typeof FlightSearchResultSchema>;
