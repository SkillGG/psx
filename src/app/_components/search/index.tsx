import { useEffect, useRef, useState } from "react";
import { useDebounce } from "~/app/hooks/debounce";
import { api } from "~/trpc/react";
import { Spinner } from "../spinner";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "~/utils/utils";

const setPopoverOver = (parent: HTMLInputElement, popover: HTMLElement) => {
  const bBox = parent.getBoundingClientRect();
  popover.style.top = `${bBox.bottom}px`;
  popover.style.left = `${bBox.left - 2}px`;
  popover.style.width = `${bBox.width + 4}px`;
};

export const SearchBar = () => {
  const pageProps = useParams();
  const curOnID = "userid" in pageProps ? pageProps.userid : null;
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const searchResults = api.user.searchUser.useQuery(
    debouncedSearch.trim().toLowerCase(),
    {
      enabled: !!debouncedSearch.trim(),
    },
  );

  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showPopover = () => {
    if (!popoverRef.current || !inputRef.current) return;
    setPopoverOver(inputRef.current, popoverRef.current);
    popoverRef.current.showPopover();
  };

  useEffect(() => {
    function fn() {
      if (!popoverRef.current || !inputRef.current) return;
      setPopoverOver(inputRef.current, popoverRef.current);
    }
    window.addEventListener("resize", fn);
    return () => {
      window.removeEventListener("resize", fn);
    };
  }, []);

  useEffect(() => {
    console.log("Searching for: ", debouncedSearch);
    if (!!debouncedSearch) showPopover();
    if (!debouncedSearch) popoverRef.current?.hidePopover();
  }, [debouncedSearch]);

  return (
    <>
      <input
        ref={inputRef}
        onChange={(e) => setSearch(e.currentTarget.value)}
        value={search}
        placeholder="User search"
        className="border-b border-dotted px-2"
        onClick={() => searchResults.data && showPopover()}
      />
      <div
        popover="auto"
        ref={popoverRef}
        className="border-2 border-(--regular-border) text-(--regular-text)"
      >
        {searchResults.isFetching && (
          <div className="bg-(--dialog-bg) py-2">
            <Spinner className="mx-auto" />
          </div>
        )}
        {searchResults.isFetched &&
          !searchResults.isFetching &&
          searchResults.data && (
            <ul className="list-none rounded-xl">
              {searchResults.data.map(({ id, nick }) => (
                <li
                  key={id}
                  className="w-full border-b border-(--regular-border) bg-(--dialog-bg) last:border-none even:brightness-150"
                >
                  <Link
                    href={`/profile/${id}`}
                    className={cn(
                      "block h-full w-full py-2 text-center",
                      curOnID === id &&
                        "cursor-not-allowed text-(--complement-500) italic",
                      "hover:backdrop-brightness-(--bg-hover-brightness)",
                    )}
                  >
                    {nick}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        {searchResults.isFetched &&
          !searchResults.isFetching &&
          !searchResults.data?.length && (
            <div className="bg-(--dialog-bg) py-2 text-center text-(--warn-500)">
              No results found
            </div>
          )}
      </div>
    </>
  );
};
