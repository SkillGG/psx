"use client";
import { api } from "~/trpc/react";
import { Spinner } from "../spinner";
import React, { useRef, useState, type ReactNode } from "react";
import { NewGameCreationForm } from "./create";
import { GameRow, RawRow } from "./gameRow";
import { FiltersDialog, type GameListFilters } from "./filters";
import { cn, isNotNull } from "~/utils/utils";
import { PopoverDialog, type PopoverRef } from "../popoverDialog";
import Link from "next/link";
import type { Game, Region } from "@prisma/client";
import type { GameQuerySort } from "~/utils/gameQueries";
import { NotOwnedIcon, OwnedIcon } from "../icon";

const DEFAULT_VIEW_STYLES = {
  id: cn(
    "md:pr-0 pr-[10px] md:justify-center justify-end",
    "not-lg:row-span-2 not-lg:col-1",
  ),
  title: cn("text-(--regular-text)", "not-lg:row-span-2 not-lg:col-3"),
  region: cn("not-lg:col-2"),
  console: cn("not-lg:col-2 not-lg:border-b-1"),
} as const;

export const GAME_ROW_STYLES = (region?: Region) => {
  return {
    view: {
      all: cn(
        "justify-center items-center text-center wrap-anywhere border-l-1 border-dashed",
        "first:border-l-0 border-(--regular-border) h-12 not-lg:h-full",
        "nth-of-type-[8n+1]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-of-type-[8n+2]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-of-type-[8n+3]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-of-type-[8n+4]:backdrop-brightness-(--bg-hover-brightness)",
        region === "PAL" && "text-green-500",
        region === "NTSC" && "text-orange-500",
        region === "NTSCJ" && "text-pink-500",
      ),
      ...DEFAULT_VIEW_STYLES,
    },
    edit: {
      all: cn(
        "justify-center items-center text-center wrap-anywhere border-l-1 border-dashed",
        "first:border-l-0 border-(--regular-border) h-12 not-lg:h-full",
        "nth-of-type-[8n+1]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-of-type-[8n+2]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-of-type-[8n+3]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-of-type-[8n+4]:backdrop-brightness-(--bg-hover-brightness) cursor-pointer",
      ),
      ...DEFAULT_VIEW_STYLES,
      title_input: cn("text-center text-(--regular-text)"),
      console_input: cn(
        "text-center",
        region === "PAL" && "text-green-500",
        region === "NTSC" && "text-orange-500",
        region === "NTSCJ" && "text-pink-500",
      ),
      id_input: cn(
        "text-center",
        region === "PAL" && "text-green-500",
        region === "NTSC" && "text-orange-500",
        region === "NTSCJ" && "text-pink-500",
      ),
      region_input: cn(
        "text-center",
        region === "PAL" && "text-green-500",
        region === "NTSC" && "text-orange-500",
        region === "NTSCJ" && "text-pink-500",
      ),
    },
  } as const;
};

export const DEFAULT_SORT: GameQuerySort = {
  columns: {
    title: { priority: 1, sort: "asc" },
    console: { priority: 2, sort: "asc" },
  },
  ownership: true,
} as const;

const TABLE_DIMENSIONS =
  "grid-cols-[2fr_1fr_1fr_5fr] grid-flow-dense not-lg:grid-cols-[2fr_2fr_5fr] lg:grid-cols-[1.5fr_1fr_1fr_5.5fr]";

