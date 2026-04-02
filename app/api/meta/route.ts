import { NextRequest, NextResponse } from "next/server";
import { fetchAllTournaments } from "@/lib/edhtop16";
import { fetchTopDeckTournaments } from "@/lib/topdeck";
import { getRegion } from "@/lib/regions";
import type { CommanderStats, EdhtopEntry, MetaResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const timePeriod = searchParams.get("timePeriod") ?? "THREE_MONTHS";
  const region = searchParams.get("region") ?? "";
  const state = searchParams.get("state") ?? "";
  const city = searchParams.get("city") ?? "";
  const venue = searchParams.get("venue") ?? "";
  const minSize = parseInt(searchParams.get("minSize") ?? "0", 10);

  const [edhtopTournaments, topDeckMap] = await Promise.all([
    fetchAllTournaments(timePeriod, minSize),
    fetchTopDeckTournaments(timePeriod),
  ]);

  // Enrich edhtop16 tournaments with TopDeck location data
  const enriched = edhtopTournaments.map((t) => {
    const td = topDeckMap.get(t.TID);
    const rawState = td?.eventData?.state?.toUpperCase();
    return {
      ...t,
      city: td?.eventData?.city,
      state: rawState,
      venue: td?.eventData?.location,
      region: getRegion(rawState),
    };
  });

  // Apply location filters
  const filtered = enriched.filter((t) => {
    if (region && t.region !== region) return false;
    if (state && t.state !== state.toUpperCase()) return false;
    if (city && t.city?.toLowerCase() !== city.toLowerCase()) return false;
    if (venue && t.venue?.toLowerCase() !== venue.toLowerCase()) return false;
    return true;
  });

  // When location filters are active but no TopDeck data is available,
  // fall through with all tournaments (TopDeck key not configured)
  const source = region || state || city || venue ? filtered : enriched;

  // Aggregate commander stats
  const statsMap = new Map<
    string,
    {
      colorId: string;
      entries: number;
      topCuts: number;
      totalWins: number;
      totalLosses: number;
      totalDraws: number;
    }
  >();

  let totalEntries = 0;

  for (const t of source) {
    for (const entry of t.entries) {
      if (!entry.commander?.name) continue;

      const key = entry.commander.name;
      const existing = statsMap.get(key);
      const isTopCut = entry.standing <= (t.topCut ?? 16);
      const games = entry.wins + entry.losses + entry.draws;

      if (existing) {
        existing.entries += 1;
        if (isTopCut) existing.topCuts += 1;
        if (games > 0) {
          existing.totalWins += entry.wins;
          existing.totalLosses += entry.losses;
          existing.totalDraws += entry.draws;
        }
      } else {
        statsMap.set(key, {
          colorId: entry.commander.colorId,
          entries: 1,
          topCuts: isTopCut ? 1 : 0,
          totalWins: games > 0 ? entry.wins : 0,
          totalLosses: games > 0 ? entry.losses : 0,
          totalDraws: games > 0 ? entry.draws : 0,
        });
      }
      totalEntries++;
    }
  }

  const commanders: CommanderStats[] = Array.from(statsMap.entries())
    .map(([name, s]): CommanderStats => {
      const totalGames = s.totalWins + s.totalLosses + s.totalDraws;
      return {
        name,
        colorId: s.colorId,
        entries: s.entries,
        topCuts: s.topCuts,
        conversionRate: s.entries > 0 ? (s.topCuts / s.entries) * 100 : 0,
        winRate: totalGames > 0 ? (s.totalWins / totalGames) * 100 : 0,
        metaShare: totalEntries > 0 ? (s.entries / totalEntries) * 100 : 0,
      };
    })
    .sort((a, b) => b.entries - a.entries);

  const response: MetaResponse = {
    commanders,
    totalEntries,
    totalTournaments: source.length,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
