import type { Game } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { isNotNull } from "./utils";

import chalk from "chalk";

export type GameWithOwn = Game & {
  owns?: 0 | 1;
};

export type GameWithSubs = Pick<
  GameWithOwn,
  "owns" | "id" | "console" | "region" | "title"
> & {
  subgames: Game[];
};

const mergeSubgames = (list: GameWithOwn[]): GameWithSubs[] => {
  const parentGamesMap = new Map<string, GameWithSubs>();
  const subGamesToProcess: (GameWithOwn & { parent_id: string })[] = [];
  for (const game of list) {
    if (game.parent_id) {
      subGamesToProcess.push(game as GameWithOwn & { parent_id: string });
    } else {
      if (!parentGamesMap.has(game.id)) {
        parentGamesMap.set(game.id, {
          console: game.console,
          id: game.id,
          region: game.region,
          subgames: [],
          title: game.title,
          owns: game.owns,
        });
      }
    }
  }
  for (const sGame of subGamesToProcess) {
    const parent = parentGamesMap.get(sGame.parent_id);
    if (parent) parent.subgames.push(sGame);
    else {
      // TODO HANDLE THAT
      console.log(chalk.red("ORPHANED GAME!"), sGame.id);
    }
  }
  return Array.from(parentGamesMap.values());
};

const dedupeGames = <T extends { id: string }>(games: T[]): T[] => {
  const ids = new Set<string>();
  for (const game of games) {
    ids.add(game.id);
  }
  return [...ids].map((id) => games.find((g) => g.id === id)).filter(isNotNull);
};

const fetchGamesUntil = async (
  db: PrismaClient,
  { parent, sub }: { parent: string; sub: string },
  userID: string | undefined,
  take: number,
  skip: number,
  vars: string[],
) => {
  const fullVars = userID
    ? [userID, take, skip, ...vars]
    : [take, skip, ...vars];

  const parentGames = await db.$queryRawUnsafe<GameWithOwn[]>(
    parent,
    ...fullVars,
  );

  console.log(`Parent games: ${chalk.yellow(parentGames.length)}`);

  const subGames = await db.$queryRawUnsafe<GameWithOwn[]>(
    sub,
    parentGames.map((q) => q.id),
    userID,
  );

  console.log(`Subgames games: ${chalk.yellow(subGames.length)}`);

  const subsWithNoParents = subGames.filter(
    (child) => !parentGames.some((p) => p.id === child.parent_id),
  );

  if (subsWithNoParents.length > 0) {
    console.log(`Subs without a parent: ${chalk.red(parentGames.length)}`);
    const subsParents = await db.$queryRawUnsafe<GameWithOwn[]>(
      `select *, ${userID ? `case when (l."userId" = $2) then 1 else 0 end` : "0 as owns"}
          from "Game" as g ${userID ? `left join "Library" as l on l."gameID" = f.id` : ""}
          where g.id = ANY($1);`,
      subsWithNoParents.map((q) => q.parent_id).filter(isNotNull),
      userID,
    );
    parentGames.push(...subsParents);
  }
  const allGames = [...parentGames, ...subGames];
  console.log(`All games: ${chalk.yellow(allGames.length)}`);

  const dedupedGames = dedupeGames(allGames);
  console.log(`Deduped games: ${chalk.yellow(dedupedGames.length)}`);

  return mergeSubgames(dedupedGames);
};

export type GameQueryColumn =
  | "id"
  | "title"
  | "console"
  | "region"
  | "parent_id";

export type GameQuerySort = Partial<
  Record<GameQueryColumn, { priority: number; sort: "asc" | "desc" }>
>;

type GameQueryFilter = {
  on: boolean;
  varNum: number;
  castTo?: string;
  comparisonType?: "LIKE" | "=" | "is not null" | "is null";
};

export type GameQuerySearch = Partial<Record<GameQueryColumn, GameQueryFilter>>;

const querySortToSQL = (s: GameQuerySort) => {
  const entries = Object.entries(s).toSorted(
    ([_t1, { priority: p1 }], [_t2, { priority: p2 }]) => {
      return p1 - p2;
    },
  );

  const sorts: { col: string; sort: string }[] = [];
  for (const [col, sortData] of entries) {
    sorts.push({ col, sort: sortData.sort });
  }

  return sorts.map((q) => `"g"."${q.col}" ${q.sort}`).join(", ");
};

// Helper function to format a single condition part
function formatCondition(
  column: GameQueryColumn,
  compare: GameQueryFilter["comparisonType"],
  varNum?: number,
  cast?: GameQueryFilter["castTo"],
): string {
  const valuePart = compare?.includes("null")
    ? "" // For IS NULL/IS NOT NULL, no value needed
    : cast
      ? `CAST($${varNum} AS "${cast}")`
      : `$${varNum}`;
  return `g."${column}" ${compare} ${valuePart}`.trim(); // .trim() removes extra space if valuePart is empty
}

