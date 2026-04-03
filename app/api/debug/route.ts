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
    body: JSON.stringify({ game: "Magic: The Gathering", last: 30 }),
  });

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  return NextResponse.json({
    status: res.status,
    keyPrefix: apiKey.slice(0, 8) + "...",
    responseType: Array.isArray(parsed) ? "array" : typeof parsed,
    count: Array.isArray(parsed) ? parsed.length : null,
    sample: Array.isArray(parsed) ? parsed[0] : parsed,
  });
}
