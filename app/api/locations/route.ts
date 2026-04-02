import { NextRequest, NextResponse } from "next/server";
import { fetchTopDeckTournaments } from "@/lib/topdeck";
import { getRegion, STATE_LABELS } from "@/lib/regions";
import type { LocationsResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const timePeriod = searchParams.get("timePeriod") ?? "THREE_MONTHS";

  const topDeckMap = await fetchTopDeckTournaments(timePeriod);

  const stateSet = new Set<string>();
  const cityMap = new Map<string, string>(); // city → state
  const venueMap = new Map<string, { city: string; state: string }>();

  for (const t of topDeckMap.values()) {
    const ed = t.eventData;
    if (!ed) continue;

    const rawState = ed.state?.toUpperCase();
    if (rawState) stateSet.add(rawState);

    const cityKey = ed.city?.trim();
    if (cityKey && rawState) cityMap.set(cityKey, rawState);

    const venueKey = ed.location?.trim();
    if (venueKey && cityKey && rawState) {
      venueMap.set(venueKey, { city: cityKey, state: rawState });
    }
  }

  const states = Array.from(stateSet)
    .map((s) => ({ value: s, label: STATE_LABELS[s] ?? s, region: getRegion(s) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const cities = Array.from(cityMap.entries())
    .map(([city, state]) => ({ value: city, label: city, state }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const venues = Array.from(venueMap.entries())
    .map(([venue, loc]) => ({ value: venue, label: venue, ...loc }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const regions = [...new Set(states.map((s) => s.region))].sort();

  const response: LocationsResponse = { regions, states, cities, venues };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
