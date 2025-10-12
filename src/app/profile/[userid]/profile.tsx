"use client";
import { GameList } from "~/app/_components/gameList";
import type { User } from "~/app/hooks/user";
import { api } from "~/trpc/react";

export const Profile = ({
  user,
  curUser,
}: {
  curUser?: boolean;
  user: User;
}) => {
  const isAdmin = api.user.isAdmin.useQuery(undefined, {
    retry: false,
  });

  return (
    <div className="text-(--label-text)">
      {curUser ? "My library" : `Library of ${user.nick}`}
      <GameList
        userID={user.id}
        toggleable={curUser}
        editable={curUser && isAdmin.data}
      />
    </div>
  );
};