export const GameList = ({
  userID,
  editable,
  toggleable,
  listDescriptor,
}: {
  userID?: string;
  editable?: boolean;
  toggleable?: boolean;
  listDescriptor?: ReactNode;
}) => {
  const [filters, setFilters] = useState<GameListFilters>({
    filter: {},
    sort: DEFAULT_SORT,
    take: 100,
    page: 0,
  });

  const util = api.useUtils();

  const { isFetching, data: games } = api.games.list.useQuery({
    userID: userID,
    search: filters.filter,
    sort: filters.sort,
    skip: filters.take * filters.page,
    take: filters.take,
  });

  const { mutateAsync: editGameData, isPending: isEditing } =
    api.games.editData.useMutation();

  const { mutateAsync: reparent, isPending: isReparenting } =
    api.games.reparent.useMutation();

  const isMutating = isEditing || isReparenting;

  const popoverRef = useRef<PopoverRef>(null);

  console.log("Game#", games?.length);
  console.log("Searching with filters", filters);

  const onGameRowEdit = async (prev: Game, g: Game) => {
    if (prev.parent_id !== g.parent_id) {
      await reparent({ id: prev.id, parent_id: g.parent_id });
    } else {
      await editGameData({ id: prev.id, data: g });
    }
    await util.games.invalidate();
  };

  const [selected, setSelected] = useState<[string, boolean][]>([]);

  const toggleOwnership = api.games.markOwnership.useMutation();
  const removeGames = api.games.removeGames.useMutation();

  return (
    <div className="pt-2 text-(--label-text)">
      <div>
        <div className="ml-4 flex gap-4">
          <FiltersDialog
            showUserSearch={!!userID}
            classNames={{
              btns: {
                open: cn(
                  "justify-self-start border-1 rounded-xl px-2",
                  "hover:backdrop-brightness-(--bg-hover-brightness)",
                  "focus:backdrop-brightness-(--bg-hover-brightness)",
                  "hover:cursor-pointer",
                ),
              },
            }}
            filters={filters}
            setFilters={setFilters}
          />
          {filters.page > 0 && (
            <button
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Prev
            </button>
          )}
          {games && games.length >= filters.take && (
            <button
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Next
            </button>
          )}
          {editable && (
            <>
              <div>
                <PopoverDialog
                  ref={popoverRef}
                  Actuator={
                    <button
                      className={cn(
                        "justify-self-start rounded-xl border-1 px-2",
                        "hover:backdrop-brightness-(--bg-hover-brightness)",
                        "focus:backdrop-brightness-(--bg-hover-brightness)",
                        "hover:cursor-pointer",
                      )}
                    >
                      Add a new game
                    </button>
                  }
                >
                  <NewGameCreationForm
                    closeDialog={() => popoverRef.current?.hide()}
                  />
                </PopoverDialog>
              </div>
              <div>
                <Link
                  target="_blank"
                  className={cn(
                    "justify-self-start rounded-xl border-1 px-2",
                    "hover:backdrop-brightness-(--bg-hover-brightness)",
                    "focus:backdrop-brightness-(--bg-hover-brightness)",
                    "hover:cursor-pointer",
                  )}
                  href={"/api/export"}
                >
                  Export
                </Link>
              </div>
            </>
          )}
          {listDescriptor}
        </div>
        <div
          className={cn(
            "mx-2 mt-2 grid max-h-[85lvh]",
            TABLE_DIMENSIONS,
            "overflow-auto rounded-xl",
            "rounded-b-none border-2 border-(--regular-border)",
            "text-(--label-text)",
          )}
        >
          <RawRow
            raw={{
              console: "Console",
              id: (
                <>
                  <div className="absolute left-2 mr-4 flex items-center gap-2">
                    <input
                      className="cursor-pointer"
                      type={"checkbox"}
                      checked={
                        games
                          ?.map((g) => [...g.subgames.map((z) => z.id), g.id])
                          .flat(2)
                          .every((id) =>
                            selected.map((q) => q[0]).includes(id),
                          ) ?? false
                      }
                      onChange={({ currentTarget: { checked } }) => {
                        console.log("Clicked toggle all", checked);
                        if (!checked) {
                          setSelected([]);
                        } else {
                          const allGames: [string, boolean][] = [
                            ...(games?.map((q) => q.subgames) ?? []),
                            ...(games ?? []),
                          ]
                            .flat(20)
                            .filter(isNotNull)
                            .map((q) => [q.id, !!q.owned]);
                          setSelected(allGames);
                        }
                      }}
                    />
                    {selected.some(([_, state]) => !state) && (
                      <button
                        className="cursor-pointer text-sm"
                        onClick={async () => {
                          await toggleOwnership.mutateAsync({
                            ids: selected.map((q) => q[0]),
                            ownership: true,
                          });
                          setSelected([]);
                          await util.games.invalidate();
                        }}
                      >
                        <OwnedIcon />
                      </button>
                    )}
                    {selected.some(([_, state]) => !!state) && (
                      <button
                        className="cursor-pointer text-sm"
                        onClick={async () => {
                          await toggleOwnership.mutateAsync({
                            ids: selected.map((q) => q[0]),
                            ownership: false,
                          });
                          setSelected([]);
                          await util.games.invalidate();
                        }}
                      >
                        <NotOwnedIcon />
                      </button>
                    )}
                  </div>
                  ID
                  <div className="absolute right-2 ml-4 flex items-center gap-2">
                    {selected.length > 0 && (
                      <button
                        className="cursor-pointer text-sm"
                        onClick={async () => {
                          await removeGames.mutateAsync(
                            selected.map(([id]) => id),
                          );
                          await util.games.invalidate();
                        }}
                      >
                        <NotOwnedIcon />
                      </button>
                    )}
                  </div>
                </>
              ),
              region: "Region",
              title: "Title",
            }}
            classNames={{
              all: cn(
                "justify-center flex font-bold md:text-2xl self-start border-r-1",
                "border-dashed border-(--regular-border) items-center",
              ),
              id: cn("relative not-lg:row-span-2 not-lg:col-1 not-lg:h-full"),
              title: cn("not-lg:row-span-2 not-lg:col-3 not-lg:h-full"),
              region: cn("not-lg:col-2"),
              console: cn("not-lg:col-2"),
            }}
          />
        </div>
        {isFetching || isMutating || !games ? (
          <div className="m-auto flex h-screen w-full items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            <div
              className={cn(
                "mx-2 grid max-h-[85lvh]",
                TABLE_DIMENSIONS,
                "overflow-auto rounded-xl rounded-t-none",
                "border-2 border-t-0 border-(--regular-border) text-(--label-text)",
              )}
            >
              {games.map((subgame) => (
                <GameRow
                  toggleable={toggleable}
                  selected={selected.map((q) => q[0])}
                  toggleSelected={(id, s) =>
                    setSelected((p) =>
                      p.find((z) => z[0] === id)
                        ? p.filter((z) => z[0] !== id)
                        : [...p, [id, s]],
                    )
                  }
                  game={subgame}
                  key={"game_" + subgame.id}
                  onEdit={onGameRowEdit}
                  editable={editable}
                  classNames={GAME_ROW_STYLES(subgame.region)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
