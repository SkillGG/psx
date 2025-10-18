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

const isSafeID = (id: string) => {
  return id.split("-").length === 2 && !!/[a-z]/gi.exec(id.charAt(0));
};

const transformFile = (data: GameList, defConsole: Console) => {
  const ret: GameData = { data: [], warns: [] };
  let i = 1;
  for (const { id: cID, region: cR, console: cC, ...q } of data) {
    const cur: Game & { key: string } = {
      console: cC ?? defConsole,
      id: cID.trim(),
      key: `importgame_${i++}`,
      title: "title" in q ? q.title.trim() : q.name.trim(),
      region: regionMap[cR],
    };

    if (!cur.title || !cur.id || !cur.region) {
      ret.warns.push({
        data: cur,
        message: !cur.title
          ? "Record with no title"
          : !cur.id
            ? "Record with no ID"
            : "Invalid Region",
        potentialFixes: [fixIgnore(cur.key)],
      });
      continue;
    }
    if (!isSafeID(cur.id)) {
      ret.warns.push({
        data: cur,
        message: "Multiple IDs found!",
        potentialFixes: [
          fixIgnore(cur.key),
          {
            label: "New ID", // The games are indentical, just this version should have different ID bc its different lang/edition
            resolve: (d) => {
              const newID = prompt(`Pick a new ID\n${cur.id}`, cur.id);
              if (!newID || !isSafeID(newID)) return d;
              if (!ret.data.find((q) => q.id === newID)) {
                // check if ID exists
                alert("Successfully fixed ID");
                return {
                  ...fixIgnore(cur.key).resolve(d), // remove the warn
                  data: [
                    // add with newID and sort the data
                    ...d.data,
                    {
                      ...cur,
                      id: newID,
                    },
                  ].toSorted(({ key: k1 }, { key: k2 }) =>
                    k1.localeCompare(k2),
                  ),
                };
              } else {
                alert("Game with this ID already exists!");
                return d;
              }
            },
          },
          {
            label: "Split IDs",
            resolve: (d) => {
              let n = Number(prompt(`How many IDs?\n${cur.id}`));
              if (isNaN(n) || !isFinite(n) || n <= 0) return d;
              let gN = 1;
              const puts: GameData["data"][number][] = [];
              while (n > 0) {
                const header = `======GAME ${gN}======\n`;
                const nID = prompt(`${header}ID\n(${cur.id})`, cur.id);
                if (!nID || !isSafeID(nID)) return d;
                const nTitle = prompt(
                  `${header}Title:\n${cur.title}`,
                  cur.title,
                );
                if (!nTitle) return d;
                const nRegion = prompt(
                  `${header}Region:\n${cur.region}`,
                  cur.region,
                )?.toLowerCase() as keyof typeof regionMap | undefined;
                if (!nRegion || !regionMap[nRegion]) return d;

                // puts it in the file
                puts.push({
                  ...cur,
                  title: nTitle,
                  id: nID,
                  key: `${cur.key}_${gN}`,
                  region: regionMap[nRegion],
                });
                n--;
                gN++;
              }

              return {
                ...d,
                data: d.data
                  .concat(puts)
                  .toSorted(({ key: k1 }, { key: k2 }) => k1.localeCompare(k2)),
              };
            },
          },
        ],
      });
      continue;
    }
    if (
      [...ret.data, ...ret.warns.map((q) => q.data)].find(
        (d) => d.id === cur.id,
      )
    ) {
      ret.warns.push({
        data: cur,
        message: `Game with this ID already exists!`,
        potentialFixes: [
          fixIgnore(cur.key),
          {
            label: "Swap",
            resolve: (d: GameData) => {
              return {
                warns: d.warns.filter((q) => q.data.key !== cur.key),
                data: d.data.map((inD) =>
                  inD.id === cur.id
                    ? {
                        ...cur,
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
    ret.data.push(cur);
  }

  ret.data.sort(({ key: k1 }, { key: k2 }) => k1.localeCompare(k2));
  ret.warns.sort(({ data: { key: k1 } }, { data: { key: k2 } }) =>
    k1.localeCompare(k2),
  );

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
