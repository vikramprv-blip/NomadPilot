// lib/airportSearch.ts
import Fuse from "fuse.js";

export type Airport = { name: string; city: string; country: string; iata: string };

export function makeAirportSearch(airports: Airport[]) {
  const fuse = new Fuse(airports, {
    keys: [
      { name: "iata",  weight: 0.6 },
      { name: "city",  weight: 0.25 },
      { name: "name",  weight: 0.15 },
    ],
    threshold: 0.3,
  });
  return (q: string) => fuse.search(q).map(r => r.item);
}
