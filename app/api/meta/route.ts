import { NextRequest, NextResponse } from "next/server";
import { fetchGlobalMeta, fetchAllTournamentIds, fetchTournamentEntries } from "@/lib/edhtop16";
import { fetchTopDeckTournaments } from "@/lib/topdeck";
import { getRegion, deriveCountry, normalizeState } from "@/lib/regions";
import type { CommanderStats, MetaResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const timePeriod = searchParams.get("timePeriod") ?? "THREE_MONTHS";
  const country = searchParams.get("country") ?? "";
  const region = searchParams.get("region") ?? "";
  const state = searchParams.get("state") ?? "";
  const city = searchParams.get("city") ?? "";
  const minSize = parseInt(searchParams.get("minSize") ?? "60", 10);

  const hasLocationFilter = country || region || state || city;

  // ── Fast path: no location filter ──────────────────────────────────────────
  // edhtop16 already aggregates commander stats server-side.
  if (!hasLocationFilter) {
    const commanders = await fetchGlobalMeta(timePeriod, minSize);
    const totalEntries = commanders.reduce((s, c) => s + c.entries, 0);

    return NextResponse.json(
      { commanders, totalEntries, totalTournaments: null } satisfies MetaResponse,
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
    );
  }

  // ── Slow path: location filter ─────────────────────────────────────────────
  // 1. Fetch all tournament IDs (lightweight — no entries).
  // 2. Fetch TopDeck location map in parallel.
  // 3. Filter tournament IDs by location.
  // 4. Fetch entries only for matched tournaments.
  const [shells, topDeckMap] = await Promise.all([
    fetchAllTournamentIds(timePeriod, minSize),
    fetchTopDeckTournaments(timePeriod),
  ]);

  // Filter shells by location using TopDeck data
  const filteredShells = shells.filter((s) => {
    const td = topDeckMap.get(s.TID);
    if (!td?.eventData) return false;

    const rawState = normalizeState(td.eventData.state);
    const tCountry = deriveCountry(td.eventData.country, rawState, td.eventData.location);
    const tRegion = getRegion(rawState);
    const tCity = td.eventData.city;

    if (country && tCountry !== country) return false;
    if (region && tRegion !== region) return false;
    if (state && rawState !== state.toUpperCase()) return false;
    if (city && tCity?.toLowerCase() !== city.toLowerCase()) return false;
    return true;
  });

  // Fetch full entries only for matched tournaments
  const tournaments = await fetchTournamentEntries(filteredShells);

  // Aggregate commander stats
  const statsMap = new Map<string, {
    colorId: string; entries: number; topCuts: number;
    totalWins: number; totalLosses: number; totalDraws: number;
  }>();
  let totalEntries = 0;

  for (const t of tournaments) {
    for (const entry of t.entries) {
      if (!entry.commander?.name) continue;
      const key = entry.commander.name;
      const isTopCut = entry.standing <= (t.topCut ?? 16);
      const games = entry.wins + entry.losses + entry.draws;
      const existing = statsMap.get(key);

      if (existing) {
        existing.entries++;
        if (isTopCut) existing.topCuts++;
        if (games > 0) { existing.totalWins += entry.wins; existing.totalLosses += entry.losses; existing.totalDraws += entry.draws; }
      } else {
        statsMap.set(key, { colorId: entry.commander.colorId, entries: 1, topCuts: isTopCut ? 1 : 0, totalWins: games > 0 ? entry.wins : 0, totalLosses: games > 0 ? entry.losses : 0, totalDraws: games > 0 ? entry.draws : 0 });
      }
      totalEntries++;
    }
  }

  const commanders: CommanderStats[] = Array.from(statsMap.entries())
    .map(([name, s]): CommanderStats => {
      const totalGames = s.totalWins + s.totalLosses + s.totalDraws;
      return {
        name, colorId: s.colorId, entries: s.entries, topCuts: s.topCuts,
        conversionRate: s.entries > 0 ? (s.topCuts / s.entries) * 100 : 0,
        winRate: totalGames > 0 ? (s.totalWins / totalGames) * 100 : 0,
        metaShare: totalEntries > 0 ? (s.entries / totalEntries) * 100 : 0,
      };
    })
    .sort((a, b) => b.entries - a.entries);

  const response: MetaResponse = { commanders, totalEntries, totalTournaments: tournaments.length };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
