import { publicProcedure } from "./trpc";

export const USER_COOKIE = "userToken";

export const authProcedure = publicProcedure.use(async (opts) => {
  const cookies: typeof opts.ctx.cookies = {};
  const cookieFilter = { disallow: [/^__next/] } as const;
  for (const [k, v] of Object.entries(opts.ctx.cookies)) {
    if (
      !cookieFilter.disallow.some((v) => {
        return !!v.exec(k);
      })
    ) {
      cookies[k] = v;
    }
  }

  const userCookie = cookies[USER_COOKIE];

  const db = opts.ctx.db;

  if (userCookie) {
    const user = await db.user.findFirst({
      where: {
        Session: {
          some: {
            token: {
              equals: userCookie,
            },
          },
        },
      },
    });

    console.log("Cookie user", user);

    if (user) {
      return opts.next({
        ctx: {
          ...opts.ctx,
          user,
        },
      });
    }
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      cookies,
    },
  });
});
