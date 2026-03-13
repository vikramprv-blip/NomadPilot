import { z } from "zod";

export const IATACodeSchema = z
  .string()
  .trim()
  .length(3, "IATA code must be exactly 3 letters")
  .transform((v) => v.toUpperCase());

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const CabinClassSchema = z.enum([
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
]);

export const PassengerCountSchema = z
  .number()
  .int()
  .min(1)
  .max(9);

export const FlightSearchInputSchema = z.object({
  origin: IATACodeSchema,
  destination: IATACodeSchema,
  departDate: DateStringSchema,
  returnDate: DateStringSchema.optional(),
  adults: PassengerCountSchema.default(1),
  cabin: CabinClassSchema.default("ECONOMY"),
});

export type FlightSearchInput = z.infer<typeof FlightSearchInputSchema>;
