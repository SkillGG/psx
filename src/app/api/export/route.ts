import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

const handler = async function GET() {
  const cks = await cookies();
  const token = cks.get("userToken");

  try {
    if (!token?.value) {
      throw new Error();
    }
    const user = await db.user.findFirst({
      where: {
        Session: {
          some: {
            token: token.value,
          },
        },
      },
    });
    if (!user) throw new Error();
    if (user.status !== "ADMIN") throw new Error();
  } catch (e) {
    void e; // avoid unused args linter rule
    return new Response("UNAUTHORIZED", {
      status: 403,
      statusText: "UNAUTHORIZED",
    });
  }

  const games = await db.game.findMany();
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append(
    "Content-Disposition",
    'attachment; filename="gameExport.json"',
  );

  return NextResponse.json(games, {
    headers,
  });
};

export { handler as GET, handler as POST };
