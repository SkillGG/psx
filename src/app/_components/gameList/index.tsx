"use client";
import { api } from "~/trpc/react";
import { Spinner } from "../spinner";
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { NewGameCreationForm } from "./create";
import { GameRow } from "./row";
import { FiltersDialog, type GameListFilters } from "./filters";
import { cn } from "~/utils/utils";
import { PopoverDialog, type PopoverRef } from "../popoverDialog";
import Link from "next/link";
import type { Game, Region } from "@prisma/client";
import { CaretDown, CaretUp } from "../icon";

const GAME_ROW_STYLES = (region: Region) => {
  return {
    view: {
      all: cn(
        "justify-center items-center text-center wrap-anywhere border-l-1 border-dashed",
        "first:border-l-0 border-(--regular-border) h-12",
        "nth-[8n+1]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-[8n+2]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-[8n+3]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-[8n+4]:backdrop-brightness-(--bg-hover-brightness)",
        region === "PAL" && "text-green-500",
        region === "NTSC" && "text-orange-500",
        region === "NTSCJ" && "text-pink-500",
      ),
      title: "text-(--regular-text)",
    },
    edit: {
      all: cn(
        "justify-center items-center text-center wrap-anywhere border-l-1 border-dashed",
        "first:border-l-0 border-(--regular-border) h-12",
        "nth-[8n+1]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-[8n+2]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-[8n+3]:backdrop-brightness-(--bg-hover-brightness)",
        "nth-[8n+4]:backdrop-brightness-(--bg-hover-brightness) cursor-pointer",
      ),
      title: cn("text-center text-(--regular-text)"),
      console: cn(
        "text-center",
        region === "PAL" && "text-green-500",
        region === "NTSC" && "text-orange-500",
        region === "NTSCJ" && "text-pink-500",
      ),
      id: cn(
        "text-center",
        region === "PAL" && "text-green-500",
        region === "NTSC" && "text-orange-500",
        region === "NTSCJ" && "text-pink-500",
      ),
      region: cn(
        "text-center",
        region === "PAL" && "text-green-500",
        region === "NTSC" && "text-orange-500",
        region === "NTSCJ" && "text-pink-500",
      ),
    },
  } as const;
};

export const DEFAULT_SORT = {
  title: { priority: 1, sort: "asc" },
  console: { priority: 2, sort: "asc" },
} as const;

export const GameList = ({
  userID,
  editable,
  listDescriptor,
}: {
  userID?: string;
  editable?: boolean;
  toggleable?: boolean;
  listDescriptor?: ReactNode;
}) => {
  const [forceAll, setForceAll] = useState(false);
  const [filters, setFilters] = useState<GameListFilters>({
    filter: {},
    sort: DEFAULT_SORT,
    take: 100,
    page: 0,
  });

  const [showSubgames, setShowSubgames] = useState<string[]>([]);

  const util = api.useUtils();

  const { isFetching, data: games } = api.games.list.useQuery({
    userID: forceAll ? undefined : userID,
    search: filters.filter,
    sort: filters.sort,
    skip: filters.take * filters.page,
    take: filters.take,
  });

  const { mutateAsync: editGameData, isPending: isMutating } =
    api.games.editData.useMutation();

  useEffect(() => {
    void util.games.list.invalidate();
  }, [forceAll, util.games.list]);

  const popoverRef = useRef<PopoverRef>(null);

  console.log("Game#", games?.length);
  console.log("Searching with filters", filters);

  const onGameRowEdit = async (prev: string, g: Game) => {
    await editGameData({ id: prev, data: g });
    await util.games.invalidate();
  };

  return (
    <div className="pt-2 text-(--label-text)">
      <div>
        <div className="ml-4 flex gap-4">
          <FiltersDialog
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
            userSort={
              !!userID
                ? {
                    sort: !forceAll,
                    toggle: () => setForceAll((p) => !p),
                  }
                : undefined
            }
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
        <div className="mx-2 mt-2 grid max-h-[85lvh] grid-cols-[2fr_1fr_1fr_5fr] overflow-auto rounded-xl rounded-b-none border-2 border-(--regular-border) text-(--label-text)">
          <GameRow
            raw={{
              console: "Console",
              id: "ID",
              region: "Region",
              title: "Title",
            }}
            classNames={{
              view: {
                all: cn(
                  "justify-center flex font-bold text-2xl self-start border-l-1",
                  "first:border-l-0 border-dashed border-(--regular-border)",
                ),
              },
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
                "mx-2 grid max-h-[85lvh] grid-cols-[2fr_1fr_1fr_5fr]",
                "overflow-auto rounded-xl rounded-t-none",
                "border-2 border-t-0 border-(--regular-border) text-(--label-text)",
              )}
            >
              {games.map((game) => (
                <>
                  <GameRow
                    game={{ ...game, parent_id: null }}
                    gameType={game.subgames.length === 0 ? "single" : "parent"}
                    key={"game_" + game.id}
                    toggle={
                      game.subgames.length > 0 && (
                        <button
                          className="ml-2 cursor-pointer rounded-full"
                          onClick={() => {
                            setShowSubgames((p) =>
                              p.includes(game.id)
                                ? p.filter((id) => id !== game.id)
                                : [...p, game.id],
                            );
                          }}
                        >
                          {showSubgames.includes(game.id) ? (
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
                      )
                    }
                    onEdit={editable ? onGameRowEdit : undefined}
                    classNames={GAME_ROW_STYLES(game.region)}
                  />
                  {game.subgames.length > 0 &&
                    showSubgames.includes(game.id) && (
                      <>
                        <div className="h-2 bg-(--complement-900)"></div>
                        <div className="h-2 bg-(--complement-900)"></div>
                        <div className="h-2 bg-(--complement-900)"></div>
                        <div className="h-2 bg-(--complement-900)"></div>
                        <div className="h-0 bg-(--complement-900)"></div>
                        <div className="h-0 bg-(--complement-900)"></div>
                        <div className="h-0 bg-(--complement-900)"></div>
                        <div className="h-0 bg-(--complement-900)"></div>

                        {game.subgames.map((subgame) => {
                          return (
                            <GameRow
                              onEdit={editable ? onGameRowEdit : undefined}
                              game={subgame}
                              gameType="sub"
                              key={`subgame_${subgame.id}`}
                              classNames={GAME_ROW_STYLES(subgame.region)}
                            />
                          );
                        })}
                        <div className="h-2 bg-(--complement-900)"></div>
                        <div className="h-2 bg-(--complement-900)"></div>
                        <div className="h-2 bg-(--complement-900)"></div>
                        <div className="h-2 bg-(--complement-900)"></div>
                        {game.subgames.length % 2 === 1 && (
                          <>
                            <div className="h-0 bg-(--complement-900)"></div>
                            <div className="h-0 bg-(--complement-900)"></div>
                            <div className="h-0 bg-(--complement-900)"></div>
                            <div className="h-0 bg-(--complement-900)"></div>
                          </>
                        )}
                      </>
                    )}
                </>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
