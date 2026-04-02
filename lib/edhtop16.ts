import type { EdhtopTournament } from "./types";

const ENDPOINT = "https://edhtop16.com/api/graphql";

const TOURNAMENT_QUERY = `
  query GetTournaments($first: Int!, $after: String, $timePeriod: TimePeriod!, $minSize: Int) {
    tournaments(
      first: $first
      after: $after
      sortBy: DATE
      filters: { timePeriod: $timePeriod, minSize: $minSize }
    ) {
      edges {
        node {
          TID
          name
          size
          topCut
          tournamentDate
          entries {
            standing
            wins
            losses
            draws
            commander { name colorId }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// ALL_TIME has no timePeriod enum — fall back to a very wide date range
const ALL_TIME_QUERY = `
  query GetTournamentsAllTime($first: Int!, $after: String, $minSize: Int) {
    tournaments(
      first: $first
      after: $after
      sortBy: DATE
      filters: { minSize: $minSize }
    ) {
      edges {
        node {
          TID
          name
          size
          topCut
          tournamentDate
          entries {
            standing
            wins
            losses
            draws
            commander { name colorId }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function fetchPage(
  query: string,
  variables: Record<string, unknown>
): Promise<{
  tournaments: EdhtopTournament[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 1800 }, // 30-min cache
  });

  if (!res.ok) throw new Error(`edhtop16 API error: ${res.status}`);

  const json = await res.json();
  const data = json?.data?.tournaments;

  return {
    tournaments: (data?.edges ?? []).map((e: { node: EdhtopTournament }) => e.node),
    hasNextPage: data?.pageInfo?.hasNextPage ?? false,
    endCursor: data?.pageInfo?.endCursor ?? null,
  };
}

export async function fetchAllTournaments(
  timePeriod: string,
  minSize = 0
): Promise<EdhtopTournament[]> {
  const isAllTime = timePeriod === "ALL_TIME";
  const query = isAllTime ? ALL_TIME_QUERY : TOURNAMENT_QUERY;
  const allTournaments: EdhtopTournament[] = [];
  let after: string | null = null;
  let page = 0;
  const MAX_PAGES = 10; // cap at ~2000 tournaments

  do {
    const variables: Record<string, unknown> = {
      first: 200,
      after,
      minSize: minSize > 0 ? minSize : null,
    };
    if (!isAllTime) variables.timePeriod = timePeriod;

    const { tournaments, hasNextPage, endCursor } = await fetchPage(query, variables);

    allTournaments.push(...tournaments);
    after = hasNextPage ? endCursor : null;
    page++;
  } while (after && page < MAX_PAGES);

  return allTournaments;
}
