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
 * Priority: explicit country field → infer from state code → infer from address string.
 */
export function deriveCountry(country?: string, state?: string, address?: string): string {
  if (country) return normalizeCountry(country);
  if (state && US_STATE_CODES.has(state.toUpperCase())) return "United States";

  // Last resort: scan the raw address string for a known country name
  if (address) {
    const upper = address.toUpperCase();
    if (upper.includes(", USA") || upper.endsWith(" USA") || / [A-Z]{2} \d{5}/.test(address)) return "United States";
    if (upper.includes(", AUSTRALIA") || upper.includes(", AU")) return "Australia";
    if (upper.includes(", CANADA") || / [A-Z]\d[A-Z] \d[A-Z]\d/.test(address)) return "Canada";
    if (upper.includes(", UK") || upper.includes(", UNITED KINGDOM") || upper.includes(", ENGLAND") || upper.includes(", SCOTLAND") || upper.includes(", WALES")) return "United Kingdom";
    if (upper.includes(", BRAZIL") || upper.includes(", BRASIL")) return "Brazil";
    if (upper.includes(", GERMANY") || upper.includes(", DEUTSCHLAND")) return "Germany";
    if (upper.includes(", FRANCE")) return "France";
    if (upper.includes(", SPAIN") || upper.includes(", ESPAÑA")) return "Spain";
    if (upper.includes(", MEXICO") || upper.includes(", MÉXICO")) return "Mexico";
    if (upper.includes(", SINGAPORE")) return "Singapore";
    if (upper.includes(", JAPAN")) return "Japan";
    if (upper.includes(", NETHERLANDS") || upper.includes(", NEDERLAND")) return "Netherlands";
    if (upper.includes(", ITALY") || upper.includes(", ITALIA")) return "Italy";
    if (upper.includes(", PORTUGAL")) return "Portugal";
    if (upper.includes(", ARGENTINA")) return "Argentina";
    if (upper.includes(", CHILE")) return "Chile";
    if (upper.includes(", COLOMBIA")) return "Colombia";
    if (upper.includes(", SWEDEN") || upper.includes(", SVERIGE")) return "Sweden";
    if (upper.includes(", NORWAY") || upper.includes(", NORGE")) return "Norway";
    if (upper.includes(", FINLAND") || upper.includes(", SUOMI")) return "Finland";
    if (upper.includes(", DENMARK") || upper.includes(", DANMARK")) return "Denmark";
    if (upper.includes(", BELGIUM") || upper.includes(", BELGIQUE")) return "Belgium";
    if (upper.includes(", POLAND") || upper.includes(", POLSKA")) return "Poland";
    if (upper.includes(", CZECH REPUBLIC") || upper.includes(", CZECHIA")) return "Czech Republic";
    if (upper.includes(", NEW ZEALAND")) return "New Zealand";
    if (upper.includes(", TAIWAN")) return "Taiwan";
    if (upper.includes(", SOUTH KOREA") || upper.includes(", KOREA")) return "South Korea";
    if (upper.includes(", HONG KONG")) return "Hong Kong";
  }

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
