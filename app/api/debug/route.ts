import { NextResponse } from "next/server";
import { normalizeState, deriveCountry } from "@/lib/regions";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.TOPDECK_API_KEY;

  if (!apiKey || apiKey === "your_topdeck_api_key_here") {
    return NextResponse.json({ error: "TOPDECK_API_KEY not set" });
  }

  // Fetch all format variants to see total TID coverage
  const formats = ["EDH", "Commander", "cEDH", "cEDH / EDH"];
  const results = await Promise.all(
    formats.map(async (format) => {
      const r = await fetch("https://topdeck.gg/api/v2/tournaments", {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ game: "Magic: The Gathering", format, last: 90 }),
      });
      const data = await r.json();
      const arr = Array.isArray(data) ? data : [];
      const withLoc = arr.filter((t: Record<string, unknown>) => {
        const ed = t.eventData as Record<string, unknown> | undefined;
        return ed && (ed.city || ed.state);
      });
      return { format, total: arr.length, withLocation: withLoc.length, tids: arr.slice(0, 3).map((t: Record<string,unknown>) => t.TID) };
    })
  );

  // Also fetch a few edhtop16 TIDs to compare
  const edhtopRes = await fetch("https://edhtop16.com/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ tournaments(first: 5, sortBy: DATE, filters: { timePeriod: THREE_MONTHS }) { edges { node { TID name size } } } }" }),
  });
  const edhtopData = await edhtopRes.json();
  const edhtopTIDs = edhtopData?.data?.tournaments?.edges?.map((e: Record<string,unknown>) => (e.node as Record<string,unknown>)?.TID);

  return NextResponse.json({ formats: results, edhtopSampleTIDs: edhtopTIDs });
}
