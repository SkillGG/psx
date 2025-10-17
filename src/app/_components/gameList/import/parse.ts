import type { Console, Game, Region } from "@prisma/client";
import { z } from "zod/v4";
import { zodStringToJson } from "~/utils/utils";

const regionMap = {
  ntsc: "NTSC",
  pal: "PAL",
  ntscj: "NTSCJ",
  ntscu: "NTSC",
} satisfies Record<string, Region>;

export type GameData = {
  data: (Game & { key: string })[];
  warns: {
    data: Partial<Record<keyof Game, string | undefined>> & { key: string };
    message: string;
    potentialFixes?: { label: string; resolve: (data: GameData) => GameData }[];
  }[];
};

const fixIgnore = (
  key: string,
): NonNullable<GameData["warns"][number]["potentialFixes"]>[number] => ({
  label: "Ignore",
  resolve: (d: GameData) => {
    return { ...d, warns: d.warns.filter((q) => q.data.key !== key) };
  },
});

const transformFile = (data: GameList, defConsole: Console) => {
  const ret: GameData = { data: [], warns: [] };
  let i = 1;
  for (const q of data) {
    const key = `importgame_${i++}`;
    const title = "title" in q ? q.title : q.name;
    const region = regionMap[q.region];
    const console = q.console ?? defConsole;
    if (!title || !q.id || !region) {
      ret.warns.push({
        data: {
          key,
          id: q.id,
          console: defConsole,
          region: q.region,
          title: title,
        },
        message: !title
          ? "Record with no title"
          : !q.id
            ? "Record with no ID"
            : "Invalid Region",
        potentialFixes: [fixIgnore(key)],
      });
      continue;
    }
    const sIDRx = /^([^-]*)\-([^-]*)$/gi;
    if (!sIDRx.exec(q.id)) {
      ret.warns.push({
        data: {
          key,
          id: q.id,
          title,
          console,
          region,
        },
        message: "Multiple IDs found!",
        potentialFixes: [
          fixIgnore(key),
          {
            label: "Fix ID",
            resolve: (d) => {
              const newID = prompt(`Pick a new ID\n${q.id}`, q.id);
              if (newID && sIDRx.exec(newID)) {
                // setNewID

                if (!ret.data.find((q) => q.id === newID)) {
                  // check if ID exists
                  alert("Successfully fixed ID");
                  return {
                    ...fixIgnore(key).resolve(d),
                    data: [
                      ...d.data,
                      {
                        console,
                        id: newID,
                        key,
                        region,
                        title,
                      },
                    ],
                  };
                } else {
                  alert("Game with this ID already exists!");
                  return d;
                }
              } else return d;
            },
          },
        ],
      });
      continue;
    }
    if (
      [...ret.data, ...ret.warns.map((q) => q.data)].find((d) => d.id === q.id)
    ) {
      ret.warns.push({
        data: {
          title,
          id: q.id,
          region: q.region,
          console: q.console,
          key,
        },
        message: `Game with this ID already exists!`,
        potentialFixes: [
          fixIgnore(key),
          {
            label: "Swap",
            resolve: (d: GameData) => {
              return {
                warns: d.warns.filter((q) => q.data.key !== key),
                data: d.data.map((inD) =>
                  inD.id === q.id
                    ? {
                        title,
                        id: q.id,
                        region,
                        console,
                        key: inD.key,
                      }
                    : inD,
                ),
              };
            },
          },
        ],
      });
      continue;
    }
    ret.data.push({
      key,
      id: q.id,
      title,
      console,
      region,
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
  if (!isJSON.success) throw new Error("File is not a valid JSON file!");

  const data = isJSON.data;

  const gameList = GameList.safeParse(data);

  if (!gameList.success) {
    console.error("Zod error parsing file!", gameList.error);
    throw new Error(
      "File doesn't have the correct data structure!",
      gameList.error,
    );
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
  const file = await loadFile();
  if (!file) {
    return null;
  }

  const data = parseFile(file);

  const gameData = transformFile(data, consoleType);

  return gameData;
};
