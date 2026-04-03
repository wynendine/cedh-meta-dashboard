// ─── edhtop16 raw types ──────────────────────────────────────────────────────

export interface EdhtopEntry {
  standing: number;
  wins: number;
  losses: number;
  draws: number;
  commander: { name: string; colorId: string };
}

export interface EdhtopTournament {
  TID: string;
  name: string;
  size: number;
  topCut: number;
  tournamentDate: string;
  entries: EdhtopEntry[];
}

// ─── TopDeck raw types ────────────────────────────────────────────────────────

export interface TopDeckEventData {
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  location?: string; // venue name
}

export interface TopDeckTournament {
  TID: string;
  name: string;
  players: number;
  startDate: string;
  eventData?: TopDeckEventData;
}

// ─── Enriched tournament (joined) ────────────────────────────────────────────

export interface Tournament extends EdhtopTournament {
  country?: string;
  region?: string;
  state?: string;
  city?: string;
  venue?: string;
}

// ─── Aggregated commander stats ───────────────────────────────────────────────

export interface CommanderStats {
  name: string;
  colorId: string;
  entries: number;
  topCuts: number;
  tournamentWins: number; // entries with standing === 1
  conversionRate: number; // topCuts / entries
  winRate: number | null; // null when no game data available
  drawRate: number | null; // null when no game data available
  metaShare: number; // entries / totalEntries (0–100)
}

// ─── API response types ───────────────────────────────────────────────────────

export interface MetaResponse {
  commanders: CommanderStats[];
  totalEntries: number;
  totalTournaments: number | null;
}

export interface LocationsResponse {
  countries: string[];
  regions: string[];
  states: { value: string; label: string; region: string; country: string }[];
  cities: { value: string; label: string; state: string; country: string }[];
}

// ─── Filter state ─────────────────────────────────────────────────────────────

export type TimePeriod =
  | "ONE_MONTH"
  | "THREE_MONTHS"
  | "SIX_MONTHS"
  | "ONE_YEAR"
  | "ALL_TIME";

export interface Filters {
  timePeriod: TimePeriod;
  country: string;
  region: string;
  state: string;
  city: string;
  minSize: number;
}
