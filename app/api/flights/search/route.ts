import { NextRequest, NextResponse } from "next/server";
import { searchSchema } from "@/lib/validation/flights";

// If you choose Amadeus for MVP:
async function getAmadeusToken() {
  // In production: cache token until expiry.
  const resp = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID!,
      client_secret: process.env.AMADEUS_CLIENT_SECRET!,
    }),
    cache: "no-store",
  });
  return resp.json() as Promise<{ access_token: string }>;
}

export async function GET(req: NextRequest) {
  const parsed = searchSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { origin, destination, departDate, returnDate, adults, cabin } = parsed.data;

  const { access_token } = await getAmadeusToken();

  const qs = new URLSearchParams({
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate: departDate,
    ...(returnDate ? { returnDate } : {}),
    adults: String(adults),
    travelClass: cabin,
    max: "10",
  });

  const r = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${qs}`, {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });

  const data = await r.json();
  return NextResponse.json(data);
}
