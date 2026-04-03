import { NextRequest, NextResponse } from "next/server";
import { fetchAllTournamentIds, fetchTournamentEntries } from "@/lib/edhtop16";
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
  const minSize = parseInt(searchParams.get("minSize") ?? "0", 10);

  const hasLocationFilter = country || region || state || city;

  // Fetch tournament shells (always needed). Fetch TopDeck location map in
  // parallel only when a location filter is active.
  const [shells, topDeckMap] = await Promise.all([
    fetchAllTournamentIds(timePeriod, minSize),
    hasLocationFilter ? fetchTopDeckTournaments(timePeriod) : Promise.resolve(new Map()),
  ]);

  // Filter shells by location when applicable
  const filteredShells = hasLocationFilter
    ? shells.filter((s) => {
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
      })
    : shells;

  // Fetch full entries for all matched tournaments
  const tournaments = await fetchTournamentEntries(filteredShells);

  // Aggregate commander stats
  const statsMap = new Map<string, {
    colorId: string; entries: number; topCuts: number; tournamentWins: number;
    totalWins: number; totalLosses: number; totalDraws: number;
  }>();
  let totalEntries = 0;

  for (const t of tournaments) {
    for (const entry of t.entries) {
      if (!entry.commander?.name) continue;
      const key = entry.commander.name;
      const isTopCut = entry.standing <= (t.topCut ?? 16);
      const isTournamentWin = entry.standing === 1;
      const games = entry.wins + entry.losses + entry.draws;
      const existing = statsMap.get(key);

      if (existing) {
        existing.entries++;
        if (isTopCut) existing.topCuts++;
        if (isTournamentWin) existing.tournamentWins++;
        if (games > 0) { existing.totalWins += entry.wins; existing.totalLosses += entry.losses; existing.totalDraws += entry.draws; }
      } else {
        statsMap.set(key, { colorId: entry.commander.colorId, entries: 1, topCuts: isTopCut ? 1 : 0, tournamentWins: isTournamentWin ? 1 : 0, totalWins: games > 0 ? entry.wins : 0, totalLosses: games > 0 ? entry.losses : 0, totalDraws: games > 0 ? entry.draws : 0 });
      }
      totalEntries++;
    }
  }

  const commanders: CommanderStats[] = Array.from(statsMap.entries())
    .map(([name, s]): CommanderStats => {
      const totalGames = s.totalWins + s.totalLosses + s.totalDraws;
      return {
        name, colorId: s.colorId, entries: s.entries, topCuts: s.topCuts,
        tournamentWins: s.tournamentWins,
        conversionRate: s.entries > 0 ? (s.topCuts / s.entries) * 100 : 0,
        winRate: totalGames > 0 ? (s.totalWins / totalGames) * 100 : null,
        drawRate: totalGames > 0 ? (s.totalDraws / totalGames) * 100 : null,
        metaShare: totalEntries > 0 ? (s.entries / totalEntries) * 100 : 0,
      };
    })
    .sort((a, b) => b.entries - a.entries);

  return NextResponse.json(
    { commanders, totalEntries, totalTournaments: tournaments.length } satisfies MetaResponse,
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
  );
}
