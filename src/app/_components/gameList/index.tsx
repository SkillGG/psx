"use client";
import { api } from "~/trpc/react";
import { Spinner } from "../spinner";
import { useEffect, useRef, useState } from "react";
import { NewGameCreationDialog } from "./create";
import { GameRow } from "./row";
import { FiltersDialog, type GameListFilters } from "./filters";
import { cn } from "~/utils/utils";

export const GameList = ({
  userID,
  editable,
}: {
  userID?: string;
  editable?: boolean;
  toggleable?: boolean;
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

  const newDialog = useRef<HTMLDialogElement>(null);
  if (isFetching || !games)
    return (
      <div className="m-auto flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );

  console.log("Searching with filters", filters);

  return (
    <div>
      <div className={"grid grid-cols-[2fr_1fr_1fr_5fr] text-(--label-text)"}>
        <FiltersDialog
          classNames={{
            btn: cn(
              "justify-self-start border-1 rounded-lg px-2 ml-4",
              "hover:backdrop-brightness-(--bg-hover-brightness)",
              "focus:backdrop-brightness-(--bg-hover-brightness)",
              "hover:cursor-pointer",
            ),
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
        <GameRow
          raw={{
            console: "Console",
            id: "ID",
            region: "Region",
            title: "Title",
          }}
          classNames={{ all: "text-center font-bold text-2xl" }}
        />
        {games.map((q) => (
          <GameRow
            game={q}
            key={"game_" + q.id}
            classNames={{
              all: cn(
                "text-center",
                q.region === "PAL" && "text-green-500",
                q.region === "NTSC" && "text-orange-500",
                q.region === "NTSCJ" && "text-pink-500",
              ),
              title: "text-(--regular-text)",
            }}
          />
        ))}
        {editable && (
          <div>
            <NewGameCreationDialog ref={newDialog} />
            <button
              onClick={() => {
                newDialog.current?.showPopover();
              }}
            >
              Add a new game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
