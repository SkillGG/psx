import type { Game } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { isNotNull } from "./utils";

import chalk from "chalk";
import type { GameData, SortSchema } from "~/server/api/routers/games";
import type z from "zod";

export type GameWithOwn = Game & {
  owned?: boolean;
};

export type GameWithSubs = Pick<
  GameWithOwn,
  "owned" | "id" | "console" | "region" | "title" | "additionalInfo"
> & {
  subgames: GameWithOwn[];
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
          additionalInfo: game.additionalInfo,
          owned: game.owned,
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

  console.log("Parent games:", chalk.red(parentGames.length));

  const subVars: [string[]] | [string[], string] = userID
    ? [parentGames.map((q) => q.id), userID]
    : [parentGames.map((q) => q.id)];

  const subGames = await db.$queryRawUnsafe<GameWithOwn[]>(sub, ...subVars);

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
  const mergedGames = mergeSubgames(dedupedGames);
  console.log(`Merged games: ${chalk.yellow(mergedGames.length)}`);
  return mergedGames;
};

export type GameQueryColumn =
  | "id"
  | "title"
  | "console"
  | "region"
  | "parent_id";

export type GameQuerySort = SortSchema;

type GameQueryFilter = {
  on: boolean;
  varNum: number;
  castTo?: string;
  comparisonType?: "LIKE" | "=" | "is not null" | "is null";
};

export type GameQuerySearch = Partial<Record<GameQueryColumn, GameQueryFilter>>;

