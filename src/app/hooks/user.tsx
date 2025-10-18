"use client";

import { TRPCClientError } from "@trpc/client";
import { createContext, useContext } from "react";
import { api } from "~/trpc/react";
import { LoadPage } from "../_components/loadPage";

export type User = {
  nick: string;
  id: string;
  email: string;
};

type UserData =
  | {
      logged: false;
    }
  | ({
      logged: true;
    } & User);

const UserContext = createContext<UserData | null>(null);

/** Returns {logged: boolean} with user data if it's true */
export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};

/** If not logged - returns null */
export const useLoggedUser = () => {
  const user = useUser();
  if (!user.logged) return null;
  return user;
};

export const useUserData_ = (): UserData | { fetching: true } => {
  const { data, isFetching } = api.user.getData.useQuery(undefined, {
    retry: (count, err) => {
      console.log("Failed with err", err);

      if (err instanceof TRPCClientError) {
        if (err.message === "UNAUTHORIZED") {
          console.warn("Not retrying bc unauthorized");
          return false;
        }
      }

      return count < 4;
    },
  });

  if (isFetching) return { fetching: true };

  return data?.user ? { logged: true, ...data.user } : { logged: false };
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const userData = useUserData_();

  if ("fetching" in userData) {
    return <LoadPage />;
  }

  return (
    <UserContext.Provider value={userData}>{children}</UserContext.Provider>
  );
};
