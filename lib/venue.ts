/**
 * Extract a human-readable venue name from a TopDeck location string.
 *
 * TopDeck stores location as a raw address, but some organizers prepend the
 * store name before the street number:
 *   "Simplicity Esports, 465 Cedar Sage Dr, Garland, TX 75040"  → "Simplicity Esports"
 *   "Phu Top Cards, PTC, Fredericksburg Road, Balcones Heights" → "Phu Top Cards"
 *   "4051 W Outer Rd, Arnold, MO 63010, USA"                   → "Arnold" (city fallback)
 *
 * The heuristic: if the first comma-segment does NOT start with a digit,
 * it's a venue name. Otherwise fall back to city, then the full address.
 */
export function extractVenueName(location?: string, city?: string): string {
  if (!location) return city ?? "Unknown";

  const firstSegment = location.split(",")[0].trim();

  // Starts with a digit → it's a street number, no venue name prefix
  if (/^\d/.test(firstSegment)) return city ?? location;

  return firstSegment;
}
