import { cn } from "~/utils/utils";
import { Spinner } from "./spinner";
import type { ClassValue } from "clsx";

export const LoadPage = ({ className }: { className?: ClassValue }) => {
  return (
    <main
      className={cn(
        "flex h-screen w-full items-center justify-center bg-(color:--main-bg) text-(--label-text)",
        className,
      )}
    >
      <Spinner className={"h-10 w-10"} width={"6px"} />
    </main>
  );
};
