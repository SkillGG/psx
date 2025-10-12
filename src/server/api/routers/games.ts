import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { PrismaClient } from "@prisma/client";
import type { Game } from "@prisma/client";
import { usergames } from "@prisma/client/sql";

const getGames = async (
  db: PrismaClient,
  userID?: string,
  [skip, take] = [0, 100],
): Promise<Game[]> => {
  const select = {
    id: true,
    console: true,
    title: true,
  };

  if (!userID) return await db.game.findMany({ select, skip, take });

  const games = await db.$queryRawTyped(usergames(userID, take, skip));

  return games;
};

export const gameRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input }) => {
      const games = await getGames(ctx.db, input);
      return games;
    }),
});
