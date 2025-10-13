import type { Game } from "@prisma/client";
import type { ClassValue } from "clsx";
import { cn } from "~/utils/utils";

type Strings = { game: Game } | { raw: Record<keyof Game, string> };

export const GameRow = ({
  classNames,
  ...props
}: Strings & {
  classNames?: Partial<Record<keyof Game, ClassValue>> & { all?: ClassValue };
}) => {
  const strings = "game" in props ? props.game : props.raw;

  return (
    <>
      <div className={cn("col-1", classNames?.all, classNames?.id)}>
        {strings.id}
      </div>
      <div className={cn("col-2", classNames?.all, classNames?.console)}>
        {strings.console}
      </div>
      <div className={cn("col-3", classNames?.all, classNames?.region)}>
        {strings.region}
      </div>
      <div className={cn("col-4", classNames?.all, classNames?.title)}>
        {strings.title}
      </div>
    </>
  );
};
