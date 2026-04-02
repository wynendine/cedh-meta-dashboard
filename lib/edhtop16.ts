import type { EdhtopTournament } from "./types";

const ENDPOINT = "https://edhtop16.com/api/graphql";

const TOURNAMENT_QUERY = `
  query GetTournaments($first: Int!, $after: String, $minDate: String, $maxDate: String, $minSize: Int) {
    tournaments(
      first: $first
      after: $after
      sortBy: DATE
      filters: { minDate: $minDate, maxDate: $maxDate, minSize: $minSize }
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

function timePeriodToDates(timePeriod: string): { minDate: string; maxDate: string } {
  const now = new Date();
  const maxDate = now.toISOString();
  const daysMap: Record<string, number> = {
    ONE_MONTH: 30,
    THREE_MONTHS: 90,
    SIX_MONTHS: 180,
    ONE_YEAR: 365,
    ALL_TIME: 365 * 10,
  };
  const days = daysMap[timePeriod] ?? 90;
  const minDate = new Date(now.getTime() - days * 86400000).toISOString();
  return { minDate, maxDate };
}

async function fetchPage(variables: Record<string, unknown>): Promise<{
  tournaments: EdhtopTournament[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: TOURNAMENT_QUERY, variables }),
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
  const { minDate, maxDate } = timePeriodToDates(timePeriod);
  const allTournaments: EdhtopTournament[] = [];
  let after: string | null = null;
  let page = 0;
  const MAX_PAGES = 10; // cap at ~2000 tournaments

  do {
    const { tournaments, hasNextPage, endCursor } = await fetchPage({
      first: 200,
      after,
      minDate,
      maxDate,
      minSize: minSize > 0 ? minSize : null,
    });

    allTournaments.push(...tournaments);
    after = hasNextPage ? endCursor : null;
    page++;
  } while (after && page < MAX_PAGES);

  return allTournaments;
}
