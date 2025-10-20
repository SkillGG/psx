"use client";

import { cn } from "~/utils/utils";
import { createContext, useContext, useEffect, useState } from "react";
import { xURL } from "~/utils/urls";

export type LightMode = "light" | "dark";

export const ACCENTS = [
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "slate",
] as const;

export type AccentName = (typeof ACCENTS)[number];

type ThemeContextValue = {
  mode: LightMode;
  setMode: (mode: LightMode) => void;
  accent: AccentName;
  setAccent: (accent: AccentName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<LightMode>("dark");
  const [accent, setAccent] = useState<AccentName>("blue");

  // hydrate from storage and system preference
  useEffect(() => {
    const lsMode = localStorage.getItem("darkMode") as LightMode | null;
    if (lsMode) setMode(lsMode);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setMode("dark");
    }
    const lsAccent = localStorage.getItem("accentName") as AccentName | null;
    if (lsAccent) setAccent(lsAccent);

    // @ts-expect-error overwriting window
    window.xURL = xURL;
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("accentName", accent);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent }}>
      <div
        className={cn(
          "root m-0 h-full min-h-screen w-full bg-(color:--main-bg) p-0",
          mode,
        )}
        data-accent={accent}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
