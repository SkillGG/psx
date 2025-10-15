import type { Console, Game } from "@prisma/client";
import { z } from "zod/v4";
import { zodStringToJson } from "~/utils/utils";

const transformFile = (file: unknown): Game[] => {
  return [];
};

const GameList = z.array(z.string());
type GameList = z.infer<typeof GameList>;

const parseFile = (file: string): GameList => {
  const isJSON = zodStringToJson.safeParse(file);
  if (!isJSON.success)
    throw new Error("File doesn't contain json information!");

  const data = isJSON.data;

  const gameList = GameList.safeParse(data);

  if (!gameList.success)
    throw new Error("File doesn't contain the right values!");

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
): Promise<Game[] | undefined> => {
  const file = await loadFile().catch((err: Error) => {
    console.log(err.message);
    return null;
  });
  if (!file) {
    return undefined;
  }

  const data = parseFile(file);

  console.log("got data", data);

  return;
};
