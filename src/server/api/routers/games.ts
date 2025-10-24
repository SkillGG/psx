import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { Game } from "@prisma/client";
import { adminProcedure } from "../auth";
import { queryGames } from "~/utils/gameQueries";

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

const SortSchema = z.partialRecord(
  QueryColumn,
  z.object({
    priority: z.number(),
    sort: z.enum(["asc", "desc"]),
  }),
);
export type SortSchema = z.infer<typeof SortSchema>;

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

          const parent = await ctx.db.game.update({
            data: {
              subgames: { delete: { id } },
            },
            select: {
              subgames: true,
              id: true,
            },
            where: { id: game.parent_id },
          });

          console.log(`Removed`, game, `from`, parent);

          if (parent.subgames.length === 0)
            await ctx.db.game.delete({ where: { id: parent.id } });

          return { ok: true };
        }

        const parent = await ctx.db.game.findFirst({
          where: { id: parent_id },
        });

        if (!parent) {
          return { err: `Parent with ID ${parent_id} does not exist!` };
        }

        await ctx.db.game.upsert({
          create: {
            ...parent,
            id: parent.id + "_agg",
            parent_id: null,
            subgames: { connect: [{ id: parent.id }, { id }] },
          },
          update: {
            subgames: { connect: { id } },
          },
          where: {
            id: parent.id + "_agg",
          },
        });

        return { ok: true };
      },
    ),
});
