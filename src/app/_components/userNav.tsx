"use client";

import Link from "next/link";
import { useUser } from "../hooks/user";
import DarkModeSwitch, { AccentSwitch } from "./themeSwitches";
import { api } from "~/trpc/react";

export const UserNav = ({ back }: { back?: string }) => {
  const user = useUser();

  const logout = api.user.logout.useMutation();
  const apiUtils = api.useUtils();
  if (user.logged) {
    return (
      <nav key="loggedInNav">
        Logged in as: {user.nick}{" "}
        <button
          onClick={() => {
            void logout.mutateAsync().then(() => {
              void apiUtils.user.invalidate();
            });
          }}
          className="cursor-pointer text-(--text-label) underline"
        >
          Logout
        </button>
      </nav>
    );
  }

  return (
    <nav
      key="loginNav"
      className="mr-2 flex items-center justify-end gap-2 pt-2"
    >
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
    </nav>
  );
};
