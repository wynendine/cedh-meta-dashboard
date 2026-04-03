import type { EdhtopTournament, CommanderStats } from "./types";

const ENDPOINT = "https://edhtop16.com/api/graphql";

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`edhtop16 API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "GraphQL error");
  return json.data;
}

// ─── Global meta (no location filter) ────────────────────────────────────────
// Uses edhtop16's pre-aggregated commanders query — single fast request.

const COMMANDERS_QUERY = `
  query GetCommanders($timePeriod: TimePeriod!, $minSize: Int, $minEventSize: Int!) {
    commanders(
      first: 500
      sortBy: POPULARITY
      timePeriod: $timePeriod
      minTournamentSize: $minSize
    ) {
      edges {
        node {
          name
          colorId
          stats(filters: { timePeriod: $timePeriod }) {
            count
            topCuts
            conversionRate
            winRate
            metaShare
          }
          wins: entries(
            first: 500
            sortBy: NEW
            filters: { timePeriod: $timePeriod, minEventSize: $minEventSize, maxStanding: 1 }
          ) {
            edges { node { __typename } }
            pageInfo { hasNextPage }
          }
        }
      }
    }
  }
`;

export async function fetchGlobalMeta(
  timePeriod: string,
  minSize: number
): Promise<CommanderStats[]> {
  type Row = {
    name: string;
    colorId: string;
    stats: { count: number; topCuts: number; conversionRate: number; winRate: number; metaShare: number };
    wins: { edges: { node: { __typename: string } }[]; pageInfo: { hasNextPage: boolean } };
  };
  type Res = { commanders: { edges: { node: Row }[] } };

  const data = await gql<Res>(COMMANDERS_QUERY, {
    timePeriod,
    minSize: minSize || null,
    minEventSize: minSize || 0,
  });

  return data.commanders.edges
    .map(({ node }): CommanderStats => ({
      name: node.name,
      colorId: node.colorId,
      entries: node.stats.count,
      topCuts: node.stats.topCuts,
      tournamentWins: node.wins.edges.length,
      conversionRate: node.stats.conversionRate * 100,
      winRate: node.stats.winRate > 0 ? node.stats.winRate * 100 : null,
      drawRate: null,
      metaShare: node.stats.metaShare * 100,
    }))
    .filter((c) => c.name);
}

// ─── Location-filtered meta ───────────────────────────────────────────────────
// Step 1: fetch all tournament TIDs (no entries — lightweight).
// Step 2: caller filters TIDs by location.
// Step 3: fetch entries only for matched tournaments in parallel.

const TOURNAMENT_IDS_QUERY = `
  query GetTournamentIds($first: Int!, $after: String, $timePeriod: TimePeriod!, $minSize: Int) {
    tournaments(
      first: $first
      after: $after
      sortBy: DATE
      filters: { timePeriod: $timePeriod, minSize: $minSize }
    ) {
      edges { node { TID size topCut tournamentDate } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ALL_TIME_IDS_QUERY = `
  query GetTournamentIdsAllTime($first: Int!, $after: String, $minSize: Int) {
    tournaments(
      first: $first
      after: $after
      sortBy: DATE
      filters: { minSize: $minSize }
    ) {
      edges { node { TID size topCut tournamentDate } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const TOURNAMENT_ENTRIES_QUERY = `
  query GetTournamentEntries($TID: String!) {
    tournament(TID: $TID) {
      TID size topCut tournamentDate
      entries {
        standing wins losses draws
        commander { name colorId }
      }
    }
  }
`;

type TournamentShell = { TID: string; size: number; topCut: number; tournamentDate: string };

export async function fetchAllTournamentIds(
  timePeriod: string,
  minSize: number
): Promise<TournamentShell[]> {
  const isAllTime = timePeriod === "ALL_TIME";
  const query = isAllTime ? ALL_TIME_IDS_QUERY : TOURNAMENT_IDS_QUERY;
  const all: TournamentShell[] = [];
  let after: string | null = null;
  const MAX_PAGES = 15;

  for (let page = 0; page < MAX_PAGES; page++) {
    const vars: Record<string, unknown> = { first: 200, after, minSize: minSize || null };
    if (!isAllTime) vars.timePeriod = timePeriod;

    type Res = { tournaments: { edges: { node: TournamentShell }[]; pageInfo: { hasNextPage: boolean; endCursor: string } } };
    const data = await gql<Res>(query, vars);
    const { edges, pageInfo } = data.tournaments;

    all.push(...edges.map((e) => e.node));
    if (!pageInfo.hasNextPage) break;
    after = pageInfo.endCursor;
  }

  return all;
}

export async function fetchTournamentEntries(
  shells: TournamentShell[]
): Promise<EdhtopTournament[]> {
  // Batch into groups of 10 parallel requests to avoid overwhelming the API
  const BATCH = 10;
  const results: EdhtopTournament[] = [];

  for (let i = 0; i < shells.length; i += BATCH) {
    const batch = shells.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map(async (s) => {
        type Res = { tournament: EdhtopTournament | null };
        const data = await gql<Res>(TOURNAMENT_ENTRIES_QUERY, { TID: s.TID });
        return data.tournament;
      })
    );
    results.push(...fetched.filter((t): t is EdhtopTournament => t !== null));
  }

  return results;
}

// Keep backwards compat for any direct callers
export async function fetchAllTournaments(
  timePeriod: string,
  minSize = 0
): Promise<EdhtopTournament[]> {
  const shells = await fetchAllTournamentIds(timePeriod, minSize);
  return fetchTournamentEntries(shells);
}
