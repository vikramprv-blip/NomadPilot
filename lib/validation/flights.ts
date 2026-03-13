// lib/validation/flights.ts
import { z } from "zod";

export const searchSchema = z.object({
  origin: z.string().length(3).toUpperCase(),
  destination: z.string().length(3).toUpperCase(),
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  cabin: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
});

export type SearchInput = z.infer<typeof searchSchema>;
