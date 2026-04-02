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

async function fetchPage(
  apiKey: string,
  body: Record<string, unknown>
): Promise<TopDeckTournament[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    console.error(`TopDeck API error: ${res.status} ${await res.text()}`);
    return [];
  }

  const data = await res.json();
  // TopDeck may return { data: [...] } or a plain array
  return Array.isArray(data) ? data : (data?.data ?? []);
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

  // Fetch without format filter to match all cEDH tournaments regardless of
  // how they're tagged on TopDeck (some may be "Commander", "EDH", "cEDH", etc.)
  const formatVariants = [
    { game: "Magic: The Gathering", format: "EDH", last },
    { game: "Magic: The Gathering", format: "Commander", last },
    { game: "Magic: The Gathering", format: "cEDH", last },
  ];

  const results = await Promise.all(
    formatVariants.map((body) => fetchPage(apiKey, body))
  );

  for (const tournaments of results) {
    for (const t of tournaments) {
      if (t.TID && !map.has(t.TID)) {
        map.set(t.TID, t);
      }
    }
  }

  console.log(`TopDeck: fetched ${map.size} unique tournaments`);
  return map;
}
