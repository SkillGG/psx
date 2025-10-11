import { cn } from "~/utils/utils";

export const LoadPage = () => {
  return (
    <main
      className={cn(
        "flex h-screen w-full items-center justify-center bg-(color:--main-bg) text-(--label-text)",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center rounded-xl border-1 border-(--regular-border) px-8 py-8 shadow-lg",
        )}
      >
        Loading...
      </div>
    </main>
  );
};
