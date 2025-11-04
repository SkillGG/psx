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
import { LinkIcon, NotOwnedIcon, OwnedIcon, UnlinkIcon } from "../icon";

const DEFAULT_VIEW_STYLES = {
  id: cn(
    "md:pr-0 pr-2.5 md:justify-center justify-end",
    "not-lg:row-span-2 not-lg:col-1",
  ),
  title: cn("text-(--regular-text)", "not-lg:row-span-2 not-lg:col-3"),
  region: cn("not-lg:col-2"),
  console: cn("not-lg:col-2 not-lg:border-b"),
} as const;

// const SelectedControl = () => {
//   return <></>;
// };

export const GAME_ROW_STYLES = (region?: Region) => {
  return {
    view: {
      all: cn(
        "justify-center items-center text-center wrap-anywhere border-l border-dashed",
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
        "justify-center items-center text-center wrap-anywhere border-l border-dashed",
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

export type SelectState = {
  owned: boolean;
  parent: string | null;
};

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

  const utils = api.useUtils();

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

  const { mutateAsync: clearDB, isPending: isRemovingDB } =
    api.games.clearDB.useMutation();

  const { mutateAsync: groupGames, isPending: isGrouping } =
    api.games.group.useMutation();

  const { mutateAsync: removeFromGroup, isPending: isRemovingFromGroup } =
    api.games.removeFromGroup.useMutation();

  const isMutating =
    isEditing || isReparenting || isGrouping || isRemovingFromGroup;

  const popoverRef = useRef<PopoverRef>(null);

  const onGameRowEdit = async (prev: Game, g: Game) => {
    if (prev.parent_id !== g.parent_id) {
      await reparent({ id: prev.id, parent_id: g.parent_id });
    } else {
      await editGameData({ id: prev.id, data: g });
    }
    await utils.games.invalidate();
  };

  const [selected, setSelected] = useState<[string, SelectState][]>([]);

  const toggleOwnership = api.games.markOwnership.useMutation();
  const removeGames = api.games.removeGames.useMutation();

  const gamesNum =
    games?.reduce(
      (p, n) => p + (n.subgames?.length ? n.subgames.length : 1),
      0,
    ) ?? 0;

  const selectedStats = {
    areSubs: selected.some(([_, state]) => state.parent),
    areSingle: selected.some(([_, state]) => !state.parent),
    parents_ids: [
      ...new Set(selected.map(([_, state]) => state.parent)),
    ].filter(isNotNull),
    areOwned: selected.some(([_, state]) => !!state.owned),
    areNotOwned: selected.some(([_, state]) => !state.owned),
  };

  console.log(selectedStats);

  return (
    <div className="pt-2 text-(--label-text)">
      <div>
        <div className="ml-4 flex gap-4">
          <FiltersDialog
            showUserSearch={!!userID}
            classNames={{
              btns: {
                open: cn(
                  "justify-self-start border rounded-xl px-2",
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
                        "justify-self-start rounded-xl borderx-2",
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
                    "justify-self-start rounded-xl border px-2",
                    "hover:backdrop-brightness-(--bg-hover-brightness)",
                    "focus:backdrop-brightness-(--bg-hover-brightness)",
                    "hover:cursor-pointer",
                  )}
                  href={"/api/export"}
                >
                  Export
                </Link>
              </div>

              <div>
                <button
                  className={cn(
                    "justify-self-start rounded-xl border px-2",
                    "hover:backdrop-brightness-(--bg-hover-brightness)",
                    "focus:backdrop-brightness-(--bg-hover-brightness)",
                    "hover:cursor-pointer",
                  )}
                  onClick={() => {
                    void clearDB().then(() => {
                      void utils.games.invalidate();
                    });
                  }}
                >
                  {isRemovingDB ? "..." : "Clear db"}
                </button>
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
                    {toggleable && (
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
                            const allGames: [string, SelectState][] = [
                              ...(games?.map((q) => q.subgames) ?? []),
                              ...(games ?? []),
                            ]
                              .flat(20)
                              .filter(isNotNull)
                              .map<[string, SelectState]>((q) => [
                                q.id,
                                {
                                  owned: !!q.owned,
                                  parent: "parent_id" in q ? q.parent_id : null,
                                },
                              ]);
                            setSelected(allGames);
                          }
                        }}
                      />
                    )}
                    {toggleable && selectedStats.areNotOwned && (
                      <button
                        className="cursor-pointer text-sm"
                        title="Mark as owned"
                        onClick={async () => {
                          await toggleOwnership.mutateAsync({
                            ids: selected.map((q) => q[0]),
                            ownership: true,
                          });
                          setSelected([]);
                          await utils.games.invalidate();
                        }}
                      >
                        <OwnedIcon />
                      </button>
                    )}
                    {toggleable && selectedStats.areOwned && (
                      <button
                        className="cursor-pointer text-sm"
                        title="Mark as not owned"
                        onClick={async () => {
                          await toggleOwnership.mutateAsync({
                            ids: selected.map((q) => q[0]),
                            ownership: false,
                          });
                          setSelected([]);
                          await utils.games.invalidate();
                        }}
                      >
                        <NotOwnedIcon />
                      </button>
                    )}
                  </div>
                  ID
                  <div className="absolute right-2 ml-4 flex items-center gap-2">
                    {editable && selected.length > 0 && (
                      <button
                        title="Remove from the DB"
                        className="cursor-pointer text-sm"
                        onClick={async () => {
                          await removeGames.mutateAsync(
                            selected.map(([id]) => id),
                          );
                          await utils.games.invalidate();
                        }}
                      >
                        <NotOwnedIcon />
                      </button>
                    )}
                    {editable &&
                      selectedStats.areSingle &&
                      selectedStats.areSubs &&
                      selectedStats.parents_ids.length === 1 && (
                        <button
                          className="cursor-pointer"
                          title={"Move seelected children to a parent"}
                          onClick={async () => {
                            // link to an existing aggregate
                            const pID = selectedStats.parents_ids[0];
                            if (!pID) return;
                            await groupGames({
                              games: selected
                                .map(([id, state]) =>
                                  state.parent ? null : id,
                                )
                                .filter(isNotNull),
                              aggId: pID,
                            });
                            void utils.games.invalidate();
                            setSelected([]);
                          }}
                        >
                          <LinkIcon
                            classNames={{
                              svg: "w-4 h-4 stroke-green-500",
                            }}
                          />
                        </button>
                      )}
                    {editable &&
                      selectedStats.areSingle &&
                      !selectedStats.areSubs &&
                      selected.length > 1 && (
                        <button
                          title={"Create an aggregate for selected items"}
                          className="cursor-pointer"
                          onClick={async () => {
                            // link to an existing aggregate
                            const gID = prompt("Create ID for an aggregate");
                            if (!gID) return;
                            const groupID = gID.endsWith("_agg")
                              ? gID
                              : `${gID}_agg`;
                            const title = prompt("Create group title!");
                            if (!title) return;
                            await groupGames({
                              games: selected
                                .map(([id, state]) =>
                                  state.parent ? null : id,
                                )
                                .filter(isNotNull),
                              groupID,
                              title,
                            });
                            void utils.games.invalidate();
                            setSelected([]);
                          }}
                        >
                          <LinkIcon
                            classNames={{
                              svg: "w-4 h-4 rotate-90 stroke-orange-500",
                            }}
                          />
                        </button>
                      )}
                    {editable &&
                      !selectedStats.areSingle &&
                      selectedStats.areSubs &&
                      selectedStats.parents_ids.length === 1 && (
                        <button
                          className="cursor-pointer"
                          onClick={async () => {
                            await removeFromGroup(selected.map(([id]) => id));
                            void utils.games.invalidate();
                            setSelected([]);
                          }}
                        >
                          <UnlinkIcon
                            classNames={{ svg: "w-4 h-4 stroke-red-500" }}
                          />
                        </button>
                      )}
                    {toggleable && games && (
                      <span className="text-sm">
                        {selected.length}/{gamesNum}
                      </span>
                    )}
                    {!toggleable && games && (
                      <span className="text-sm">{gamesNum}</span>
                    )}
                  </div>
                </>
              ),
              region: "Region",
              title: "Title",
            }}
            classNames={{
              all: cn(
                "justify-center flex font-bold md:text-2xl self-start border-r",
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
