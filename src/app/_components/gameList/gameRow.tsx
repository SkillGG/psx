"use client";

import type { ClassValue } from "clsx";
import { Fragment, useState, type ReactNode } from "react";
import type { GameWithOwn, GameWithSubs } from "~/utils/gameQueries";
import { cn } from "~/utils/utils";
import { CaretDown, CaretUp, NotOwnedIcon, OwnedIcon } from "../icon";
import { isSafeID } from "./import/parse";
import type { Console, Region } from "@prisma/client";
import { GAME_ROW_STYLES } from ".";

type GameColumn = keyof Pick<
  GameWithOwn,
  "id" | "console" | "region" | "title"
>;

type RowMode = "view" | "edit";

type EditFunction = (p: GameWithOwn, n: GameWithOwn) => void;
type ReparentFuntion = (p: GameWithOwn, n: string | null) => void;
type ToggleSelectedFunvtion = (id: string, state: boolean) => void;

const Aggregate = ({
  agg,
  onEdit,
  classNames,
  reparentSubgames,
  editable,
  selected,
  toggleSelected,
  toggleable,
}: {
  classNames?: RowClassnames;
  agg: GameWithSubs;
  onEdit: EditFunction;
  editable?: boolean;
  reparentSubgames: ReparentFuntion;
  toggleable?: boolean;
  toggleSelected: ToggleSelectedFunvtion;
  selected: string[];
}) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RowMode>("view");
  const [editValues, setEditValues] = useState<GameWithSubs>({ ...agg });

  const saveData = () => {
    onEdit(
      { ...agg, parent_id: null },
      {
        console: editValues.console,
        id: editValues.id,
        parent_id: null,
        region: editValues.region,
        title: editValues.title,
      },
    );
  };
  const reset = () => {
    setEditValues(agg);
    setMode("view");
  };

  const listToggle = (
    <div
      className="absolute left-0 flex gap-2"
      title={"Show entries for " + `(${agg.id})`}
    >
      <div>
        <button
          className="cursor-pointer rounded-full"
          onClick={() => {
            setOpen((p) => !p);
          }}
        >
          {open ? (
            <CaretUp
              classNames={{
                svg: "h-5 w-5 hover:-rotate-z-90 rotate-90 transition-transform",
              }}
            />
          ) : (
            <CaretDown
              classNames={{
                svg: "h-5 w-5 hover:rotate-z-90 -rotate-90 transition-transform",
              }}
            />
          )}
        </button>
      </div>
      <div className="mr-auto flex">
        {agg?.owned ? (
          <OwnedIcon />
        ) : (
          <>
            {agg.subgames.reduce((p, n) => p + (!!n.owned ? 1 : 0), 0)}/
            {agg.subgames.length}
          </>
        )}
        {toggleable && (
          <input
            type="checkbox"
            className="ml-2"
            checked={agg.subgames.every((sg) => selected.includes(sg.id))}
            onChange={() => {
              for (const { id, owned } of agg.subgames)
                toggleSelected(id, !!owned);
            }}
          />
        )}
      </div>
    </div>
  );

  const titleEditElement = (
    <div
      className={cn(
        "relative col-span-4 flex",
        classNames?.edit?.all,
        classNames?.edit?.title,
        "not-lg:col-span-3 not-lg:row-span-1",
      )}
    >
      {listToggle}
      <input
        className={cn("w-full flex-1", classNames?.edit?.title_input)}
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
          onClick={reset}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const titleViewElement = (
    <div
      className={cn(
        "relative col-span-4 flex text-center",
        agg?.owned && "font-extrabold underline",
        classNames?.view?.all,
        classNames?.view?.title,
        "not-lg:col-span-3 not-lg:row-span-1",
      )}
    >
      {listToggle}
      <span className={cn("flex-1 text-center", agg?.owned && "text-red-500")}>
        {agg.title}
      </span>
      {editable && (
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
  );

  return (
    <Fragment key={`gameaggregate_${agg.id}`}>
      <div className="hidden"></div>
      <div className="hidden"></div>
      <div className="hidden"></div>
      {mode === "view" ? titleViewElement : titleEditElement}
      {open && (
        <SubGames
          reparent={reparentSubgames}
          key={`subgames_of_${agg.id}`}
          onEdit={onEdit}
          editable={editable}
          games={agg.subgames}
          toggleable={toggleable}
          selected={selected}
          toggleSelected={toggleSelected}
        />
      )}
    </Fragment>
  );
};

const SubGames = ({
  games,
  editable,
  onEdit,
  reparent,
  // classNames,
  selected,
  toggleSelected,
  toggleable,
}: {
  games: GameWithOwn[];
  editable?: boolean;
  onEdit: EditFunction;
  reparent: ReparentFuntion;
  classNames?: RowClassnames;
  toggleable?: boolean;
  toggleSelected: ToggleSelectedFunvtion;
  selected: string[];
}) => {
  return (
    <Fragment>
      <span className="col-span-4 box-border block border-t-[6px] [border-style:ridge] border-(--regular-border)"></span>
      {games.map((game) => (
        <Game
          onEdit={onEdit}
          classNames={GAME_ROW_STYLES(game.region)}
          reparent={reparent}
          editable={editable}
          type="sub"
          key={`subgame_of_${game.parent_id}:${game.id}`}
          game={game}
          selected={selected}
          toggleSelected={toggleSelected}
          toggleable={toggleable}
        />
      ))}
      <span className="col-span-4 box-border block border-[6px] border-x-0 border-b-0 [border-style:ridge] border-(--regular-border)"></span>
    </Fragment>
  );
};

const GameEdit = ({
  type = "single",
  game,
  onEdit,
  cancel,
  reparent,
  classNames,
}: {
  type?: "sub" | "single";
  game: GameWithOwn;
  onEdit: EditFunction;
  reparent: ReparentFuntion;
  cancel: () => void;
  classNames: RowClassnames["edit"];
}) => {
  const [editValues, setEditValues] = useState<GameWithOwn>({ ...game });
  const saveData = () => {
    onEdit(game, {
      console: editValues.console,
      id: editValues.id,
      parent_id: game.parent_id,
      region: editValues.region,
      title: editValues.title,
    });
  };
  return (
    <Fragment>
      <div
        className={cn("col-1 flex gap-2 px-2", classNames?.id, classNames?.all)}
      >
        <div className="mr-auto flex flex-col">
          {type === "sub" && (
            <button
              className={cn(
                "cursor-pointer rounded-xl border-1 px-2 text-(--color-red-500)",
                "hover:brightness-(--bg-hover-brightness)",
              )}
              onClick={() => {
                reparent(game, null);
              }}
            >
              R
            </button>
          )}
          {type === "single" && (
            <button
              className={cn(
                "cursor-pointer rounded-xl border-1 px-2 text-(--color-green-500)",
                "hover:brightness-(--bg-hover-brightness)",
              )}
              onClick={() => {
                // add to a parent
                const newID = prompt("Parent's ID:", game.id);
                if (!newID || !isSafeID(newID)) return;
                reparent(game, newID);
              }}
            >
              P
            </button>
          )}
        </div>
        <div className={cn("flex-1 text-center")}>
          <input
            className={cn(
              "w-full border-b-1 border-dashed",
              classNames?.id_input,
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
      <div className={cn("col-2 flex", classNames?.console, classNames?.all)}>
        <select
          className={cn(
            "r-select w-full cursor-pointer bg-transparent",
            classNames?.console_input,
          )}
          onChange={({ currentTarget: { value: console } }) => {
            const guard = (s: string): s is Console =>
              ["PS1", "PS2", "PSP"].includes(s);
            if (guard(console)) setEditValues((p) => ({ ...p, console }));
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
      <div className={cn("col-3 flex", classNames?.region, classNames?.all)}>
        <select
          className={cn(
            "r-select w-full cursor-pointer bg-transparent",
            classNames?.region_input,
          )}
          value={editValues.region}
          onChange={({ currentTarget: { value: region } }) => {
            const guard = (s: string): s is Region =>
              ["PAL", "NTSC", "NTSCJ"].includes(s);
            if (guard(region)) setEditValues((p) => ({ ...p, region }));
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
        className={cn(
          "col-4 flex gap-2 pl-2",
          classNames?.title,
          classNames?.all,
        )}
      >
        <input
          className={cn(
            "w-full flex-1 border-b-1 border-dashed",
            classNames?.title_input,
          )}
          value={editValues.title}
          onChange={({ currentTarget: { value: title } }) => {
            setEditValues((p) => ({ ...p, title }));
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
              cancel();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Fragment>
  );
};

const Game = ({
  game,
  onEdit,
  editable,
  type = "single",
  reparent,
  classNames,

  selected,
  toggleSelected,
  toggleable,
}: {
  game: GameWithOwn;
  editable?: boolean;
  onEdit: EditFunction;
  reparent: ReparentFuntion;
  type?: "sub" | "single";
  classNames?: RowClassnames;
  toggleable?: boolean;
  toggleSelected: ToggleSelectedFunvtion;
  selected: string[];
}) => {
  const [mode, setMode] = useState<RowMode>("view");

  if (mode === "edit") {
    return (
      <Fragment>
        <GameEdit
          classNames={classNames?.edit}
          cancel={() => setMode("view")}
          game={game}
          onEdit={onEdit}
          reparent={reparent}
          type={type}
        />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <div
        className={cn(
          "relative col-1 flex",
          classNames?.view?.all,
          classNames?.view?.id,
        )}
      >
        <div className="absolute left-2 flex gap-2">
          <div className="mr-auto flex gap-2">
            {game?.owned ? <OwnedIcon /> : <NotOwnedIcon />}
            {toggleable && (
              <input
                type="checkbox"
                checked={selected.includes(game.id)}
                onChange={() => {
                  toggleSelected(game.id, !!game.owned);
                }}
              />
            )}
          </div>
        </div>
        {game.id}
      </div>
      <div
        className={cn(
          "col-4 flex",
          game?.owned && "font-extrabold underline",
          classNames?.view?.all,
          classNames?.view?.title,
        )}
      >
        <span className={cn("flex-1 text-center")}>{game.title}</span>
        {editable && (
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
      <div
        className={cn(
          "col-2 flex",
          classNames?.view?.all,
          classNames?.view?.console,
        )}
      >
        {game.console}
      </div>
      <div
        className={cn(
          "col-3 flex",
          classNames?.view?.all,
          classNames?.view?.region,
        )}
      >
        {game.region}
      </div>
    </Fragment>
  );
};

export const RawRow = ({
  raw,
  classNames,
}: {
  raw: Record<GameColumn, ReactNode>;
  classNames?: RowClassnames["view"];
}) => {
  return (
    <Fragment>
      <div className={cn("col-1 flex", classNames?.all, classNames?.id)}>
        {raw.id}
      </div>
      <div className={cn("col-2 flex", classNames?.all, classNames?.console)}>
        {raw.console}
      </div>
      <div className={cn("col-3 flex", classNames?.all, classNames?.region)}>
        {raw.region}
      </div>
      <div className={cn("col-4 flex", classNames?.all, classNames?.title)}>
        {raw.title}
      </div>
    </Fragment>
  );
};

type RowClassnames = {
  view?: Partial<Record<GameColumn, ClassValue>> & {
    all?: ClassValue;
  };
  edit?: Partial<Record<GameColumn, ClassValue>> &
    Partial<Record<`${GameColumn}_input`, ClassValue>> & {
      all?: ClassValue;
    };
};

export const GameRow = ({
  classNames,
  game,
  onEdit,
  editable,
  toggleSelected,
  selected,
  toggleable,
}: {
  game: GameWithSubs;
  classNames: RowClassnames;
  onEdit: (prev: GameWithOwn, next: GameWithOwn) => void;
  editable?: boolean;
  toggleable?: boolean;
  selected: string[];
  toggleSelected: ToggleSelectedFunvtion;
}) => {
  return (
    <Fragment key={`game_${game.id}`}>
      {game.subgames.length > 0 ? (
        <Aggregate
          classNames={classNames}
          agg={game}
          onEdit={onEdit}
          editable={editable}
          reparentSubgames={(game, parent_id) => {
            onEdit(game, { ...game, parent_id });
          }}
          toggleable={toggleable}
          selected={selected}
          toggleSelected={toggleSelected}
        />
      ) : (
        <Game
          classNames={classNames}
          onEdit={onEdit}
          reparent={(game, parent_id) => {
            onEdit(game, { ...game, parent_id });
          }}
          editable={editable}
          game={{ ...game, parent_id: null }}
          toggleable={toggleable}
          selected={selected}
          toggleSelected={toggleSelected}
        />
      )}
    </Fragment>
  );
};
