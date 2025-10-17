import type { Console, Region } from "@prisma/client";
import type { ClassValue } from "clsx";
import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type InputHTMLAttributes,
  type SetStateAction,
} from "react";
import type { SearchSchema, SortSchema } from "~/server/api/routers/games";
import { cn } from "~/utils/utils";
import { PopoverDialog, type PopoverRef } from "../popoverDialog";

export type GameListFilters = {
  filter: SearchSchema;
  sort: SortSchema;
  take: number;
  /** Page that we are on */
  page: number;
};

type FilterBase<T> = { value: T; onChange(val: T | undefined): void };

type RadioFilter<T> = {
  type: "radio";
  values: [string, T][];
  classNames?: ClassValue[];
} & FilterBase<T>;
type TextFilter = {
  type: "string";
  className?: ClassValue;
} & FilterBase<string>;

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
            {filter.values.map((q, i) => (
              <label
                key={`${label}_${q[0]}`}
                htmlFor={`${label}_${q[0]}`}
                className={cn(
                  "rounded-xl border-1 px-2 py-1",
                  "has-checked:border-(--complement-500)",
                  "hover:backdrop-brightness-(--bg-hover-brightness)",
                  "cursor-pointer",
                  "light:has-checked:bg-(--accent-100)",
                  "has-checked:backdrop-brightness-(--bg-checked-brightness)",
                  filter.classNames?.[i],
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
              className={cn("border-b-1", filter.className)}
            />
          </>
        )}
      </div>
    </>
  );
};

const ASC_ARR = "↑";
const DESC_ARR = "↓";

const SortPicker = ({
  sort,
  onChange,
  userSort,
}: {
  sort: SortSchema;
  onChange: (sort: keyof SortSchema, value: "asc" | "desc" | undefined) => void;
  userSort?: { sort: boolean; toggle(): void };
}) => {
  return (
    <div className="flex flex-col gap-2 px-2">
      {/* List of asc/desc toggles */}
      {userSort && (
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border-1 px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            userSort.sort && "border-(--button-submit-bg)",
            !userSort.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            userSort.toggle();
          }}
        >
          {userSort.sort ? "User-owned first" : "User-owned throughout"}
        </button>
      )}
      <div className="space-around items-align flex w-full gap-2">
        {/* ID */}
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border-1 px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.id?.sort && "border-(--button-submit-bg)",
            !sort.id?.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            // toggle sort.id
            onChange(
              "id",
              !sort.id ? "asc" : sort.id.sort === "asc" ? "desc" : undefined,
            );
          }}
        >
          ID
          {sort.id ? ` ${sort.id.sort === "asc" ? ASC_ARR : DESC_ARR}` : " ="}
        </button>
        {/* TITLE */}
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border-1 px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.title?.sort && "border-(--button-submit-bg)",
            !sort.title?.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            // toggle sort.title
            onChange(
              "title",
              !sort.title
                ? "asc"
                : sort.title.sort === "asc"
                  ? "desc"
                  : undefined,
            );
          }}
        >
          Title
          {sort.title
            ? ` ${sort.title.sort === "asc" ? ASC_ARR : DESC_ARR}`
            : " ="}
        </button>
        {/* Console */}
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border-1 px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.console?.sort && "border-(--button-submit-bg)",
            !sort.console?.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            // toggle sort.console
            onChange(
              "console",
              !sort.console
                ? "asc"
                : sort.console.sort === "asc"
                  ? "desc"
                  : undefined,
            );
          }}
        >
          Console
          {sort.console
            ? ` ${sort.console.sort === "asc" ? ASC_ARR : DESC_ARR}`
            : " ="}
        </button>
        {/* Region */}
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border-1 px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.region?.sort && "border-(--button-submit-bg)",
            !sort.region?.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            // toggle sort.region
            onChange(
              "region",
              !sort.region
                ? "asc"
                : sort.region.sort === "asc"
                  ? "desc"
                  : undefined,
            );
          }}
        >
          Region
          {sort.region
            ? ` ${sort.region.sort === "asc" ? ASC_ARR : DESC_ARR}`
            : " ="}
        </button>
      </div>
    </div>
  );
};

export const FiltersDialog = ({
  filters: initFilters,
  setFilters: saveFilters,
  classNames,
  userSort,
}: {
  filters: GameListFilters;
  setFilters: Dispatch<SetStateAction<GameListFilters>>;
  classNames?: {
    btn?: ClassValue;
    dialog?: ClassValue;
  };
  userSort?: { sort: boolean; toggle: () => void };
}) => {
  const popoverRef = useRef<PopoverRef>(null);
  const [filters, setFilters] = useState(initFilters);
  const [uSortVal, setUSortVal] = useState(userSort?.sort ?? false);
  const uSort = useMemo(() => {
    return { sort: uSortVal, toggle: () => setUSortVal((p) => !p) };
  }, [uSortVal]);

  return (
    <PopoverDialog
      ref={popoverRef}
      Actuator={<button className={cn(classNames?.btn)}>Filter & Sort</button>}
    >
      <form
        className={cn("flex flex-col gap-2")}
        onSubmit={(e) => {
          e.preventDefault();
          if (userSort) {
            if (uSort.sort !== userSort.sort) {
              userSort.toggle();
            }
          }
          console.log("current popoverD ref", popoverRef.current);
          popoverRef.current?.hide();
          saveFilters(filters);
        }}
      >
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
          classNames={[
            undefined,
            "has-checked:border-gray-500 has-checked:text-gray-500",
            "has-checked:border-blue-500 has-checked:text-blue-500",
            "has-checked:border-purple-500 has-checked:text-purple-500",
          ]}
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
          classNames={[
            undefined,
            "has-checked:border-green-500 has-checked:text-green-500",
            "has-checked:border-orange-500 has-checked:text-orange-500",
            "has-checked:border-pink-500 has-checked:text-pink-500",
          ]}
        />
        <h3 className="text-center text-xl text-(--regular-text)">
          Sorting order
        </h3>
        <SortPicker
          sort={filters.sort}
          userSort={userSort ? uSort : undefined}
          onChange={(col, val) => {
            setFilters((p) => {
              let nSort = { ...p.sort };

              if (!val) delete nSort[col];
              else {
                nSort = { [col]: { sort: val, priority: 1 } };
              }

              return {
                ...p,
                sort: {
                  ...nSort,
                },
              };
            });
          }}
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
              setUSortVal(userSort?.sort ?? false);
              setFilters({ ...filters, filter: {}, sort: {} });
            }}
          >
            Reset
          </button>
        </div>
      </form>
    </PopoverDialog>
  );
};
