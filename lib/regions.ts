export const STATE_TO_REGION: Record<string, string> = {
  // Northeast
  CT: "Northeast", ME: "Northeast", MA: "Northeast", NH: "Northeast",
  NJ: "Northeast", NY: "Northeast", PA: "Northeast", RI: "Northeast", VT: "Northeast",
  // Midwest
  IL: "Midwest", IN: "Midwest", IA: "Midwest", KS: "Midwest", MI: "Midwest",
  MN: "Midwest", MO: "Midwest", NE: "Midwest", ND: "Midwest", OH: "Midwest",
  SD: "Midwest", WI: "Midwest",
  // South
  AL: "South", AR: "South", DC: "South", DE: "South", FL: "South", GA: "South",
  KY: "South", LA: "South", MD: "South", MS: "South", NC: "South", OK: "South",
  SC: "South", TN: "South", TX: "South", VA: "South", WV: "South",
  // West
  AK: "West", AZ: "West", CA: "West", CO: "West", HI: "West", ID: "West",
  MT: "West", NV: "West", NM: "West", OR: "West", UT: "West", WA: "West", WY: "West",
};

export const STATE_LABELS: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington D.C.", FL: "Florida",
  GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana",
  IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const REGIONS = ["Northeast", "Midwest", "South", "West"] as const;

export const US_STATE_CODES = new Set(Object.keys(STATE_TO_REGION));

// Reverse lookup: full state name (uppercase) → 2-letter code
// Handles TopDeck returning "Ohio" instead of "OH"
const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_LABELS).map(([code, name]) => [name.toUpperCase(), code])
);

/**
 * Normalize a state value from TopDeck to a 2-letter uppercase code.
 * Handles "OH", "oh", "Ohio", "OHIO" → "OH"
 */
export function normalizeState(raw?: string): string | undefined {
  if (!raw) return undefined;
  const upper = raw.trim().toUpperCase();
  // Already a 2-letter code
  if (US_STATE_CODES.has(upper)) return upper;
  // Full name like "Ohio" → "OH"
  return STATE_NAME_TO_CODE[upper];
}

export function getRegion(state?: string): string | undefined {
  if (!state) return undefined;
  return STATE_TO_REGION[state.toUpperCase()];
}

/**
 * Derive a country label from TopDeck eventData.
 * TopDeck may return a country field directly; if not, we infer from state.
 */
export function deriveCountry(country?: string, state?: string): string {
  if (country) return normalizeCountry(country);
  if (state && US_STATE_CODES.has(state.toUpperCase())) return "United States";
  return "International";
}

const COUNTRY_ALIASES: Record<string, string> = {
  US: "United States",
  USA: "United States",
  "UNITED STATES OF AMERICA": "United States",
  UK: "United Kingdom",
  "GREAT BRITAIN": "United Kingdom",
  GB: "United Kingdom",
  // Add more as needed
};

function normalizeCountry(raw: string): string {
  return COUNTRY_ALIASES[raw.toUpperCase()] ?? raw;
}
