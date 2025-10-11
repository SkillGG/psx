import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { authProcedure, USER_COOKIE } from "../auth";
import { hash, randomString } from "~/utils/utils";
import { serialize as serializeCookie } from "cookie";

import { Temporal } from "temporal-polyfill";
import { SERVER_ERRS } from "~/utils/server_errors";
import type { PrismaClient } from "@prisma/client";

type ResultOrErr<T = undefined> = Promise<
  T | { err: (typeof SERVER_ERRS)[keyof typeof SERVER_ERRS] }
>;

const createUserSession = async (db: PrismaClient, userid: string) => {
  return await db.session.create({
    data: {
      token: randomString(32),
      maxAge: Temporal.Duration.from("p1y").milliseconds,
      user: {
        connect: {
          id: userid,
        },
      },
    },
  });
};

const setTokenCookie = (h: Headers, token: string) => {
  h.append(
    "Set-Cookie",
    serializeCookie(USER_COOKIE, token, {
      expires: new Date(
        Temporal.Now.instant().add(
          Temporal.Duration.from("p1y"),
        ).epochMilliseconds,
      ),
    }),
  );
};

export const userRouter = createTRPCRouter({
  getData: authProcedure.query(({ ctx: { user } }) => {
    return { user: { nick: user.nick, email: user.email, id: user.id } };
  }),
  register: publicProcedure
    .input(z.object({ login: z.string(), pass: z.string(), email: z.string() }))
    .mutation(async ({ input: { login, pass, email }, ctx }): ResultOrErr => {
      const user = await ctx.db.user.findFirst({
        where: {
          OR: [
            {
              nick: login,
            },
            { email },
          ],
        },
      });

      if (user) {
        if (user.email === email)
          return { err: SERVER_ERRS.USER_WITH_MAIL_EXISTS };
        if (user.nick === login)
          return { err: SERVER_ERRS.USER_WITH_LOGIN_EXISTS };
        return { err: SERVER_ERRS.USER_EXISTS };
      }

      const { hash: password, salt } = await hash(pass, [email, login]);

      const newUser = await ctx.db.user.create({
        data: {
          email,
          nick: login,
          password,
          salt,
        },
      });

      const session = await createUserSession(ctx.db, newUser.nick);
      setTokenCookie(ctx.resHeaders, session.token);
    }),
  login: publicProcedure
    .input(z.object({ login: z.string(), pass: z.string() }))
    .mutation(async ({ input: { login, pass }, ctx }): ResultOrErr => {
      const userInDB = await ctx.db.user.findFirst({
        where: {
          OR: [
            {
              nick: login,
            },
            { email: login },
          ],
        },
        select: {
          password: true,
          salt: true,
          nick: true,
          id: true,
          Session: true,
        },
      });

      if (!userInDB) return { err: SERVER_ERRS.INVALID_USERNAME_OR_PASSWORD };

      // checkPassword
      const pubPass = await hash(pass, userInDB);

      if (pubPass.hash !== userInDB.password) {
        return { err: SERVER_ERRS.INVALID_USERNAME_OR_PASSWORD };
      }

      // create session
      const session = await createUserSession(ctx.db, userInDB.id);

      setTokenCookie(ctx.resHeaders, session.token);
    }),
});
