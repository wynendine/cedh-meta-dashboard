import { NextResponse } from "next/server";
import { normalizeState, deriveCountry } from "@/lib/regions";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.TOPDECK_API_KEY;

  if (!apiKey || apiKey === "your_topdeck_api_key_here") {
    return NextResponse.json({ error: "TOPDECK_API_KEY not set" });
  }

  const res = await fetch("https://topdeck.gg/api/v2/tournaments", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ game: "Magic: The Gathering", format: "EDH", last: 90 }),
  });

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  // Test our normalizeState + deriveCountry logic on the real data
  const withLocation = Array.isArray(parsed)
    ? parsed.filter((t: Record<string, unknown>) => {
        const ed = t.eventData as Record<string, unknown> | undefined;
        return ed && Object.keys(ed).length > 0;
      })
    : [];

  const normalized = withLocation.slice(0, 10).map((t: Record<string, unknown>) => {
    const ed = t.eventData as Record<string, string> | undefined;
    const state = normalizeState(ed?.state);
    const country = deriveCountry(ed?.country, state);
    return { TID: t.TID, rawState: ed?.state, normalizedState: state, country };
  });

  return NextResponse.json({
    status: res.status,
    keyPrefix: apiKey.slice(0, 8) + "...",
    total: Array.isArray(parsed) ? parsed.length : null,
    withLocationCount: withLocation.length,
    normalized,
  });
}
