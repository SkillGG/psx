import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { Game, PrismaClient } from "@prisma/client";
import { adminProcedure, userProcedure } from "../auth";
import { queryGames } from "~/utils/gameQueries";
import { isNotNull } from "~/utils/utils";

import chalk from "chalk";

const ConsoleType = z.enum(["PS1", "PS2", "PSP", "NA"]);
const RegionType = z.enum(["PAL", "NTSC", "NTSCJ", "NA"]);

const GameData = z.object({
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
        subgames: {
          some: {
            parent_id: {
              not: null,
            },
          },
        },
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

  console.log("Orphaned parents found!", orphanedParents);

  if (orphanedParents.length) {
    console.log(
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
        if (q.parent_id) console.log("GAME WITHN PARENT ID", q);
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
  group: adminProcedure
    .input(
      z.object({
        games: z.array(z.string()),
        title: z.string(),
        aggId: z.string(),
      }),
    )
    .mutation(
      async ({
        ctx: { db },
        input: { aggId, games, title },
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

        const newID = aggId.endsWith("_agg") ? aggId : aggId + "_agg";

        if (nonSingleGame) {
          return {
            err: "There are games in the list that already have a parent!",
          };
        }

        await db.game.create({
          data: {
            console: "NA",
            id: newID,
            region: "NA",
            title,
            subgames: { connect: games.map((q) => ({ id: q })) },
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

        console.log(
          chalk.blue(`Reparenting `),
          id,
          chalk.blue(" to be under: "),
          parent_id,
        );

        if (!parent_id) {
          // remove parent from id

          console.log(
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
          console.log(
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

        console.log(
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
          console.log(chalk.yellow("There is a parent!"));

          await ctx.db.game.update({
            where: {
              id: kid.parent.id,
            },
            data: {
              subgames: { connect: { id } },
            },
          });
        } else {
          console.log(chalk.red("There is no parent! Creating one!"));
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