const querySortToSQL = (s: GameQuerySort) => {
  const entries = Object.entries(s.columns).toSorted(
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

function formatCondition(alias?: string) {
  return function (
    column: GameQueryColumn,
    compare: GameQueryFilter["comparisonType"],
    varNum?: number,
    cast?: GameQueryFilter["castTo"],
    or?: string,
    valueOverride?: string,
  ): string {
    const valuePart = compare?.includes("null")
      ? ""
      : cast
        ? `CAST($${varNum} AS "${cast}")`
        : `$${varNum}`;
    const thisQ =
      `${alias ?? "g"}."${column}" ${compare} ${valueOverride ?? valuePart}`.trim();
    return or ? `(${thisQ} or ${or})` : thisQ;
  };
}

const buildWhereClause = (s: GameQuerySearch, alias?: string): string => {
  const conditions: string[] = [];
  const idOrTitle: string[] = [];

  const format = formatCondition(alias);

  if (s.id?.on)
    idOrTitle.push(format("id", s.id.comparisonType ?? "LIKE", s.id.varNum));

  if (s.title?.on)
    idOrTitle.push(
      format("title", s.title.comparisonType ?? "LIKE", s.title.varNum),
    );
  if (idOrTitle.length > 0) conditions.push(`(${idOrTitle.join(" OR ")})`);

  if (s.console?.on) {
    conditions.push(
      format(
        "console",
        s.console.comparisonType ?? "=",
        s.console.varNum,
        s.console.castTo ?? "Console",
        format(
          "console",
          "=",
          undefined,
          undefined,
          undefined,
          `CAST('NA' AS "Console")`,
        ),
      ),
    );
  }
  if (s.region?.on) {
    conditions.push(
      format(
        "region",
        s.region.comparisonType ?? "=",
        s.region.varNum,
        s.region.castTo ?? "Region",
        format(
          "region",
          "=",
          undefined,
          undefined,
          undefined,
          `CAST('NA' AS "Region")`,
        ),
      ),
    );
  }
  if (s.parent_id?.on && s.parent_id.comparisonType) {
    conditions.push(
      format(
        "parent_id",
        s.parent_id.comparisonType,
        -1, // -1 bc can only be NULL/NOT NULL
      ),
    );
  }
  if (conditions.length === 0) return "";
  return `${conditions.join(" AND\n      ")}`.trim();
};

export const getOrderedSearchValues = (
  filters: GameQuerySearch,
  terms: Partial<Record<GameQueryColumn, string>>,
): string[] => {
  const orderedValues: Record<number, string> = {};

  for (const column of Object.keys(filters) as GameQueryColumn[]) {
    const filter = filters[column];
    if (filter?.on && filter.comparisonType !== "is null") {
      const value = terms[column];
      if (value !== undefined) {
        orderedValues[filter.varNum] = value;
      }
    }
  }

  return Object.entries(orderedValues)
    .sort(([num1], [num2]) => +num1 - +num2)
    .map(([, value]) => value);
};

export const queryGames = async (
  db: PrismaClient,
  userID?: string,
  sort?: GameQuerySort,
  searchTerms?: Partial<Record<GameQueryColumn, string>>,
  [skip, take] = [0, 100],
): Promise<GameWithSubs[]> => {
  const searchFilters: GameQuerySearch = {};
  let nextVarNum = userID ? 4 : 3;
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
    sort ?? { ownership: !!userID, columns: {} },
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
  const userSort = querySortToSQL(sort);

  const whereClause = buildWhereClause(search);

  console.log("Where caluse", whereClause);
  console.log("User sort", userSort);

  const where = whereClause ? `where ${whereClause}` : "";

  const ownershipSort = sort.ownership
    ? `(CASE WHEN ((c.has_children AND NOT c.has_unowned_child) OR c.direct_owned) THEN 1 ELSE 0 END) desc,
(case when (c.has_children and c.has_owned_child) then 1 else 0 end) desc`
    : null;

  const subOwnershipSort = sort.ownership
    ? `(case when (l."userId" = $2) then 1 else 0 end) desc`
    : null;

  const sortClause = (includeOwner = false) =>
    userSort || ownershipSort
      ? `order by ${[includeOwner ? ownershipSort : null, userSort].filter(isNotNull).join(",\n")}`
      : null;

  const subSortClause = (includeOwner = false) =>
    userSort || subOwnershipSort
      ? `order by ${[includeOwner ? subOwnershipSort : null, userSort].filter(isNotNull).join(",\n")}`
      : null;

  const childWhere = buildWhereClause(
    {
      ...search,
      parent_id: undefined,
    },
    "gx",
  );

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
    uidQuery: `--UID Query With sorting
SELECT
g.*,
((c.has_children AND NOT c.has_unowned_child) OR c.direct_owned) AS owned
FROM "Game" g
LEFT JOIN LATERAL (
  SELECT
    EXISTS (SELECT 1 FROM "Game" ch WHERE ch.parent_id = g.id) AS has_children,
    ${childWhere ? `exists (select 1 from "Game" gx where gx.parent_id = g.id and ${childWhere}) as found_children,` : ""}
    EXISTS (
      SELECT 1 FROM "Game" ch
      WHERE ch.parent_id = g.id
      AND NOT EXISTS (
        SELECT 1 FROM "Library" l2 WHERE l2."userId" = $1 AND l2."gameId" = ch.id
      )
    ) AS has_unowned_child,
    exists (select 1 from "Game" ch where ch.parent_id = g.id
      and exists (
        select 1 from "Library" l2 where l2."userId" = $1 and l2."gameId" = ch.id
      )
    ) as has_owned_child,
    EXISTS (SELECT 1 FROM "Library" l WHERE l."userId" = $1 AND l."gameId" = g.id) AS direct_owned
  ) c
  ON true
${childWhere ? `where c.found_children or (${whereClause})` : where}
${sortClause(true)}
LIMIT $2 OFFSET $3;`,
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
    nouidQuery: `--noUID Query
select *, false as owned from "Game" as g
${where}
${sortClause(false) ?? ""}
limit $1 offset $2;`,
    subgames: {
      /** Params:
       *
       * $1 - Array of gameIDs
       */
      nouid: `--sub noUID Query
select *, false as owned from "Game" as g
where parent_id = ANY($1)
${subSortClause(false) ?? ""};`,
      /** Params:
       *
       * $1 - Array of gameIDs
       *
       * $2 - userID
       */
      uid: `--sub UID Query
select *, case when (l."userId" = $2) then true else false end as owned from "Game" as g
left join "Library" as l
  on l."gameId" = g.id
where parent_id = ANY($1)
${subSortClause(true) ?? ""};`,
    },
  };
};

export const updateMultipleGamesQuery = (
  games: { id: string; data: Omit<z.infer<typeof GameData>, "parent_id"> }[],
): [string, unknown[]] => {
  const vars: unknown[] = [];

  const query = `update "Game" as g
set
  id = v.id,
  title = v.title,
  console = v.console,
  region = v.region,
  "additionalInfo" = v.ai
from (values ${games
    .map((game) => {
      const varNum = vars.length;

      const cVars = [
        game.id,
        game.data.id,
        game.data.title,
        game.data.console,
        game.data.region,
        game.data.additionalInfo ?? null,
      ];

      const qVars = [...cVars.map((_, i) => `$${varNum + i + 1}`)];

      qVars[3] = `CAST(${qVars[3]} AS "Console")`;
      qVars[4] = `CAST(${qVars[4]} AS "Region")`;

      vars.push(...cVars);

      return `(${qVars.join(", ")})`;
    })
    .join(",\n")}) as v(oid, id, title, console, region, ai)
where g.id = v.oid;`;

  return [query, vars];
};
