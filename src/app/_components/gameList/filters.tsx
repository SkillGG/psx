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
import { PopoverDialog, type PopoverRef } from "../popoverDialog";
import { DEFAULT_SORT } from ".";

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
                  "rounded-xl border px-2 py-1",
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
              className={cn("border-b", filter.className)}
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
  onColumnChange,
  onOwnershipSortChange,
  showUserSort,
}: {
  sort: SortSchema;
  onColumnChange: (
    sort: keyof SortSchema["columns"],
    value: "asc" | "desc" | undefined,
  ) => void;
  onOwnershipSortChange: () => void;
  showUserSort: boolean;
}) => {
  return (
    <div className="flex flex-col gap-2 px-2">
      {/* List of asc/desc toggles */}
      {showUserSort && (
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.ownership && "border-(--button-submit-bg)",
            !sort.ownership && "border-(--neutral-500)",
          )}
          onClick={() => {
            onOwnershipSortChange();
          }}
        >
          {sort.ownership ? "User-owned first" : "User-owned throughout"}
        </button>
      )}
      <div className="space-around items-align flex w-full gap-2">
        {/* ID */}
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.columns.id?.sort && "border-(--button-submit-bg)",
            !sort.columns.id?.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            // toggle sort.id
            onColumnChange(
              "id",
              !sort.columns.id
                ? "asc"
                : sort.columns.id.sort === "asc"
                  ? "desc"
                  : undefined,
            );
          }}
        >
          ID
          {sort.columns.id
            ? ` ${sort.columns.id.sort === "asc" ? ASC_ARR : DESC_ARR}`
            : " ="}
        </button>
        {/* TITLE */}
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.columns.title?.sort && "border-(--button-submit-bg)",
            !sort.columns.title?.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            // toggle sort.title
            onColumnChange(
              "title",
              !sort.columns.title
                ? "asc"
                : sort.columns.title.sort === "asc"
                  ? "desc"
                  : undefined,
            );
          }}
        >
          Title
          {sort.columns.title
            ? ` ${sort.columns.title.sort === "asc" ? ASC_ARR : DESC_ARR}`
            : " ="}
        </button>
        {/* Console */}
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.columns.console?.sort && "border-(--button-submit-bg)",
            !sort.columns.console?.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            // toggle sort.console
            onColumnChange(
              "console",
              !sort.columns.console
                ? "asc"
                : sort.columns.console.sort === "asc"
                  ? "desc"
                  : undefined,
            );
          }}
        >
          Console
          {sort.columns.console
            ? ` ${sort.columns.console.sort === "asc" ? ASC_ARR : DESC_ARR}`
            : " ="}
        </button>
        {/* Region */}
        <button
          type="button"
          className={cn(
            "block cursor-pointer rounded-xl border px-2 py-1",
            "text-center whitespace-nowrap hover:backdrop-brightness-(--bg-hover-brightness)",
            sort.columns.region?.sort && "border-(--button-submit-bg)",
            !sort.columns.region?.sort && "border-(--neutral-500)",
          )}
          onClick={() => {
            // toggle sort.region
            onColumnChange(
              "region",
              !sort.columns.region
                ? "asc"
                : sort.columns.region.sort === "asc"
                  ? "desc"
                  : undefined,
            );
          }}
        >
          Region
          {sort.columns.region
            ? ` ${sort.columns.region.sort === "asc" ? ASC_ARR : DESC_ARR}`
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
  showUserSearch,
}: {
  filters: GameListFilters;
  setFilters: Dispatch<SetStateAction<GameListFilters>>;
  classNames?: {
    btns?: { save?: ClassValue; reset?: ClassValue; open?: ClassValue };
    dialog?: ClassValue;
  };
  showUserSearch?: boolean;
}) => {
  const popoverRef = useRef<PopoverRef>(null);
  const [filters, setFilters] = useState(initFilters);
  return (
    <PopoverDialog
      ref={popoverRef}
      Actuator={
        <button className={cn(classNames?.btns?.open)}>Filter & Sort</button>
      }
    >
      <form
        className={cn("flex flex-col gap-2")}
        onSubmit={(e) => {
          e.preventDefault();
          popoverRef.current?.hide();
          saveFilters({ ...filters, page: 0 });
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
        <div>
          Show on page:{" "}
          <input
            value={filters.take}
            onChange={(e) => {
              const value = e.currentTarget.value;
              if (!value) return;
              setFilters((p) => {
                return { ...p, take: +value || 100 };
              });
            }}
          />
        </div>
        <h3 className="text-center text-xl text-(--regular-text)">
          Sorting order
        </h3>
        <SortPicker
          showUserSort={!!showUserSearch}
          sort={filters.sort}
          onOwnershipSortChange={() => {
            setFilters((p) => {
              return {
                ...p,
                sort: { ...p.sort, ownership: !p.sort.ownership },
              };
            });
          }}
          onColumnChange={(col, val) => {
            setFilters((p) => {
              let nSort = { ...p.sort };

              if (!val) delete nSort.columns[col];
              else {
                nSort = {
                  ...nSort,
                  columns: {
                    [col]: {
                      sort: val,
                      priority:
                        Object.entries(nSort.columns)
                          .map(([_, v]) => {
                            return v.priority;
                          })
                          .reduce((p, n) => Math.max(p, n), 0) + 1,
                    },
                  },
                };
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
              "w-full cursor-pointer border",
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
              "w-full cursor-pointer border",
              "border-(--button-remove-bg) px-2 py-1",
              "text-(--button-remove-nobg-text)",
              "hover:backdrop-brightness-(--bg-hover-brightness)",
            )}
            onClick={() => {
              setFilters({ ...filters, filter: {}, sort: DEFAULT_SORT });
            }}
          >
            Reset
          </button>
        </div>
      </form>
    </PopoverDialog>
  );
};
