import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { Game, PrismaClient } from "@prisma/client";
import { adminProcedure, userProcedure } from "../auth";
import { queryGames } from "~/utils/gameQueries";
import { isNotNull } from "~/utils/utils";

const ConsoleType = z.enum(["PS1", "PS2", "PSP"]);
const RegionType = z.enum(["PAL", "NTSC", "NTSCJ"]);

const GameData = z.object({
  id: z.string(),
  title: z.string(),
  console: ConsoleType,
  region: RegionType,
  parent_id: z.string().nullable().optional(),
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

        if (!parent_id) {
          // remove parent from id

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

        const pid = parent_id.replace(/_agg/g, "");

        const parent = await ctx.db.game.findFirst({
          where: {
            OR: [{ id: pid + "_agg" }, { id: pid }],
          },
        });

        if (parent?.id.endsWith("_agg")) {
          // we found the aggregate
          await ctx.db.game.update({
            where: {
              id,
            },
            data: {
              parent_id: parent.id,
            },
          });
          return { ok: true };
        }

        if (!parent) {
          return {
            err: `No parent or aggregate with ID ${pid} exists!`,
          };
        }

        await ctx.db.game.upsert({
          create: {
            console: parent.console,
            region: parent.region,
            title: parent.title,
            id: pid + "_agg",
            parent_id: null,
            parent: undefined,
            subgames: { connect: [{ id: pid }, { id }] },
          },
          update: {
            subgames: { connect: { id } },
          },
          where: {
            id: pid + "_agg",
          },
        });

        return { ok: true };
      },
    ),
});
