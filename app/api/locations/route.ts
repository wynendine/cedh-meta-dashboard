import { NextRequest, NextResponse } from "next/server";
import { fetchTopDeckTournaments } from "@/lib/topdeck";
import { getRegion, deriveCountry, normalizeState, STATE_LABELS } from "@/lib/regions";
import { resolveVenueName } from "@/lib/venue";
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
  const venueMap = new Map<string, { venueName: string; address: string; city: string; state: string; country: string; lat?: number; lng?: number }>();

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
      const mapKey = `${country}|${rawState ?? ""}|${cityKey}|${address}`;
      if (!venueMap.has(mapKey)) {
        venueMap.set(mapKey, {
          venueName: address, // placeholder, resolved below
          address,
          city: cityKey,
          state: rawState ?? "",
          country,
          lat: ed.lat,
          lng: ed.lng,
        });
      }
    }
  }

  // Resolve venue names for entries that need geocoding (no name prefix in address).
  // Cap at 20 Nominatim lookups per request to stay within the 60s timeout.
  // Results are edge-cached for 24h so this only runs once per day per venue.
  let geocodeCount = 0;
  for (const entry of venueMap.values()) {
    const needsGeocode = /^\d/.test(entry.address.split(",")[0].trim());
    if (needsGeocode && geocodeCount < 20) {
      entry.venueName = await resolveVenueName(entry.address, entry.lat, entry.lng, entry.city);
      geocodeCount++;
    } else {
      entry.venueName = await resolveVenueName(entry.address, undefined, undefined, entry.city);
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
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
  });
}
