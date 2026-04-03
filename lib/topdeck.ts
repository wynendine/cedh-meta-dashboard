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

async function fetchFormat(
  apiKey: string,
  format: string,
  last: number
): Promise<TopDeckTournament[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s per request

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ game: "Magic: The Gathering", format, last, columns: ["eventData"] }),
      next: { revalidate: 3600 },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch {
    return [];
  }
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
  const map = new Map<string, TopDeckTournament>();

  // Run sequentially so a slow response on one format doesn't block all others
  // and we stay well under Vercel's function timeout
  const formats = ["EDH", "Commander", "cEDH", "cEDH / EDH"];
  for (const format of formats) {
    const tournaments = await fetchFormat(apiKey, format, last);
    for (const t of tournaments) {
      if (t.TID && !map.has(t.TID)) map.set(t.TID, t);
    }
  }

  console.log(`TopDeck: fetched ${map.size} unique tournaments`);
  return map;
}
