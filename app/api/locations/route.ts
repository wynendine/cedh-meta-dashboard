import { NextRequest, NextResponse } from "next/server";
import { fetchTopDeckTournaments } from "@/lib/topdeck";
import { getRegion, deriveCountry, normalizeState, STATE_LABELS } from "@/lib/regions";
import type { LocationsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const timePeriod = searchParams.get("timePeriod") ?? "THREE_MONTHS";

  const topDeckMap = await fetchTopDeckTournaments(timePeriod);

  const countrySet = new Set<string>();
  const stateMap = new Map<string, { region?: string; country: string }>();
  const cityMap = new Map<string, { label: string; state: string; country: string }>();

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
      // Normalize key to lowercase to deduplicate case variants (e.g. "Jacksonville" vs "jacksonville")
      const cityNorm = `${country}|${rawState ?? ""}|${cityKey.toLowerCase()}`;
      if (!cityMap.has(cityNorm)) {
        cityMap.set(cityNorm, { label: cityKey, state: rawState ?? "", country });
      }
    }
  }

  const countries = Array.from(countrySet).sort((a, b) => {
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

  const cities = Array.from(cityMap.values())
    .map(({ label, state, country }) => ({ value: label, label, state, country }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const regions = [...new Set(
    states.filter(s => s.country === "United States").map(s => s.region)
  )].filter(Boolean).sort();

  const response: LocationsResponse = { countries, regions, states, cities };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
