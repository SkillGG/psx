import type { ClassValue } from "clsx";
import { cn } from "~/utils/utils";

export type Icon<
  Ts extends string = "svg",
  Extra extends Record<Ts, ClassValue> = Record<Ts, ClassValue>,
> = (props: {
  classNames?: { svg?: ClassValue } & Partial<Extra>;
}) => React.ReactNode;

export const CaretDown: Icon<"path"> = ({ classNames }) => {
  return (
    <svg className={cn(`fill-none`, classNames?.svg)} viewBox="0 0 16 10">
      <path
        className={cn(
          "stroke-black stroke-2 [stroke-linecap:round] [stroke-linejoin:round]",
          classNames?.path,
        )}
        d="m1.707 2.97 5.586 5.295c.188.177.442.277.707.277.265 0 .52-.1.707-.277l5.586-5.294a.934.934 0 0 0 .274-.486.902.902 0 0 0-.057-.547.96.96 0 0 0-.369-.425 1.04 1.04 0 0 0-.555-.16H2.414a1.04 1.04 0 0 0-.555.16.96.96 0 0 0-.369.425.902.902 0 0 0-.057.547.933.933 0 0 0 .274.486Z"
      />
    </svg>
  );
};

export const CaretUp: Icon<"path"> = ({ classNames }) => {
  return (
    <svg className={cn("fill-none", classNames?.svg)} viewBox="0 0 16 10">
      <path
        className={cn(
          "stroke-black stroke-2 [stroke-linecap:round] [stroke-linejoin:round]",
          classNames?.path,
        )}
        d="M14.086 7.317 8.5 2.023a1.029 1.029 0 0 0-.707-.278c-.265 0-.52.1-.707.278L1.5 7.317a.933.933 0 0 0-.274.485.902.902 0 0 0 .057.548.96.96 0 0 0 .369.425c.164.104.357.16.555.16h11.172c.198 0 .391-.056.556-.16a.96.96 0 0 0 .368-.425.902.902 0 0 0 .057-.548.934.934 0 0 0-.274-.485Z"
      />
    </svg>
  );
};

export const OwnedIcon: Icon<"path"> = ({}) => {
  return <span className="font-bold text-green-500">✓</span>;
};

export const NotOwnedIcon: Icon = ({}) => {
  return <span className="font-bold text-red-500">X</span>;
};

export const LinkIcon: Icon<"llink" | "rlink" | "dot"> = ({ classNames }) => {
  return (
    <svg
      className={cn(
        "fill-none stroke-black stroke-2 [stroke-linecap:round] [stroke-linejoin:round]",
        classNames?.svg,
      )}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path d="M9 17H7A5 5 0 0 1 7 7h2" className={cn(classNames?.llink)} />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" className={cn(classNames?.rlink)} />
      <line x1="8" x2="16" y1="12" y2="12" className={cn(classNames?.dot)} />
    </svg>
  );
};

export const UnlinkIcon: Icon<"llink" | "rlink" | "dot" | "strikethrough"> = ({
  classNames,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={cn(
        "fill-none stroke-black stroke-2 [stroke-linecap:round] [stroke-linejoin:round]",
        classNames?.svg,
      )}
    >
      <path d="M9 17H7A5 5 0 0 1 7 7" className={cn(classNames?.llink)} />
      <path d="M15 7h2a5 5 0 0 1 4 8" className={cn(classNames?.rlink)} />
      <line x1="8" x2="12" y1="12" y2="12" className={cn(classNames?.dot)} />
      <line
        x1="2"
        x2="22"
        y1="2"
        y2="22"
        className={cn(classNames?.strikethrough)}
      />
    </svg>
  );
};
