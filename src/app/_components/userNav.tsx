"use client";

import Link from "next/link";
import { useUser } from "../hooks/user";
import DarkModeSwitch, { AccentSwitch } from "./themeSwitches";
import { LoggedUI } from "./logged";
import type { ClassValue } from "clsx";
import { cn } from "~/utils/utils";
import { SearchBar } from "./search";

export const UserNav = ({
  back,
  className,
}: {
  className?: ClassValue;
  back?: string;
}) => {
  const user = useUser();
  return (
    <nav
      className={cn(
        "top-0 right-0 flex not-lg:justify-end lg:absolute",
        className,
      )}
    >
      {user.logged ? (
        <LoggedUI user={user} />
      ) : (
        <div className="relative flex items-center gap-2 text-(--label-text)">
          <div>
            <SearchBar />
          </div>
          <Link
            href={`/login${back ? `?back=${back}` : ""}`}
            className="text-(--regular-text) hover:cursor-pointer hover:text-(--label-text)"
          >
            Login
          </Link>
          <AccentSwitch />
          <DarkModeSwitch />
        </div>
      )}
    </nav>
  );
};
