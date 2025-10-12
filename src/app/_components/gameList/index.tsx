"use client";
import { api } from "~/trpc/react";
import { Spinner } from "../spinner";
import { useEffect, useState } from "react";

export const GameList = ({
  userID,
  editable,
  toggleable,
}: {
  userID?: string;
  editable?: boolean;
  toggleable?: boolean;
}) => {
  const [forceAll, setForceAll] = useState(false);

  const util = api.useUtils();

  const { isFetching, data: games } = api.games.list.useQuery(
    forceAll ? undefined : userID,
  );

  useEffect(() => {
    void util.games.list.invalidate();
  }, [forceAll, util.games.list]);

  if (isFetching || !games)
    return (
      <div className="m-auto flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <div>
      <div className="absolute top-2 left-2">
        {toggleable && "(USER)"}
        {editable && "(ADMIN)"}
        <button
          onClick={() => {
            setForceAll((p) => !p);
          }}
          className="border-1 border-(--label-text) px-2 text-(--label-text)"
        >
          {forceAll ? "Showing unordered" : "Showing ordered"}
        </button>
      </div>
      <div>
        {games.map((q) => (
          <div key={q.id}>{q.title}</div>
        ))}
        {editable && (
          <div>
            <dialog></dialog>
            <button>Add a new game</button>
          </div>
        )}
      </div>
    </div>
  );
};
