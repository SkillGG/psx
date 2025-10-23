import type { ClassValue } from "clsx";
import React, {
  cloneElement,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "~/utils/utils";
import type { PopoverActuator } from "./popoverDialog";

const DEFAULT_QUICK_POPUP_STYLES = cn(
  "absolute rounded-xl border border-(--regular-border) bg-(--dialog-bg)/50 p-6 shadow-lg backdrop-blur-sm text-(--regular-text)",
);

export type QuickRef = {
  toggle: () => void;
  show: () => void;
  hide: () => void;
  getElement: () => HTMLElement | null;
  getActuator: () => PopoverActuator;
  enableAutoHide: () => void;
  disableAutoHide: () => void;
};

function getAnchorValue(
  calculateAnchor: CalculateAnchorFunction | undefined,
  { clientX, clientY }: { clientX: number; clientY: number },
  elementRef: React.RefObject<HTMLDivElement | null>,
  actuator: HTMLElement,
  childSize: [number, number],
) {
  if (!elementRef.current) return [0, 0];
  const calcAnchor = calculateAnchor ?? (({ x, y }) => [x, y]);
  const actSize = actuator.getBoundingClientRect();
  const mainSize = elementRef.current.getBoundingClientRect();
  const anch = calcAnchor(
    { x: clientX, y: clientY },
    {
      actuator,
      main: elementRef.current,
    },
    {
      actuator: [actSize.width, actSize.height],
      main: [mainSize.width || childSize[0], mainSize.height || childSize[1]],
    },
  );
  return anch;
}

type CalculateAnchorFunction = (
  clickPos: { x: number; y: number },
  elements: { actuator: HTMLElement; main: HTMLDivElement },
  sizes: { actuator: [number, number]; main: [number, number] },
) => [number, number];

export const QuickPopover = ({
  className,
  children,
  standalone,
  Actuator,
  ref,
  hideBehavior = "auto",
  calculateAnchor,
}: PropsWithChildren<{
  standalone?: boolean | string;
  className?: ClassValue;
  hideBehavior?: "auto" | "manual";
  Actuator: PopoverActuator;
  ref?: RefObject<QuickRef | null>;
  calculateAnchor?: CalculateAnchorFunction;
}>) => {
  const elementRef = useRef<HTMLDivElement>(null);

  const [anchor, setAnchor] = useState([0, 0]);
  const [childSize, setChildSize] = useState<[number, number]>([0, 0]);
  const [actuatorEl, setActuatorEl] = useState<HTMLElement | null>(null);
  const [clickPos, setClickPos] = useState<[number, number]>([0, 0]);

  const actuatorElement = useMemo(() => {
    return cloneElement(Actuator, {
      onClick: (e) => {
        setActuatorEl(e.currentTarget as HTMLElement);
        if (!elementRef.current) return;
        setClickPos([e.clientX, e.clientY]);
        Actuator.props.onClick?.(e);
        elementRef.current?.showPopover();
      },
    });
  }, [Actuator]);

  useImperativeHandle(ref, () => {
    return {
      hide: () => {
        elementRef.current?.hidePopover();
      },
      show: () => {
        elementRef.current?.showPopover();
      },
      toggle: () => {
        elementRef.current?.togglePopover();
      },
      getActuator: () => actuatorElement,
      getElement: () => elementRef.current,
      disableAutoHide: () => {
        if (elementRef.current) {
          elementRef.current.popover = "manual";
          elementRef.current.showPopover();
        }
      },
      enableAutoHide: () => {
        if (elementRef.current) {
          elementRef.current.popover = "auto";
          elementRef.current.showPopover();
        }
      },
    };
  });

  useEffect(() => {
    if (!elementRef.current) return;
    // onpopoverstatechanged
    elementRef.current.ontoggle = (e) => {
      if (!elementRef.current || !actuatorEl) return;
      const ref = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (ref.width && ref.height) setChildSize([ref.width, ref.height]);
      const anch = getAnchorValue(
        calculateAnchor,
        { clientX: clickPos[0], clientY: clickPos[1] },
        elementRef,
        actuatorEl,
        childSize,
      );
      setAnchor(anch);
    };
  }, [actuatorEl, calculateAnchor, childSize, clickPos]);

  const transform = standalone
    ? (p: ReactNode) => {
        return createPortal(
          p,
          typeof standalone === "boolean"
            ? document.body
            : (document.body.querySelector(standalone) ?? document.body),
        );
      }
    : (p: ReactNode) => p;

  return (
    <>
      {transform(
        <div
          popover={hideBehavior}
          ref={elementRef}
          className={cn(DEFAULT_QUICK_POPUP_STYLES, className)}
          style={{
            left: anchor[0] + "px",
            top: anchor[1] + "px",
          }}
        >
          {children}
        </div>,
      )}
      {actuatorElement}
    </>
  );
};
