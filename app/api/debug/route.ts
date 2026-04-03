import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.TOPDECK_API_KEY;

  if (!apiKey || apiKey === "your_topdeck_api_key_here") {
    return NextResponse.json({ error: "TOPDECK_API_KEY not set" });
  }

  const res = await fetch("https://topdeck.gg/api/v2/tournaments", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ game: "Magic: The Gathering", format: "EDH", last: 30, columns: ["eventData"] }),
  });

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  // Collect all unique eventData shapes that have non-empty data
  const samples = Array.isArray(parsed)
    ? parsed
        .filter((t: Record<string, unknown>) => {
          const ed = t.eventData as Record<string, unknown> | undefined;
          return ed && Object.keys(ed).length > 0;
        })
        .slice(0, 10)
        .map((t: Record<string, unknown>) => ({
          TID: t.TID,
          tournamentName: t.tournamentName,
          eventData: t.eventData,
        }))
    : [];

  return NextResponse.json({
    status: res.status,
    keyPrefix: apiKey.slice(0, 8) + "...",
    count: Array.isArray(parsed) ? parsed.length : null,
    withLocationCount: samples.length,
    samples,
  });
}
