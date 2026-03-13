// lib/airports.ts
export type AirportCode = string;

const canonical: Record<string, AirportCode> = {
  zurich: "ZRH",
  geneva: "GVA",
  vienna: "VIE",
  lisbon: "LIS",
  porto: "OPO",
  brussels: "BRU",
  prague: "PRG",
  warsaw: "WAW",
  krakow: "KRK",
  // add more once, here
};

const aliasPairs: Array<[string, AirportCode]> = [
  ["zrh", "ZRH"],
  ["gva", "GVA"],
  ["vie", "VIE"],
  ["lis", "LIS"],
  ["opo", "OPO"],
  ["bru", "BRU"],
  ["prg", "PRG"],
  ["waw", "WAW"],
  ["krk", "KRK"],
];

export const airportIndex: Record<string, AirportCode> = (() => {
  const m: Record<string, AirportCode> = {};
  for (const [name, code] of Object.entries(canonical)) m[name.toLowerCase()] = code;
  for (const [alias, code] of aliasPairs) m[alias.toLowerCase()] = code;
  return m;
})();

export function getIata(input: string): AirportCode | null {
  const key = input.trim().toLowerCase();
  return airportIndex[key] ?? null;
}
