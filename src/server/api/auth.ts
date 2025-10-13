import { TRPCError } from "@trpc/server";
import { publicProcedure } from "./trpc";
import type { PrismaClient } from "@prisma/client";

export const USER_COOKIE = "userToken";

const fetchUser = async (db: PrismaClient, token: string) => {
  const user = await db.user.findFirst({
    select: {
      id: true,
      nick: true,
      email: true,
      status: true,
    },
    where: {
      Session: {
        some: {
          token,
        },
      },
    },
  });
  return user;
};

/** Procedure used in login. {@link userProcedure} that doesn't throw if there is no user cookie or user doesn't exist */
export const loginProcedure = publicProcedure.use(async (opts) => {
  const userCookie = opts.ctx.cookies[USER_COOKIE];
  const user = userCookie ? await fetchUser(opts.ctx.db, userCookie) : null;
  return opts.next({
    ...opts,
    ctx: {
      ...opts.ctx,
      user,
    },
  });
});

/** User-authorized procedure. This procedure will throw if userCookie is not defined or user doesn't exist */
export const userProcedure = publicProcedure.use(async (opts) => {
  const userCookie = opts.ctx.cookies[USER_COOKIE];
  if (!userCookie) throw new TRPCError({ code: "UNAUTHORIZED" });
  const user = await fetchUser(opts.ctx.db, userCookie);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return opts.next({
    ...opts,
    ctx: {
      ...opts.ctx,
      user,
    },
  });
});

export const adminProcedure = userProcedure.use(async (opts) => {
  if (opts.ctx.user.status !== "ADMIN")
    throw new TRPCError({ code: "UNAUTHORIZED" });
  return opts.next();
});
