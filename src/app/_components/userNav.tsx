"use client";

import Link from "next/link";
import { useUser } from "../hooks/user";
import DarkModeSwitch, { AccentSwitch } from "./themeSwitches";
import { LoggedUI } from "./logged";
import type { ClassValue } from "clsx";
import { cn } from "~/utils/utils";

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
      className={cn("mr-2 flex items-center justify-end gap-2 pt-2", className)}
    >
      {user.logged ? (
        <LoggedUI user={user} />
      ) : (
        <>
          <AccentSwitch />
          <DarkModeSwitch />
          <Link
            href={`/login${back ? `?back=${back}` : ""}`}
            className="text-(--accent-300) hover:cursor-pointer hover:text-(--label-text)"
          >
            Login
          </Link>
          <Link
            href={`/register${back ? `?back=${back}` : ""}`}
            className="text-(--accent-300) hover:cursor-pointer hover:text-(--label-text)"
          >
            Register
          </Link>
        </>
      )}
    </nav>
  );
};
