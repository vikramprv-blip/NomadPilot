// lib/validation/helpers.ts
import {
  FlightSearchInputSchema,
  FlightSearchInput,
} from "./flights.input";
import {
  FlightSearchResultSchema,
  FlightSearchResult,
} from "./flights.output";

export function validateSearchParams(raw: any): FlightSearchInput {
  const result = FlightSearchInputSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(JSON.stringify(result.error.flatten()));
  }
  return result.data;
}

export function validateProviderResult(
  raw: any
): FlightSearchResult {
  const result = FlightSearchResultSchema.safeParse(raw);
  if (!result.success) {
    console.error("Provider data failed validation:", result.error);
    throw new Error("Provider returned malformed data");
  }
  return result.data;
}
``
