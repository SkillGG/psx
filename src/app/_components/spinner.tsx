import { cn } from "~/utils/utils";
import type { ClassValue } from "clsx";
import type { CSSProperties } from "react";
import type { XCSSProperties } from "~/css";

export const Spinner = ({
  className,
  color,
  width,
}: {
  color?: CSSProperties["color"];
  width?: CSSProperties["borderWidth"];
  className?: ClassValue;
}) => {
  const styles: XCSSProperties = {
    "--spinner-width": width ?? "4px",
  };

  if (color) styles["--spinner-color"] = color;

  return (
    <div
      style={styles}
      className={cn(
        "h-8 w-8 animate-spin rounded-full border-(length:--spinner-width) border-(--spinner-color) border-t-transparent",
        className,
      )}
      aria-label="Loading spinner"
    />
  );
};
