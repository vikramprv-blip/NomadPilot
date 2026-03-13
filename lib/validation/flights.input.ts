// lib/validation/flights.input.ts
import { z } from "zod";

// ===========================
// Primitive Validators
// ===========================

// IATA Airport code (uppercase 3‑letter)
export const IATACodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(3, "IATA codes are 3 letters");

// YYYY‑MM‑DD
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY‑MM‑DD");

// Cabin class enum (Amadeus, Kiwi, Skyscanner compliant)
export const CabinClassSchema = z.enum([
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
]);

// Passenger count (1–9 allowed by most APIs)
export const PassengerCountSchema = z
  .number()
  .int()
  .min(1)
  .max(9);

// Sort options
export const SortSchema = z.enum([
  "price_asc",
  "price_desc",
  "duration_asc",
  "duration_desc",
  "departure_asc",
  "arrival_asc",
]).optional();

// ===========================
// Root search schema
// ===========================

export const FlightSearchInputSchema = z.object({
  origin: IATACodeSchema,
  destination: IATACodeSchema,
  departDate: DateStringSchema,
  returnDate: DateStringSchema.optional(),
  adults: PassengerCountSchema.default(1),
  cabin: CabinClassSchema.default("ECONOMY"),
  sort: SortSchema,
});

export type FlightSearchInput = z.infer<typeof FlightSearchInputSchema>;
