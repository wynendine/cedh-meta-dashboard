import { reverseGeocode } from "./geocode";

/**
 * Extract a human-readable venue name from a TopDeck location string.
 * If the address has a name prefix before the street number, use that.
 * Otherwise fall back to Nominatim reverse geocoding via lat/lng.
 */

function extractNamePrefix(location: string): string | null {
  const firstSegment = location.split(",")[0].trim();
  // If the first segment starts with a digit it's a street number — no name prefix
  if (/^\d/.test(firstSegment)) return null;
  return firstSegment;
}

export async function resolveVenueName(
  location?: string,
  lat?: number,
  lng?: number,
  city?: string
): Promise<string> {
  // 1. Try extracting a name prefix from the address string
  if (location) {
    const prefix = extractNamePrefix(location);
    if (prefix) return prefix;
  }

  // 2. Try reverse geocoding with lat/lng
  if (lat !== undefined && lng !== undefined) {
    const geocoded = await reverseGeocode(lat, lng);
    if (geocoded) return geocoded;
  }

  // 3. Fall back to city name or raw address
  return city ?? location ?? "Unknown";
}

// Sync version for cases where we can't await (kept for backwards compat)
export function extractVenueName(location?: string, city?: string): string {
  if (!location) return city ?? "Unknown";
  const prefix = extractNamePrefix(location);
  return prefix ?? city ?? location;
}
