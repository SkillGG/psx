import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { Game, PrismaClient } from "@prisma/client";
import { adminProcedure, userProcedure } from "../auth";
import { queryGames, updateMultipleGamesQuery } from "~/utils/gameQueries";
import { isNotNull } from "~/utils/utils";

import chalk from "chalk";

const ConsoleType = z.enum(["PS1", "PS2", "PSP", "NA"]);
const RegionType = z.enum(["PAL", "NTSC", "NTSCJ", "NA"]);

export const GameData = z.object({
  id: z.string(),
  title: z.string(),
  console: ConsoleType,
  region: RegionType,
  parent_id: z.string().nullable().optional(),
  additionalInfo: z.string().nullable().optional(),
});

const QueryColumn = z.enum(["id", "title", "console", "region"]);
const SearchSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    console: ConsoleType.optional(),
    region: RegionType.optional(),
  })
  .partial();

export type SearchSchema = z.infer<typeof SearchSchema>;

const SortSchema = z.object({
  ownership: z.boolean(),
  columns: z.partialRecord(
    QueryColumn,
    z.object({ priority: z.number(), sort: z.enum(["asc", "desc"]) }),
  ),
});

export type SortSchema = z.infer<typeof SortSchema>;

const clearOrphanedParents = async (db: PrismaClient) => {
  const orphanedParents = (
    await db.game.findMany({
      where: {
        OR: [
          {
            subgames: {
              some: {
                parent_id: {
                  not: null,
                },
              },
            },
          },
          {
            id: {
              endsWith: "_agg",
            },
          },
        ],
      },
      include: {
        subgames: true,
        _count: {
          select: {
            subgames: true,
          },
        },
      },
    })
  )
    .map((p) => {
      return p._count.subgames > 1 ? null : p;
    })
    .filter(isNotNull);

  clog("clearOrphanedParents", "Orphaned parents found!", orphanedParents);

  if (orphanedParents.length) {
    clog(
      "clearOrphanedParents",
      "Clearing orphaned parents!",
      chalk.red(orphanedParents.map((q) => q.id).join(chalk.white(", "))),
    );

    // remove all parent relations to orphaned parent
    await db.game.updateMany({
      where: {
        parent_id: {
          in: orphanedParents.map((q) => q.subgames.map((z) => z.id)).flat(20),
        },
      },
      data: {
        parent_id: null,
      },
    });

    // delete orphaned parent
    await db.game.deleteMany({
      where: {
        id: { in: orphanedParents.map((q) => q.id) },
      },
    });
  }
};

const clog = (desc: string, ...other: unknown[]) => {
  console.log(
    chalk.cyan(`============ ${desc} ============\n`),
    ...other,
    "\n\n",
  );
};

