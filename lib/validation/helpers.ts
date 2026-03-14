import { FlightSearchInputSchema } from "./flights.input";
import { FlightSearchResultSchema } from "./flights.output";

export function validateSearchParams(raw: any) {
  const parsed = FlightSearchInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(JSON.stringify(parsed.error.format(), null, 2));
  }
  return parsed.data;
}

export function validateProviderResult(raw: any) {
  const parsed = FlightSearchResultSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Provider returned malformed data:", parsed.error.format());
    throw new Error("Flight provider returned invalid data");
  }
  return parsed.data;
}
