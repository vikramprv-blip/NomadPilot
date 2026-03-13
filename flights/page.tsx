// app/flights/page.tsx
"use client";

import { useState } from "react";

export default function FlightsPage() {
  const [origin, setOrigin] = useState("ZRH");
  const [destination, setDestination] = useState("GVA");
  const [departDate, setDepartDate] = useState("2026-04-15");
  const [results, setResults] = useState<any>(null);

  async function search() {
    const qs = new URLSearchParams({ origin, destination, departDate, adults: "1", cabin: "ECONOMY" });
    const r = await fetch(`/api/flights/search?${qs}`);
    setResults(await r.json());
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Search Flights</h1>
      <div className="grid gap-2 my-4">
        <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Origin IATA (e.g., ZRH)" />
        <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Destination IATA (e.g., GVA)" />
        <input type="date" value={departDate} onChange={e => setDepartDate(e.target.value)} />
        <button onClick={search}>Search</button>
      </div>
      <pre className="text-xs overflow-auto">{results ? JSON.stringify(results, null, 2) : "No results yet"}</pre>
    </main>
  );
}