export const gameRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          userID: z.string().optional(),
          search: SearchSchema.optional(),
          sort: SortSchema.optional(),
          skip: z.number().int().optional(),
          take: z.number().int().optional(),
        })
        .partial(),
    )
    .query(async ({ ctx, input }) => {
      const games = await queryGames(
        ctx.db,
        input.userID,
        input.sort,
        input.search,
        [input.skip ?? 0, input.take ?? 100],
      );
      return games;
    }),
  removeGames: adminProcedure
    .input(z.array(z.string()))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.game.deleteMany({
        where: {
          id: { in: input },
        },
      });

      await clearOrphanedParents(ctx.db);
    }),
  markOwnership: userProcedure
    .input(z.object({ ids: z.array(z.string()), ownership: z.boolean() }))
    .mutation(
      async ({
        ctx: {
          db,
          user: { id },
        },
        input: { ids, ownership },
      }) => {
        if (ownership) {
          await db.library.createMany({
            data: ids.map((q) => {
              return {
                userId: id,
                gameId: q,
              };
            }),
            skipDuplicates: true,
          });
        } else {
          await db.library.deleteMany({
            where: {
              AND: [
                {
                  userId: id,
                },
                {
                  gameId: {
                    in: ids,
                  },
                },
              ],
            },
          });
        }
      },
    ),
  addSingle: adminProcedure
    .input(z.object({ game: GameData }))
    .mutation(async ({ ctx, input }) => {
      const newGame: Game = {
        ...input.game,
        additionalInfo: input.game.additionalInfo ?? null,
        parent_id: input.game.parent_id ?? null,
      };
      const nG = await ctx.db.game.create({
        data: newGame,
      });
      return nG;
    }),
  importBatch: adminProcedure
    .input(z.array(GameData))
    .mutation(async ({ ctx, input }) => {
      const games: Game[] = input.map((q) => {
        if (q.parent_id) clog("importBatch", "GAME WITHN PARENT ID", q);
        return {
          ...q,
          additionalInfo: q.additionalInfo ?? null,
          parent_id: q.parent_id ?? null,
        };
      });
      const insert = await ctx.db.game.createManyAndReturn({
        data: games,
      });
      return insert;
    }),
  editData: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: GameData.omit({ parent_id: true }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.game.update({
        where: {
          id: input.id,
        },
        data: {
          ...input.data,
        },
      });

      return game;
    }),
  batchEditData: adminProcedure
    .input(
      z.array(
        z.object({ id: z.string(), data: GameData.omit({ parent_id: true }) }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const [updateQuery, vars] = updateMultipleGamesQuery(input);

      console.log("========= QUERY ==========\n", chalk.red(updateQuery));
      console.log("========= VARS ===========");
      console.log(
        vars
          .map((q, i) => `${chalk.blue(`$${i + 1}`)}: ${chalk.red(q)}`)
          .join("\n"),
      );

      await ctx.db.$queryRawUnsafe(updateQuery, ...vars);
    }),
  removeFromGroup: adminProcedure
    .input(z.array(z.string()))
    .mutation(async ({ ctx: { db }, input: games }) => {
      clog(
        "removeFromGroup",
        chalk.red("Removing games from a parent\n"),
        chalk.yellow(games.join("\n")),
      );

      await db.game.updateMany({
        where: {
          id: {
            in: games,
          },
        },
        data: {
          parent_id: null,
        },
      });

      await clearOrphanedParents(db);

      return { ok: true };
    }),
  group: adminProcedure
    .input(
      z
        .object({
          games: z.array(z.string()),
          aggId: z.string(),
        })
        .or(
          z.object({
            games: z.array(z.string()),
            title: z.string(),
            groupID: z.string(),
          }),
        ),
    )
    .mutation(
      async ({
        ctx: { db },
        input: { games, ...aggData },
      }): Promise<{ err: string } | { ok: true }> => {
        // check if all games are single

        const nonSingleGame = await db.game.findFirst({
          where: {
            AND: [
              {
                NOT: {
                  parent_id: null,
                },
              },
              {
                id: {
                  in: games,
                },
              },
            ],
          },
        });

        if (nonSingleGame) {
          return {
            err: "There are games in the list that already have a parent!",
          };
        }

        if ("aggId" in aggData) {
          if (!aggData.aggId.endsWith("_agg"))
            return { err: "Group-into aggId should end with _agg" };

          await db.game.update({
            where: {
              id: aggData.aggId,
            },
            data: {
              subgames: {
                connect: games.map((id) => ({ id })),
              },
            },
          });

          return { ok: true };
        }

        const groupID = aggData.groupID.endsWith("_agg")
          ? aggData.groupID
          : aggData.groupID + "_agg";

        clog(
          "group",
          chalk.green("Creating aggregate"),
          groupID,
          chalk.green("with games:\n"),
          chalk.yellow(games.map((z) => chalk.green(z)).join("\n")),
        );

        await db.game.create({
          data: {
            console: "NA",
            id: groupID,
            region: "NA",
            title: aggData.title,
            subgames: {
              connect: games.map((id) => ({ id })),
            },
          },
        });

        return { ok: true };
      },
    ),
  reparent: adminProcedure
    .input(z.object({ id: z.string(), parent_id: z.string().nullable() }))
    .mutation(
      async ({ ctx, input }): Promise<{ err: string } | { ok: true }> => {
        const { id, parent_id } = input;

        const game = await ctx.db.game.findFirst({
          where: { OR: [{ id }] },
        });

        if (!game) {
          return { err: "Game with given ID does not exist!" };
        }

        clog(
          "reparent",
          chalk.blue(`Reparenting `),
          id,
          chalk.blue(" to be under: "),
          parent_id,
        );

        if (!parent_id) {
          // remove parent from id

          clog(
            "reparent",
            chalk.yellow("Setting parent_id of"),
            game.id,
            chalk.yellow("to"),
            chalk.red(" null"),
          );

          if (!game.parent_id)
            return { err: `Game with ID ${id} does not have a parent!` };

          await ctx.db.game.update({
            where: {
              id: game.id,
            },
            data: {
              parent_id: null,
            },
          });

          await clearOrphanedParents(ctx.db);

          return { ok: true };
        }

        if (parent_id.endsWith("_agg")) {
          clog(
            "reparent",
            chalk.yellow("Supplied parent_id is an aggregator!"),
            "Updating it to add a new child",
          );
          // provided aggregatror
          await ctx.db.game.update({
            where: {
              id: parent_id,
            },
            data: {
              subgames: {
                connect: {
                  id,
                },
              },
            },
          });
          return { ok: true };
        }

        clog(
          "reparent",
          chalk.yellow(
            "Supplied parent_id is not an aggregator! Getting the game values",
          ),
        );

        const kid = await ctx.db.game.findFirst({
          where: { id: parent_id },
          include: {
            parent: true,
          },
        });

        if (!kid) return { err: `No game with ID ${id} exists!` };

        if (kid.parent) {
          await ctx.db.game.update({
            where: {
              id: kid.parent.id,
            },
            data: {
              subgames: { connect: { id } },
            },
          });
        } else {
          await ctx.db.game.create({
            data: {
              console: "NA",
              id: kid.id + "_agg",
              region: "NA",
              title: kid.title,
              subgames: {
                connect: [{ id }, { id: kid.id }],
              },
            },
          });
        }

        return { ok: true };
      },
    ),
  clearDB: adminProcedure.mutation(async ({ ctx: { db } }) => {
    await db.game.deleteMany();
    return true;
  }),
});
