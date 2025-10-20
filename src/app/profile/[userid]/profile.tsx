"use client";
import Link from "next/link";
import { GameList } from "~/app/_components/gameList";
import type { User } from "~/app/hooks/user";
import { api } from "~/trpc/react";
import { xURL } from "~/utils/urls";
import { useEffect, useState } from "react";

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
      <GameList
        listDescriptor={
          <div className="mx-auto text-xl text-(--regular-text)">
            {curUser ? (
              "My library"
            ) : (
              <>
                Library of{" "}
                <span className="text-(--complement-500)">{user.nick}</span>
              </>
            )}
          </div>
        }
        userID={user.id}
        toggleable={curUser}
        editable={curUser && isAdmin.data}
      />
    </div>
  );
};
