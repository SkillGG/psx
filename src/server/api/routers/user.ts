import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { loginProcedure, USER_COOKIE } from "../auth";
import { hash, randomString } from "~/utils/utils";
import { serialize as serializeCookie } from "cookie";

import { SERVER_ERRS } from "~/utils/server_errors";
import type { PrismaClient } from "@prisma/client";

type ResultOrErr<T = undefined> = Promise<
  T | { err: (typeof SERVER_ERRS)[keyof typeof SERVER_ERRS] }
>;

const aYear = () => 60 * 60 * 24 * 365;

const nextYear = (now?: Date) =>
  new Date((now ?? new Date()).getTime() + 1000 * aYear());

const createUserSessionObject = () => {
  return {
    token: randomString(32),
    maxAge: aYear(),
  };
};

const createUserSession = async (db: PrismaClient, userid: string) => {
  return await db.session.create({
    data: { ...createUserSessionObject(), userId: userid },
  });
};

const setTokenCookie = (h: Headers, token: string, time?: Date) => {
  h.append(
    "Set-Cookie",
    serializeCookie(USER_COOKIE, token, {
      expires: nextYear(time),
    }),
  );
};

export const userRouter = createTRPCRouter({
  getData: loginProcedure.query(({ ctx: { user } }) => {
    return {
      user,
    };
  }),
  register: publicProcedure
    .input(z.object({ login: z.string(), pass: z.string(), email: z.string() }))
    .mutation(async ({ input: { login, pass, email }, ctx }): ResultOrErr => {
      if (
        !login ||
        !/^[a-z0-9!@#$%^&*()_+\-=\{\}\[\];':",.<>\\\|`~]+$/i.exec(login)
      )
        return { err: SERVER_ERRS.INVALID_USERNAME };

      if (!pass) return { err: SERVER_ERRS.INVALID_PASSWORD };

      if (pass.length < 8) return { err: SERVER_ERRS.PASSWORD_TOO_SHORT };

      if (!/[a-z0-9!@#$%^&*()_+\-=\{\}\[\];':",.<>\\|`~]{8,}/i.exec(pass))
        return { err: SERVER_ERRS.PASSWORD_WITH_INVALID_CHARACTERS };

      if (!email || !z.string().email().safeParse(email).success)
        return { err: SERVER_ERRS.INVALID_EMAIL };

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

      await ctx.db.user.create({
        include: {
          Session: true,
        },
        data: {
          email,
          nick: login,
          password,
          salt,
        },
      });
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.resHeaders.set(
      "Set-Cookie",
      serializeCookie(USER_COOKIE, "", { maxAge: 1 }),
    );
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

      setTokenCookie(ctx.resHeaders, session.token, session.date);
    }),
});
