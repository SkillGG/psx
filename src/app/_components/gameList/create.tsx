import type { Console, Region } from "@prisma/client";
import type React from "react";
import { useState } from "react";
import { api } from "~/trpc/react";
import { cn } from "~/utils/utils";
import { ImportJSONDialog } from "./import";

export const NewGameCreationForm = ({
  closeDialog,
}: {
  closeDialog: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [id, setID] = useState("");
  const [region, setRegion] = useState<Region>("PAL");
  const [consoleType, setConsole] = useState<Console>("PS2");

  const createGame = api.games.addSingle.useMutation();
  const utils = api.useUtils();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        console.log("data", title, id, region, consoleType);

        if (!e.currentTarget.checkValidity()) {
          console.log("Invalid!");
        }

        await createGame.mutateAsync({
          game: {
            console: consoleType,
            id,
            region,
            title,
          },
        });

        await utils.games.list.invalidate();
      }}
    >
      <h3 className="text-center text-xl">Insert new game data</h3>
      <label>
        <div>ID:</div>
        <input
          value={id}
          required
          pattern="[A-Z]{4,}-\d+"
          placeholder={"Game ID"}
          onChange={(e) => setID(e.currentTarget.value)}
        />
      </label>
      <label>
        <div>Title:</div>
        <input
          required
          value={title}
          placeholder={"Game title"}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
      </label>
      <div>
        <div>Console ({consoleType}):</div>
        <div className="flex justify-around gap-2">
          {(["PS1", "PS2", "PSP"] as Console[]).map((con) => {
            return (
              <label
                key={`select_console${con}`}
                data-console={con}
                className={cn(
                  "rounded-full border-2 px-2 py-1",
                  consoleType === con &&
                    "border-(--success-600) text-(--success-500)",
                )}
              >
                {con}
                <input
                  name="console"
                  defaultChecked={con === "PS2" ? true : false}
                  type="radio"
                  className="hidden"
                  value={consoleType}
                  onChange={() => {
                    setConsole(con);
                  }}
                />
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <div>Region ({region}):</div>
        <div className="flex justify-around gap-2">
          {(["PAL", "NTSC", "NTSCJ"] as Region[]).map((reg) => {
            return (
              <label
                key={`select_region${reg}`}
                data-console={reg}
                className={cn(
                  "rounded-full border-2 px-2 py-1",
                  region === reg &&
                    "border-(--success-600) text-(--success-500)",
                )}
              >
                {reg}
                <input
                  name="region"
                  defaultChecked={reg === "PAL" ? true : false}
                  type="radio"
                  className="hidden"
                  value={region}
                  onChange={() => {
                    setRegion(reg);
                  }}
                />
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex justify-around gap-2">
        <button
          type="submit"
          className={cn(
            "cursor-pointer rounded-lg border-1 border-(--button-submit-bg)",
            "px-2 py-1 hover:border-(--button-submit-hover-bg)",
            "hover:backdrop-brightness-(--bg-hover-brightness)",
            "text-(--button-submit-nobg-text)",
          )}
        >
          Add
        </button>
        <ImportJSONDialog consoleType={consoleType} />
        <button
          onClick={() => {
            closeDialog();
          }}
          type="button"
          className={cn(
            "cursor-pointer rounded-lg border-1 border-(--button-remove-bg)",
            "px-2 py-1 hover:border-(--button-remove-hover-bg)",
            "text-(--button-remove-nobg-text)",
            "hover:backdrop-brightness-(--bg-hover-brightness)",
          )}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
