"use client";

import { LoadPage } from "~/app/_components/loadPage";
import { useGoBack } from "~/app/hooks/goBack";
import { useUser } from "~/app/hooks/user";
import { api } from "~/trpc/react";
import { Profile } from "./profile";

export const ProfilePage = ({ user }: { user: string }) => {
  const curUser = useUser();

  const { goBack } = useGoBack();

  const { isFetching, data: userData } = api.user.lookupUser.useQuery(user);

  if (isFetching) return <LoadPage key="lp" className={"h-full"} />;

  if (!userData) {
    console.log("User not found!");
    goBack({ timeout: 1000 });
    return <>User not found!</>;
  }

  return (
    <Profile
      user={userData}
      curUser={curUser.logged && curUser.id === userData.id}
    />
  );
};
