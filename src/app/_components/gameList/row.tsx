"use client";

import type { Console, Game, Region } from "@prisma/client";
import type { ClassValue } from "clsx";
import React, { Fragment, useEffect, useState, type ReactNode } from "react";
import { cn } from "~/utils/utils";
import { isSafeID } from "./import/parse";
import type { GameWithOwn, GameWithSubs } from "~/utils/gameQueries";

type Strings =
  | { game: GameWithOwn | GameWithSubs; gameType: "single" | "parent" | "sub" }
  | { raw: Partial<Record<keyof GameWithOwn, string>> };

type Issue = {
  field: keyof Game | "unknown";
  message: string;
};

const validateGameData = (
  g?: Omit<Game, "parent_id">,
): { success: true } | { issues: Issue[]; success: false } => {
  if (!g)
    return {
      issues: [{ field: "unknown", message: "Empty game data!" }],
      success: false,
    };

  const issues: Issue[] = [];

  if (!isSafeID(g.id))
    issues.push({ field: "id", message: "Invalid Game ID!" });

  if (!["PS1", "PS2", "PSP"].includes(g.console))
    issues.push({ field: "console", message: "Invalid console!" });

  if (!["PAL", "NTSC", "NTSCJ"].includes(g.region))
    issues.push({ field: "region", message: "Invalid region!" });

  if (!g.title) issues.push({ field: "title", message: "Empty title!" });

  if (issues.length > 0) return { issues, success: false };
  return { success: true };
};

