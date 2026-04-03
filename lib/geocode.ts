/**
 * Reverse geocode a lat/lng to a venue/place name using Nominatim.
 * Results are cached in-process to avoid redundant requests and respect
 * Nominatim's 1 req/s rate limit.
 */

const cache = new Map<string, string | null>();

// In-flight request deduplication
const inFlight = new Map<string, Promise<string | null>>();

async function nominatimLookup(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "cedh-meta-dashboard/1.0 (https://cedh-meta-dashboard.vercel.app)" },
      next: { revalidate: 86400 }, // cache for 24h at edge
    });

    if (!res.ok) return null;

    const data = await res.json();

    // Prefer a named POI (shop, leisure, amenity, building) over road/area
    const name: string | undefined =
      data.address?.shop ??
      data.address?.leisure ??
      data.address?.amenity ??
      data.address?.building ??
      data.address?.office ??
      (data.addresstype !== "road" && data.addresstype !== "county" ? data.name : undefined);

    return name ?? null;
  } catch {
    return null;
  }
}

/**
 * Look up a venue name from lat/lng. Returns null if not found.
 * Deduplicates concurrent requests for the same coordinates.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;

  if (cache.has(key)) return cache.get(key)!;

  // Deduplicate in-flight requests
  if (inFlight.has(key)) return inFlight.get(key)!;

  const promise = nominatimLookup(lat, lng).then((name) => {
    cache.set(key, name);
    inFlight.delete(key);
    return name;
  });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Batch reverse geocode with rate limiting (1 req/s per Nominatim ToS).
 * Processes in chunks with a delay between each.
 */
export async function batchReverseGeocode(
  items: { lat: number; lng: number }[]
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];

  for (let i = 0; i < items.length; i++) {
    const { lat, lng } = items[i];
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;

    if (cache.has(key)) {
      results.push(cache.get(key)!);
      continue;
    }

    const name = await reverseGeocode(lat, lng);
    results.push(name);

    // Respect Nominatim's 1 req/s rate limit (skip delay if cached)
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return results;
}
