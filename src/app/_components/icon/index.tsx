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
    <svg fill="none" className={cn(classNames?.svg)} viewBox="0 0 16 10">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        className={cn("stroke-black", classNames?.path)}
        d="m1.707 2.97 5.586 5.295c.188.177.442.277.707.277.265 0 .52-.1.707-.277l5.586-5.294a.934.934 0 0 0 .274-.486.902.902 0 0 0-.057-.547.96.96 0 0 0-.369-.425 1.04 1.04 0 0 0-.555-.16H2.414a1.04 1.04 0 0 0-.555.16.96.96 0 0 0-.369.425.902.902 0 0 0-.057.547.933.933 0 0 0 .274.486Z"
      />
    </svg>
  );
};

export const CaretUp: Icon<"path"> = ({ classNames }) => {
  return (
    <svg fill="none" className={cn(classNames?.svg)} viewBox="0 0 16 10">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        className={cn("stroke-black", classNames?.path)}
        d="M14.086 7.317 8.5 2.023a1.029 1.029 0 0 0-.707-.278c-.265 0-.52.1-.707.278L1.5 7.317a.933.933 0 0 0-.274.485.902.902 0 0 0 .057.548.96.96 0 0 0 .369.425c.164.104.357.16.555.16h11.172c.198 0 .391-.056.556-.16a.96.96 0 0 0 .368-.425.902.902 0 0 0 .057-.548.934.934 0 0 0-.274-.485Z"
      />
    </svg>
  );
};
