import type { Console, Game, Region } from "@prisma/client";
import { z } from "zod/v4";
import { isNotNull, zodStringToJson } from "~/utils/utils";

const regionMap = {
  ntsc: "NTSC",
  pal: "PAL",
  ntscj: "NTSCJ",
  ntscu: "NTSC",
} satisfies Record<string, Region>;

type GameData = {
  data: Game[];
  warns: {
    data: Partial<Record<keyof Game, string | undefined>>;
    message: string;
  }[];
};

const transformFile = (data: GameList, defConsole: Console) => {
  const ret: GameData = { data: [], warns: [] };
  for (const q of data) {
    const title = "title" in q ? q.title : q.name;
    if (!title || !q.id || !regionMap[q.region]) {
      ret.warns.push({
        data: { id: q.id, console: defConsole, region: q.region, title: title },
        message: "Incomplete Game Object",
      });
      return null;
    }
    ret.data.push({
      id: q.id,
      title,
      console: q.console ?? defConsole,
      region: regionMap[q.region],
    });
  }
  return ret;
};

const GameObject = z
  .object({
    id: z.string(),
    region: z.enum(["pal", "ntsc", "ntscj", "ntscu"], {
      error: (iss) => `Invalid region: '${iss.input as string}'`,
    }),
    console: z.enum(["PSP", "PS1", "PS2"]).optional(),
  })
  .and(z.object({ title: z.string() }).or(z.object({ name: z.string() })));

const GameList = z.array(GameObject);

type GameList = z.infer<typeof GameList>;

const parseFile = (file: string): GameList => {
  const isJSON = zodStringToJson.safeParse(file);
  if (!isJSON.success)
    throw new Error("File doesn't contain json information!");

  const data = isJSON.data;

  const gameList = GameList.safeParse(data);

  if (!gameList.success) {
    console.error("Zod error parsing file!", gameList.error);
    throw new Error("File doesn't contain the right values!", gameList.error);
  }

  return gameList.data;
};

const loadFile = async (): Promise<string> => {
  const loader = document.createElement("input");

  loader.type = "file";

  return new Promise((ret, rej) => {
    loader.oncancel = () => {
      rej(new Error("User canceled"));
    };
    loader.onchange = async () => {
      const sFile = loader.files?.[0];
      if (!sFile) {
        return rej(new Error("Cannot acces the file!"));
      }
      const text = await sFile.text();
      if (text) return ret(text);
      rej(new Error("File is empty!"));
    };
    loader.click();
  });
};

export const importGamesFromJson = async (
  consoleType: Console,
): Promise<GameData | null> => {
  const file = await loadFile().catch((err: Error) => {
    console.log(err.message);
    return null;
  });
  if (!file) {
    return null;
  }

  const data = parseFile(file);

  const gameData = transformFile(data, consoleType);

  return gameData;
};
