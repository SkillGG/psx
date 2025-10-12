import type { CSSProperties } from "react";

export type XCSSProperties = CSSProperties &
  Record<`--${string}`, CSSProperties[keyof CSSProperties]>;
