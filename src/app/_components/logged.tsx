"use client";

import { useState } from "react";
import { type User } from "../hooks/user";
import { cn } from "~/utils/utils";
import DarkModeSwitch, { AccentSwitch } from "./themeSwitches";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Spinner } from "./spinner";
import { useParams } from "next/navigation";
import { SearchBar } from "./search";

export const LoggedUI = ({ user }: { user: User }) => {
  const logout = api.user.logout.useMutation();
  const utils = api.useUtils();

  const params = useParams();
  const curPageID = "userid" in params ? params.userid : null;

  const [anchor, setAnchor] = useState<[number, number]>([0, 0]);

  return (
    <>
      <div className="relative flex items-center gap-2 text-(--label-text)">
        <div>
          <SearchBar />
        </div>
        <button
          className="cursor-pointer"
          onClick={(e) => {
            const menu = e.currentTarget.nextSibling;
            if (menu instanceof HTMLElement) {
              console.log("showing popover for", menu);
              menu.showPopover();
              setAnchor([
                e.currentTarget.getBoundingClientRect().left -
                  menu.getBoundingClientRect().width / 2,
                e.currentTarget.getBoundingClientRect().bottom,
              ]);
            }
          }}
        >
          {user.nick}
        </button>
        <ul
          className={cn(
            "absolute list-none",
            "border-1 border-(--complement-300) bg-(--dialog-bg)",
            "rounded-xl text-(--label-text)",
          )}
          style={{
            left: `${anchor[0]}px`,
            top: `${anchor[1]}px`,
          }}
          popover="auto"
        >
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
              {logout.isPending ? <Spinner className={"mx-auto"} /> : "Logout"}
            </button>
          </li>
        </ul>
        <AccentSwitch />
        <DarkModeSwitch />
      </div>
    </>
  );
};
