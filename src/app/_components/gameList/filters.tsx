import type { Console, Region } from "@prisma/client";
import type { ClassValue } from "clsx";
import {
  useRef,
  useState,
  type Dispatch,
  type InputHTMLAttributes,
  type SetStateAction,
} from "react";
import type { SearchSchema, SortSchema } from "~/server/api/routers/games";
import { cn } from "~/utils/utils";

export type GameListFilters = {
  filter: SearchSchema;
  sort: SortSchema;
  take: number;
  /** Page that we are on */
  page: number;
};

type FilterBase<T> = { value: T; onChange(val: T | undefined): void };

type RadioFilter<T> = { type: "radio"; values: [string, T][] } & FilterBase<T>;
type TextFilter = { type: "string" } & FilterBase<string>;

const Filter = <T extends InputHTMLAttributes<HTMLInputElement>["value"]>({
  label,
  ...filter
}: {
  label: string;
} & (RadioFilter<T> | TextFilter)) => {
  return (
    <>
      <div className="mt-2 flex gap-2">
        {label}
        <br />
        {filter.type === "radio" && (
          <>
            {filter.values.map((q) => (
              <label
                key={`${label}_${q[0]}`}
                htmlFor={`${label}_${q[0]}`}
                className={cn(
                  "rounded-xl border-1 px-2 py-1",
                  "has-checked:border-(--complement-500)",
                  "hover:backdrop-brightness-(--bg-hover-brightness)",
                  "cursor-pointer",
                )}
              >
                {q[0]}
                <input
                  id={`${label}_${q[0]}`}
                  type="radio"
                  checked={filter.value === q[1]}
                  name={label}
                  value={q[1]}
                  onChange={() => {
                    if (q[1]) filter.onChange(q[1]);
                    else filter.onChange(undefined);
                  }}
                  className="hidden"
                />
              </label>
            ))}
          </>
        )}
        {filter.type === "string" && (
          <>
            <input
              value={filter.value.replace(/^\%(.*)\%$/gi, "$1")}
              onChange={(e) => {
                filter.onChange(`%${e.currentTarget.value}%`);
              }}
              className="border-b-1"
            />
          </>
        )}
      </div>
    </>
  );
};

export const FiltersDialog = ({
  filters: initFilters,
  setFilters: saveFilters,
  classNames,
}: {
  filters: GameListFilters;
  setFilters: Dispatch<SetStateAction<GameListFilters>>;
  classNames?: {
    btn?: ClassValue;
    dialog?: ClassValue;
  };
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [filters, setFilters] = useState(initFilters);

  return (
    <>
      <dialog
        ref={dialogRef}
        onSubmit={(e) => {
          e.preventDefault();
          dialogRef.current?.hidePopover();
          saveFilters(filters);
        }}
        popover="auto"
        className={cn(
          "m-auto border-1 border-(--regular-border) bg-(--deeper-bg)/80",
          "rounded-xl px-4 py-2 text-(--label-text)",
        )}
      >
        <form className={cn("flex flex-col gap-2")}>
          <h3 className="text-center text-xl text-(--regular-text)">Filters</h3>
          <Filter
            label="Search query"
            type="string"
            onChange={(e) => {
              setFilters((p) => {
                if (!e) {
                  const nP = { ...p };
                  delete nP?.filter?.id;
                  delete nP?.filter?.title;
                  return nP;
                }
                return {
                  ...p,
                  filter: {
                    ...p.filter,
                    id: e,
                    title: e,
                  },
                };
              });
            }}
            value={filters.filter.id ?? ""}
          />
          <Filter<Console | undefined>
            type="radio"
            label="Console"
            onChange={(v) => {
              setFilters((p) => {
                const nP = { ...p };
                if (!v) {
                  delete nP.filter.console;
                  return nP;
                } else {
                  return {
                    ...p,
                    filter: {
                      ...p.filter,
                      console: v,
                    },
                  };
                }
              });
            }}
            value={filters.filter.console}
            values={
              [
                ["Any", undefined],
                ["PS1", "PS1"],
                ["PS2", "PS2"],
                ["PSP", "PSP"],
              ] as const
            }
          />
          <Filter<Region | undefined>
            type="radio"
            label="Region"
            onChange={(v) => {
              setFilters((p) => {
                const nP = { ...p };
                if (!v) {
                  delete nP.filter.region;
                  return nP;
                } else {
                  return {
                    ...p,
                    filter: {
                      ...p.filter,
                      region: v,
                    },
                  };
                }
              });
            }}
            value={filters.filter.region}
            values={
              [
                ["Any", undefined],
                ["PAL", "PAL"],
                ["NTSC", "NTSC"],
                ["NTSC-J", "NTSCJ"],
              ] as const
            }
          />
          <div className="space-around flex w-full gap-2">
            <button
              type="submit"
              className={cn(
                "w-full cursor-pointer border-1",
                "border-(--button-submit-bg) px-2 py-1",
                "text-(--button-submit-nobg-text)",
                "hover:backdrop-brightness-(--bg-hover-brightness)",
              )}
            >
              Save
            </button>
            <button
              type="button"
              className={cn(
                "w-full cursor-pointer border-1",
                "border-(--button-remove-bg) px-2 py-1",
                "text-(--button-remove-nobg-text)",
                "hover:backdrop-brightness-(--bg-hover-brightness)",
              )}
              onClick={() => {
                setFilters({ ...filters, filter: {}, sort: {} });
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </dialog>
      <button
        className={cn(classNames?.btn)}
        onClick={() => {
          dialogRef.current?.showPopover();
        }}
      >
        Filter
      </button>
    </>
  );
};
