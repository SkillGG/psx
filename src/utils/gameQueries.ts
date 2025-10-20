import type { Game } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import chalk from "chalk";
import { isNotNull } from "./utils";

export type GameWithSubs = Pick<Game, "id" | "console" | "region" | "title"> & {
  subgames: Game[];
};

const mergeSubgames = (list: Game[]): GameWithSubs[] => {
  const retList = [
    ...list.map<GameWithSubs>((q) => ({
      console: q.console,
      id: q.id,
      region: q.region,
      subgames: [],
      title: q.title,
    })),
  ];

  const subGames = list.filter((q): q is Required<Game> => !!q.parent_id);

  for (const sGame of subGames) {
    const indexInMain = retList.findIndex((q) => q.id === sGame.id);
    if (indexInMain < 0) continue;
    const parent = retList.find((q) => q.id === sGame.parent_id);
    if (!parent) continue;
    parent.subgames.push(sGame);
    retList.splice(indexInMain, 1);
  }

  return retList;
};

export const queryGames = async (
  db: PrismaClient,
  userID?: string,
  sort?: GameQuerySort,
  search?: Partial<Record<GameQueryColumn, string>>,
  [skip, take] = [0, 100],
): Promise<GameWithSubs[]> => {
  const searchTyping: GameQuerySearch = {};

  if (search) {
    let i = 0;
    for (const [type] of Object.entries(search)) {
      const t = type as GameQueryColumn;
      searchTyping[t] = { on: true, varNum: (userID ? 4 : 3) + i++ };
    }
  }

  const {
    query: uidQuery,
    nouidQuery,
    varsOrder,
  } = createGameQuery(sort ?? {}, searchTyping);

  const vars: string[] = Object.entries(varsOrder)
    .toSorted(([p], [n]) => +p - +n)
    .map((q) => q[1])
    .filter(isNotNull)
    .map((q) => search?.[q])
    .filter(isNotNull);

  console.log(
    "query:",
    (userID ? uidQuery : nouidQuery).replaceAll("\n", " "),
    "\n",
    "vars:\n",
    chalk.red(
      ...[userID ? [userID, take] : take, skip, ...vars]
        .flat(3)
        .map((q, i) => `$${i + 1}=${chalk.green(q)}\n`),
    ),
  );

  const games = userID
    ? await db.$queryRawUnsafe<Game[]>(uidQuery, userID, take, skip, ...vars)
    : await db.$queryRawUnsafe<Game[]>(nouidQuery, take, skip, ...vars);

  return mergeSubgames(games);
};

export type GameQueryColumn = "id" | "title" | "console" | "region";

export type GameQuerySort = Partial<
  Record<GameQueryColumn, { priority: number; sort: "asc" | "desc" }>
>;

type GameQueryFilter = {
  on: boolean;
  varNum: number;
  castTo?: string;
  comparisonType?: "LIKE" | "=";
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

const querySearchToSQL = (s: GameQuerySearch) => {
  const vals = (
    [
      s.id?.on
        ? { v: "id", n: s.id.varNum, s: s.id.comparisonType ?? "LIKE" }
        : "",
      s.title?.on
        ? {
            v: "title",
            n: s.title.varNum,
            s: s.title.comparisonType ?? "LIKE",
          }
        : "",
      s.console?.on
        ? {
            v: "console",
            n: s.console.varNum,
            s: "=",
            c: s.console.castTo ?? `Console`,
          }
        : "",
      s.region?.on
        ? {
            v: "region",
            s: "=",
            n: s.region.varNum,
            c: s.region.castTo ?? `Region`,
          }
        : "",
    ] satisfies (
      | string
      | {
          v: GameQueryColumn;
          s: GameQueryFilter["comparisonType"];
          c?: GameQueryFilter["castTo"];
          n: number;
        }
    )[]
  )
    .filter((q) => typeof q !== "string")
    .map(
      (q) =>
        `g."${q.v}" ${q.s} ${"c" in q ? `CAST($${q.n} AS "${q.c}")` : `$${q.n}`}`,
    )
    .join(" OR ");

  return vals ? `where ${vals}` : "";
};

const fullQuery = (sort: string, search: GameQuerySearch) => `Select
g.id, g.console, g.title, g.region, g.parent_id
from "Game" as g
left join "Library" as l
  on l."gameId" = g.id
${querySearchToSQL(search)}
order by case when (l."userId" = $1) then 1 else 2 end asc${!!sort ? `, ${sort} ` : " "}limit $2 offset $3;
`;

const noUIDQuery = (sort: string, search: GameQuerySearch) => `Select
g.id, g.console, g.title, g.region, g.parent_id
from "Game" as g
${querySearchToSQL(search)}
${!!sort ? `order by ${sort} ` : " "}limit $1 offset $2;
`;

export const getVarOrder = (search: GameQuerySearch) => {
  const entries = Object.entries(search) as [
    GameQueryColumn,
    NonNullable<GameQuerySearch[GameQueryColumn]>,
  ][];
  const ret: Record<number, GameQueryColumn | undefined> = {};
  for (const [k, v] of entries) {
    if (v.on) {
      ret[v.varNum] = k;
    }
  }
  return ret;
};

export const createGameQuery = (
  sort: GameQuerySort,
  search: GameQuerySearch = {},
) => {
  const sortPart = querySortToSQL(sort);

  return {
    query: fullQuery(sortPart, search),
    nouidQuery: noUIDQuery(sortPart, search),
    varsOrder: getVarOrder(search),
  };
};
