"use client";

import { type User } from "../hooks/user";
import { cn } from "~/utils/utils";
import DarkModeSwitch, { AccentSwitch } from "./themeSwitches";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Spinner } from "./spinner";
import { useParams } from "next/navigation";
import { SearchBar } from "./search";
import { QuickPopover } from "./quickPopover";

export const LoggedUI = ({ user }: { user: User }) => {
  const logout = api.user.logout.useMutation();
  const utils = api.useUtils();

  const params = useParams();
  const curPageID = "userid" in params ? params.userid : null;

  return (
    <>
      <div className="relative flex items-center gap-2 text-(--label-text)">
        <div>
          <SearchBar />
        </div>
        <QuickPopover
          Actuator={
            <button className="group flex cursor-pointer items-center">
              {user.nick}
            </button>
          }
          calculateAnchor={(_, { actuator }, { main }) => {
            if (!actuator) return [0, 0];
            return [
              actuator.getBoundingClientRect().left - main[0] / 2,
              actuator.getBoundingClientRect().bottom,
            ];
          }}
          className={cn(
            "border border-(--complement-300) bg-(--dialog-bg)",
            "rounded-xl p-0 text-(--label-text)",
          )}
        >
          <ul className={cn("list-none")}>
            {curPageID !== user.id && (
              <li>
                <Link
                  href={"/profile/" + user.id}
                  className={cn(
                    "block w-full cursor-pointer px-2 py-2 text-center",
                    "hover:backdrop-brightness-(--bg-hover-brightness)",
                  )}
                >
                  Profile
                </Link>
              </li>
            )}
            <li>
              <button
                onClick={async () => {
                  await logout.mutateAsync();
                  await utils.user.invalidate();
                }}
                className={cn(
                  "block w-full cursor-pointer px-2 py-2 text-center",
                  "hover:backdrop-brightness-(--bg-hover-brightness)",
                  "disabled:cursor-not-allowed",
                )}
                disabled={logout.isPending}
              >
                {logout.isPending ? (
                  <Spinner className={"mx-auto"} />
                ) : (
                  "Logout"
                )}
              </button>
            </li>
          </ul>
        </QuickPopover>
        <AccentSwitch />
        <DarkModeSwitch />
      </div>
    </>
  );
};