const buildWhereClause = (s: GameQuerySearch): string => {
  const conditions: string[] = [];
  const idOrTitle: string[] = [];
  if (s.id?.on) {
    idOrTitle.push(
      formatCondition("id", s.id.comparisonType ?? "LIKE", s.id.varNum),
    );
  }
  if (s.title?.on) {
    idOrTitle.push(
      formatCondition(
        "title",
        s.title.comparisonType ?? "LIKE",
        s.title.varNum,
      ),
    );
  }
  if (idOrTitle.length > 0) {
    conditions.push(`(${idOrTitle.join(" OR ")})`);
  }
  if (s.console?.on) {
    conditions.push(
      formatCondition(
        "console",
        s.console.comparisonType ?? "=",
        s.console.varNum,
        s.console.castTo ?? "Console",
      ),
    );
  }
  if (s.region?.on) {
    conditions.push(
      formatCondition(
        "region",
        s.region.comparisonType ?? "=",
        s.region.varNum,
        s.region.castTo ?? "Region",
      ),
    );
  }
  if (s.parent_id?.on && s.parent_id.comparisonType) {
    conditions.push(
      formatCondition(
        "parent_id",
        s.parent_id.comparisonType,
        -1, // -1 bc can only be NULL/NOT NULL
      ),
    );
  }
  if (conditions.length === 0) return "";
  return `WHERE ${conditions.join(" AND\n      ")}`;
};

export const getOrderedSearchValues = (
  filters: GameQuerySearch,
  terms: Partial<Record<GameQueryColumn, string>>,
): string[] => {
  const orderedValues: Record<number, string> = {};

  for (const column of Object.keys(filters) as GameQueryColumn[]) {
    const filter = filters[column];
    if (filter?.on && filter.comparisonType !== "is null") {
      // Don't include value for IS NULL
      const value = terms[column];
      if (value !== undefined) {
        orderedValues[filter.varNum] = value;
      }
    }
  }

  // Sort by varNum (key) and extract values
  return Object.entries(orderedValues)
    .sort(([num1], [num2]) => +num1 - +num2)
    .map(([, value]) => value);
};

export const getVarOrder = (search: GameQuerySearch) => {
  const entries = Object.entries(search) as [
    GameQueryColumn,
    NonNullable<GameQuerySearch[GameQueryColumn]>,
  ][];
  const ret: Record<number, GameQueryColumn | undefined> = {};
  for (const [k, v] of entries) {
    if (v.on && v.comparisonType !== "is not null") {
      ret[v.varNum] = k;
    }
  }
  return ret;
};

export const queryGames = async (
  db: PrismaClient,
  userID?: string,
  sort?: GameQuerySort,
  searchTerms?: Partial<Record<GameQueryColumn, string>>, // Renamed for clarity
  [skip, take] = [0, 100],
): Promise<GameWithSubs[]> => {
  const searchFilters: GameQuerySearch = {};
  let nextVarNum = userID ? 4 : 3; // Starting varNum for search parameters
  if (searchTerms) {
    for (const [column, value] of Object.entries(searchTerms)) {
      if (value !== undefined) {
        const col = column as GameQueryColumn;
        searchFilters[col] = {
          on: true,
          varNum: nextVarNum++,
          // USE DEFAULT VALUES FOR castTo AND comparisonType
          // CHANGE IT YOU GIVE USERS THE ABILITY TO CHANGE IT
        };
      }
    }
  }
  searchFilters.parent_id = {
    on: true,
    varNum: -1,
    comparisonType: "is null",
  };
  const { uidQuery, nouidQuery, subgames } = createGameQuery(
    sort ?? {},
    searchFilters,
  );
  const vars = getOrderedSearchValues(searchFilters, searchTerms ?? {});
  return fetchGamesUntil(
    db,
    {
      parent: userID ? uidQuery : nouidQuery,
      sub: subgames[userID ? "uid" : "nouid"],
    },
    userID,
    take,
    skip,
    vars,
  );
};

export const createGameQuery = (
  sort: GameQuerySort,
  search: GameQuerySearch = {},
) => {
  const sortClause = querySortToSQL(sort);

  const whereClause = buildWhereClause(search);

  return {
    /**
     * Full db query
     * Params:
     *
     * $1 - userID
     *
     * $2 - limit
     *
     * $3 - offset
     *
     * $4+ - defined in {@link .varsOrder}
     */
    uidQuery: `Select *, case when (l."userId" = $1) then 1 else 0 end as owns from "Game" as g
left join "Library" as l
  on l."gameId" = g.id
${whereClause}
order by owns desc${!!sortClause ? `, ${sortClause} ` : " "} limit $2 offset $3;`,
    /**
     * Full db query without userID ordering
     * Params:
     *
     * $1 - limit
     *
     * $2 - offset
     *
     * $3+ - defined in {@link .varsOrder}
     */
    nouidQuery: `Select *, 0 as owns from "Game" as g
${whereClause}
${!!sortClause ? `order by ${sortClause} ` : " "}limit $1 offset $2;`,
    subgames: {
      /** Params:
       *
       * $1 - Array of gameIDs
       */
      nouid: `select *, 0 as owns from "Game" as g
where parent_id = ANY($1)
${!!sortClause ? `order by ${sortClause}` : ""};`,
      /** Params:
       *
       * $1 - Array of gameIDs
       *
       * $2 - userID
       */
      uid: `select *, case when (l."userId" = $2) then 1 else 0 end as owns from "Game" as g
left join "Library" as l
  on l."gameId" = g.id
where parent_id = ANY($1)
order by owns desc${!!sortClause ? `, ${sortClause}` : ""};`,
    },
    /**
     * Order of variables in fullQuery or nouidQuery.
     *
     * Use: `varsOrder[#] // returns column name whose search value should be #th variable in the query`
     */
    varsOrder: getVarOrder(search),
  };
};