export const GameRow = ({
  classNames,
  toggle,
  onEdit,
  ...props
}: Strings & {
  toggle?: ReactNode;
  onEdit?: (prevID: GameWithOwn, game: GameWithOwn) => void;
  classNames?: {
    view?: Partial<Record<keyof GameWithOwn, ClassValue>> & {
      all?: ClassValue;
    };
    edit?: Partial<Record<keyof GameWithOwn, ClassValue>> & {
      all?: ClassValue;
    };
  };
}) => {
  const strings = "game" in props ? props.game : props.raw;

  const game: GameWithOwn | null =
    "game" in props
      ? {
          ...props.game,
          parent_id: "parent_id" in props.game ? props.game.parent_id : null,
        }
      : null;

  const [mode, setMode] = useState<"view" | "edit">("view");

  const [editValues, setEditValues] = useState<Omit<
    GameWithOwn,
    "parent_id"
  > | null>(game ? { ...game } : null);

  const isAggregate = game?.id.endsWith("_agg");

  const gameType = "gameType" in props ? props.gameType : "single";

  useEffect(() => {
    if (mode === "edit") {
      function exitEditOnEscape({ code }: KeyboardEvent) {
        if (code === "Escape") {
          setMode("view");
        }
      }
      window.addEventListener("keydown", exitEditOnEscape);
      return () => {
        window.removeEventListener("keydown", exitEditOnEscape);
      };
    }
  }, [mode]);

  if (mode === "view" || !game || !editValues) {
    if (isAggregate)
      return (
        <Fragment key={`gameaggregate_${strings.id}`}>
          <div className="hidden"></div>
          <div className="hidden"></div>
          <div className="hidden"></div>
          <div
            className={cn(
              "col-span-4 flex",
              game?.owns && "font-extrabold underline",
              classNames?.view?.all,
            )}
            data-value={strings.title}
          >
            <div className="mr-auto flex flex-col" title={"Show entries"}>
              {toggle}
            </div>

            <span className={cn("flex-1 text-center", classNames?.view?.title)}>
              {strings.title}
            </span>
            {onEdit && editValues && (
              <button
                className="h-12 basis-16 cursor-pointer px-2 py-1"
                onClick={() => {
                  setMode(mode === "view" ? "edit" : "view");
                }}
              >
                Edit
              </button>
            )}
          </div>
        </Fragment>
      );
    return (
      <Fragment key={"gamerow_" + strings.id}>
        <div
          className={cn(
            "col-1 flex",
            classNames?.view?.all,
            classNames?.view?.id,
          )}
          data-value={strings.id}
        >
          <div className="mr-auto flex flex-col">{toggle}</div>
          <div
            className={cn(
              "flex-1 text-center",
              game?.owns && "font-extrabold underline",
            )}
          >
            {strings.id}
          </div>
        </div>
        <div
          className={cn(
            "col-2 flex",
            classNames?.view?.all,
            classNames?.view?.console,
          )}
          data-value={strings.console}
        >
          {strings.console}
        </div>
        <div
          className={cn(
            "col-3 flex",
            classNames?.view?.all,
            classNames?.view?.region,
          )}
          data-value={strings.region}
        >
          {strings.region}
        </div>
        <div
          className={cn(
            "col-4 flex",
            game?.owns && "font-extrabold underline",
            classNames?.view?.all,
          )}
          data-value={strings.title}
        >
          <span className={cn("flex-1 text-center", classNames?.view?.title)}>
            {strings.title}
          </span>
          {onEdit && editValues && (
            <button
              className="h-12 basis-16 cursor-pointer px-2 py-1"
              onClick={() => {
                setMode(mode === "view" ? "edit" : "view");
              }}
            >
              Edit
            </button>
          )}
        </div>
      </Fragment>
    );
  }

  const saveData = () => {
    const valid = validateGameData(editValues ?? null);
    if (valid.success) {
      onEdit?.(game, {
        console: editValues.console,
        id: editValues.id,
        region: editValues.region,
        title: editValues.title,
        parent_id: game.parent_id,
      });
      setMode("view");
    } else {
      // set errros
      alert(
        `Issues saving!\n${valid.issues.map((q) => "- " + q.message).join("\n")}`,
      );
    }
  };

  if (isAggregate) {
    return (
      <Fragment key={`edit_gameaggregate_${strings.id}`}>
        <div className="hidden"></div>
        <div className="hidden"></div>
        <div className="hidden"></div>
        <div
          className={cn("col-span-4 flex", classNames?.edit?.all)}
          data-value={strings.title}
        >
          <input
            className={cn("w-full flex-1", classNames?.edit?.title)}
            value={editValues.title}
            onChange={({ currentTarget: { value: title } }) => {
              setEditValues((p) => (!p ? p : { ...p, title }));
            }}
            onKeyDown={({ code }) => {
              if (code === "Enter") saveData();
            }}
          />
          <div className="flex h-12 basis-16 flex-col">
            <button
              className="cursor-pointer border-b-1 px-2 py-1 text-xs text-(--regular-text)"
              onClick={saveData}
            >
              Save
            </button>
            <button
              className="cursor-pointer px-2 py-1 text-xs text-(--regular-text)"
              onClick={() => {
                setEditValues(game);
                setMode("view");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment key={"edit_gamerow_" + strings.id}>
      <div
        className={cn("col-1 flex gap-2 px-2", classNames?.edit?.all)}
        data-value={strings.id}
      >
        <div className="mr-auto flex flex-col">
          {toggle}
          {gameType === "sub" && (
            <button
              className={cn(
                "cursor-pointer rounded-xl border-1 px-2 text-(--color-red-500)",
                "hover:brightness-(--bg-hover-brightness)",
              )}
              onClick={() => {
                onEdit?.(game, { ...game, parent_id: null });
              }}
            >
              R
            </button>
          )}
          {gameType === "single" && (
            <button
              className={cn(
                "cursor-pointer rounded-xl border-1 px-2 text-(--color-green-500)",
                "hover:brightness-(--bg-hover-brightness)",
              )}
              onClick={() => {
                // add to a parent
                const newID = prompt("Parent's ID:", game.id);
                if (!newID || !isSafeID(newID)) return;

                onEdit?.(game, { ...game, parent_id: newID });
              }}
            >
              P
            </button>
          )}
        </div>
        <div className="flex-1 text-center">
          <input
            className={cn(
              "w-full border-b-1 border-dashed",
              classNames?.edit?.id,
            )}
            value={editValues.id}
            onChange={({ currentTarget: { value: id } }) => {
              setEditValues((p) => (!p ? p : { ...p, id }));
            }}
            onKeyDown={({ code }) => {
              if (code === "Enter") saveData();
            }}
          />
        </div>
      </div>
      <div
        className={cn("col-2 flex", classNames?.edit?.all)}
        data-value={strings.console}
      >
        <select
          className={cn(
            "r-select w-full cursor-pointer bg-transparent",
            classNames?.edit?.console,
          )}
          onChange={({ currentTarget: { value: console } }) => {
            const guard = (s: string): s is Console =>
              ["PS1", "PS2", "PSP"].includes(s);
            if (guard(console))
              setEditValues((p) => (!p ? p : { ...p, console }));
          }}
          value={editValues.console}
        >
          <option
            className="cursor-pointer rounded-none bg-(--dialog-bg) hover:bg-(--dialog-bg)/80"
            value="PS1"
          >
            PS1
          </option>
          <option
            className="cursor-pointer rounded-none bg-(--dialog-bg) hover:bg-(--dialog-bg)/80"
            value="PS2"
          >
            PS2
          </option>
          <option
            className="cursor-pointer rounded-none bg-(--dialog-bg) hover:bg-(--dialog-bg)/80"
            value="PS3"
          >
            PSP
          </option>
        </select>
      </div>
      <div
        className={cn("col-3 flex", classNames?.edit?.all)}
        data-value={strings.region}
      >
        <select
          className={cn(
            "r-select w-full cursor-pointer bg-transparent",
            classNames?.edit?.region,
          )}
          value={editValues.region}
          onChange={({ currentTarget: { value: region } }) => {
            const guard = (s: string): s is Region =>
              ["PAL", "NTSC", "NTSCJ"].includes(s);
            if (guard(region))
              setEditValues((p) => (!p ? p : { ...p, region }));
          }}
        >
          <option
            className="cursor-pointer rounded-none bg-(--dialog-bg) hover:bg-(--dialog-bg)/80"
            value="PAL"
          >
            PAL
          </option>
          <option
            className="cursor-pointer rounded-none bg-(--dialog-bg) hover:bg-(--dialog-bg)/80"
            value="NTSC"
          >
            NTSC
          </option>
          <option
            className="cursor-pointer rounded-none bg-(--dialog-bg) hover:bg-(--dialog-bg)/80"
            value="NTSCJ"
          >
            NTSC-J
          </option>
        </select>
      </div>
      <div
        className={cn("col-4 flex gap-2 pl-2", classNames?.edit?.all)}
        data-value={strings.title}
      >
        <input
          className={cn(
            "w-full flex-1 border-b-1 border-dashed",
            classNames?.edit?.title,
          )}
          value={editValues.title}
          onChange={({ currentTarget: { value: title } }) => {
            setEditValues((p) => (!p ? p : { ...p, title }));
          }}
          onKeyDown={({ code }) => {
            if (code === "Enter") saveData();
          }}
        />
        <div className="flex h-12 basis-16 flex-col">
          <button
            className="cursor-pointer border-b-1 px-2 py-1 text-xs text-(--regular-text)"
            onClick={saveData}
          >
            Save
          </button>
          <button
            className="cursor-pointer px-2 py-1 text-xs text-(--regular-text)"
            onClick={() => {
              setEditValues(game);
              setMode("view");
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Fragment>
  );
};
