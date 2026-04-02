import type { TopDeckTournament } from "./types";

const ENDPOINT = "https://topdeck.gg/api/v2/tournaments";

function timePeriodToDays(timePeriod: string): number {
  const map: Record<string, number> = {
    ONE_MONTH: 30,
    THREE_MONTHS: 90,
    SIX_MONTHS: 180,
    ONE_YEAR: 365,
    ALL_TIME: 365 * 10,
  };
  return map[timePeriod] ?? 90;
}

export async function fetchTopDeckTournaments(
  timePeriod: string
): Promise<Map<string, TopDeckTournament>> {
  const apiKey = process.env.TOPDECK_API_KEY;

  if (!apiKey || apiKey === "your_topdeck_api_key_here") {
    console.warn("TOPDECK_API_KEY not set — location data unavailable");
    return new Map();
  }

  const last = timePeriodToDays(timePeriod);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        game: "Magic: The Gathering",
        format: "EDH",
        last,
        columns: ["eventData", "players", "TID"],
      }),
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      console.error(`TopDeck API error: ${res.status}`);
      return new Map();
    }

    const data: TopDeckTournament[] = await res.json();
    const map = new Map<string, TopDeckTournament>();

    for (const t of data) {
      if (t.TID) map.set(t.TID, t);
    }

    return map;
  } catch (err) {
    console.error("TopDeck fetch failed:", err);
    return new Map();
  }
}
