"use client";
import { api } from "~/trpc/react";
import { Spinner } from "../spinner";
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { NewGameCreationForm } from "./create";
import { GameRow } from "./row";
import { FiltersDialog, type GameListFilters } from "./filters";
import { cn } from "~/utils/utils";
import { PopoverDialog, type PopoverRef } from "../popoverDialog";

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
    sort: {},
    take: 100,
    page: 0,
  });

  const util = api.useUtils();

  const { isFetching, data: games } = api.games.list.useQuery({
    userID: forceAll ? undefined : userID,
    search: filters.filter,
    sort: filters.sort,
    skip: filters.take * filters.page,
    take: filters.take,
  });

  useEffect(() => {
    void util.games.list.invalidate();
  }, [forceAll, util.games.list]);

  const popoverRef = useRef<PopoverRef>(null);
  if (isFetching || !games)
    return (
      <div className="m-auto flex h-screen w-full items-center justify-center">
        <Spinner />
      </div>
    );

  console.log("Searching with filters", filters);

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
          {editable && (
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
          )}
          {listDescriptor}
        </div>
        <div className="mx-2 mt-2 grid max-h-[85lvh] grid-cols-[2fr_1fr_1fr_5fr] overflow-auto rounded-xl border-1 text-(--label-text)">
          <GameRow
            raw={{
              parent_id: "",
              console: "Console",
              id: "ID",
              region: "Region",
              title: "Title",
            }}
            classNames={{
              all: "text-center font-bold text-2xl self-start",
            }}
          />
        </div>
        <div className="grid max-h-[85lvh] grid-cols-[2fr_1fr_1fr_5fr] overflow-auto text-(--label-text)">
          {games.map((q) => (
            <>
              <GameRow
                game={q}
                key={"game_" + q.id}
                classNames={{
                  all: cn(
                    "text-center wrap-anywhere",
                    "nth-[8n+1]:backdrop-brightness-(--bg-hover-brightness)",
                    "nth-[8n+2]:backdrop-brightness-(--bg-hover-brightness)",
                    "nth-[8n+3]:backdrop-brightness-(--bg-hover-brightness)",
                    "nth-[8n+4]:backdrop-brightness-(--bg-hover-brightness)",
                    q.region === "PAL" && "text-green-500",
                    q.region === "NTSC" && "text-orange-500",
                    q.region === "NTSCJ" && "text-pink-500",
                  ),
                  title: "text-(--regular-text)",
                }}
              />
              {q.subgames.length > 0 && <></>}
            </>
          ))}
        </div>
      </div>
    </div>
  );
};
