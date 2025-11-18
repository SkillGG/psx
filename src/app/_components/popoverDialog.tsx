import type { ClassValue } from "clsx";
import React, {
  cloneElement,
  useImperativeHandle,
  useMemo,
  useRef,
  type MouseEventHandler,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "~/utils/utils";

const DEFAULT_POPUP_DIALOG_STYLES = cn(
  "m-auto min-w-[50%] rounded-xl border border-(--regular-border) bg-(--dialog-bg)/50 p-6 shadow-lg backdrop-blur-sm text-(--regular-text)",
);

export type PopoverActuator = ReactElement<{
  onClick?: MouseEventHandler;
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
  onMouseMove?: MouseEventHandler;
}>;

export type PopoverRef = {
  toggle: () => void;
  show: () => void;
  hide: () => void;
  getDialog: () => HTMLDialogElement | null;
  getActuator: () => ReactElement<{
    onClick?: MouseEventHandler;
  }>;
  enableAutoHide: () => void;
  disableAutoHide: () => void;
};

export const PopoverDialog = ({
  className,
  children,
  standalone,
  Actuator,
  ref,
  hideBehavior = "auto",
}: PropsWithChildren<{
  standalone?: boolean | string;
  className?: ClassValue;
  hideBehavior?: "auto" | "manual";
  Actuator: ReactElement<{
    onClick?: MouseEventHandler;
  }>;
  ref?: RefObject<PopoverRef | null>;
}>) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const actuatorElement = useMemo(() => {
    return cloneElement(Actuator, {
      onClick: (e) => {
        Actuator.props.onClick?.(e);
        dialogRef.current?.showPopover();
      },
    });
  }, [Actuator]);

  useImperativeHandle(ref, () => {
    return {
      hide: () => {
        dialogRef.current?.hidePopover();
      },
      show: () => {
        dialogRef.current?.showPopover();
      },
      toggle: () => {
        dialogRef.current?.togglePopover();
      },
      getActuator: () => actuatorElement,
      getDialog: () => dialogRef.current,
      disableAutoHide: () => {
        if (dialogRef.current) {
          dialogRef.current.popover = "manual";
          dialogRef.current.showPopover();
        }
      },
      enableAutoHide: () => {
        if (dialogRef.current) {
          dialogRef.current.popover = "auto";
          dialogRef.current.showPopover();
        }
      },
    };
  });

  const dialogTransform = standalone
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
      {dialogTransform(
        <dialog
          popover={hideBehavior}
          ref={dialogRef}
          className={cn(DEFAULT_POPUP_DIALOG_STYLES, className)}
        >
          {children}
        </dialog>,
      )}
      {actuatorElement}
    </>
  );
};
