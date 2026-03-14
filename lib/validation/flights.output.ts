import { z } from "zod";
import { IATACodeSchema, CabinClassSchema } from "./flights.input";

export const PriceSchema = z.object({
  currency: z.string(),
  total: z.number(),
  base: z.number().optional(),
});

export const SegmentSchema = z.object({
  from: IATACodeSchema,
  to: IATACodeSchema,
  departTime: z.string(), 
  arriveTime: z.string(),
  carrier: z.string(),
  flightNumber: z.string(),
  aircraft: z.string().optional(),
  durationMinutes: z.number(),
});

export const ItinerarySchema = z.object({
  segments: z.array(SegmentSchema),
  totalDurationMinutes: z.number(),
});

export const FlightOfferSchema = z.object({
  id: z.string(),
  source: z.enum(["amadeus", "skyscanner", "kiwi"]),
  cabin: CabinClassSchema,
  price: PriceSchema,
  itineraries: z.array(ItinerarySchema),
});

export const FlightSearchResultSchema = z.object({
  query: z.object({
    origin: IATACodeSchema,
    destination: IATACodeSchema,
    departDate: z.string(),
    returnDate: z.string().optional(),
    adults: z.number(),
    cabin: CabinClassSchema,
  }),
  offers: z.array(FlightOfferSchema),
});

export type FlightSearchResult = z.infer<typeof FlightSearchResultSchema>;
