import { NextRequest, NextResponse } from "next/server";
import { fetchTopDeckTournaments } from "@/lib/topdeck";
import { getRegion, deriveCountry, normalizeState, STATE_LABELS } from "@/lib/regions";
import { extractVenueName } from "@/lib/venue";
import type { LocationsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const timePeriod = searchParams.get("timePeriod") ?? "THREE_MONTHS";

  const topDeckMap = await fetchTopDeckTournaments(timePeriod);

  const countrySet = new Set<string>();
  const stateMap = new Map<string, { region?: string; country: string }>();
  const cityMap = new Map<string, { state: string; country: string }>();
  const venueMap = new Map<string, { venueName: string; address: string; city: string; state: string; country: string }>();

  for (const t of topDeckMap.values()) {
    const ed = t.eventData;
    if (!ed) continue;

    const rawState = normalizeState(ed.state);
    const country = deriveCountry(ed.country, rawState, ed.location);
    countrySet.add(country);

    if (rawState) {
      stateMap.set(rawState, { region: getRegion(rawState), country });
    }

    const cityKey = ed.city?.trim();
    if (cityKey) {
      cityMap.set(`${country}|${rawState ?? ""}|${cityKey}`, {
        state: rawState ?? "",
        country,
      });
    }

    const address = ed.location?.trim();
    if (address && cityKey) {
      const venueName = extractVenueName(address, cityKey);
      venueMap.set(`${country}|${rawState ?? ""}|${cityKey}|${address}`, {
        venueName,
        address,
        city: cityKey,
        state: rawState ?? "",
        country,
      });
    }
  }

  const countries = Array.from(countrySet).sort((a, b) => {
    // United States first, then alphabetical
    if (a === "United States") return -1;
    if (b === "United States") return 1;
    return a.localeCompare(b);
  });

  const states = Array.from(stateMap.entries())
    .map(([code, { region, country }]) => ({
      value: code,
      label: STATE_LABELS[code] ?? code,
      region: region ?? "",
      country,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const cities = Array.from(cityMap.entries())
    .map(([key, { state, country }]) => {
      const city = key.split("|")[2];
      return { value: city, label: city, state, country };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const venues = Array.from(venueMap.entries())
    .map(([key, { venueName, address, city, state, country }]) => {
      const rawAddress = key.split("|")[3];
      return { value: rawAddress, label: venueName, address, city, state, country };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const regions = [...new Set(states.filter(s => s.country === "United States").map((s) => s.region))].filter(Boolean).sort();

  const response: LocationsResponse = { countries, regions, states, cities, venues };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
