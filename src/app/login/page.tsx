"use client";

import { useUser } from "../hooks/user";
import { useEffect, useState } from "react";
import { cn } from "~/utils/utils";
import { api } from "~/trpc/react";
import { SERVER_ERROR_MESSAGE } from "~/utils/server_errors";
import DarkModeSwitch, { AccentSwitch } from "../_components/themeSwitches";
import Link from "next/link";
import { useGoBack } from "../hooks/goBack";
import { useSearchParams } from "next/navigation";

const LoginForm = () => {
  const searchParams = useSearchParams();

  const [pass, setPass] = useState<string>("");
  const [login, setLogin] = useState<string>(searchParams.get("ras") ?? "");

  const { backParam, goBack } = useGoBack();

  const loginMutation = api.user.login.useMutation();

  const [err, setError] = useState("");
  const [capslock, setCapslock] = useState(false);
  const [show, setShow] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("ras")) {
      setToast("Registration successful!");
      const hideToastTimeout = setTimeout(() => {
        setToast(null);
        history.replaceState(null, "", "/login");
      }, 1000);
      return () => {
        clearTimeout(hideToastTimeout);
      };
    }
  }, [searchParams]);

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-(--deeper-bg)",
      )}
    >
      {toast && (
        <div
          className={cn(
            "absolute top-4 right-4 z-50 max-w-xs min-w-[220px] rounded-lg px-4 py-3",
            "border-2 border-(--register-success-border) bg-(--register-success-bg) text-(--label-text) shadow-lg",
            "flex items-center justify-between gap-4",
          )}
          role="alert"
          onClick={() => setToast(null)}
          style={{ cursor: "pointer" }}
        >
          <span
            className={cn(
              "flex-1 text-sm font-medium text-(--login-green-text)",
            )}
          >
            {toast}
          </span>
        </div>
      )}
      <form
        className={cn(
          "flex flex-col rounded-xl border border-slate-300 bg-white px-8 py-8",
          "shadow-lg dark:border-slate-700 dark:bg-slate-800",
        )}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!e.currentTarget.checkValidity()) {
            return;
          }

          const loginSuccess = await loginMutation.mutateAsync({
            login,
            pass,
          });
          if (loginSuccess) {
            setError(SERVER_ERROR_MESSAGE[loginSuccess.err]);
          } else {
            goBack();
          }
        }}
      >
        <label className={cn("flex flex-col gap-2")} htmlFor="pass">
          <div
            className={cn(
              "mb-0 flex items-center gap-2",
              "text-base font-medium text-(--label-text)",
            )}
          >
            Login:
            <AccentSwitch className={cn("ml-auto h-4 w-4")} />
            <DarkModeSwitch />
          </div>
          <div
            className={cn(
              "rounded-md ring-(color:--input-focus-border) focus-within:ring-2",
              capslock && "ring-(color:--input-warn-border)",
            )}
          >
            <input
              required
              className={cn(
                "w-full rounded-md border",
                "border-(--input-border) bg-(--input-bg) px-3 py-2",
                "focus:ring-0 focus:outline-none",
                err && "border-(--input-error-border)",
                "text-(--input-text)",
              )}
              onChange={(e) => {
                setError("");
                setLogin(e.currentTarget.value);
              }}
              onKeyDown={(k) => {
                setCapslock(k.getModifierState("CapsLock"));
              }}
              id="login"
              value={login}
              autoFocus
            />
          </div>
        </label>
        <label className={cn("mt-2 flex flex-col gap-2")} htmlFor="pass">
          <div
            className={cn(
              "mb-0 flex items-center gap-2",
              "text-base font-medium text-(--label-text)",
            )}
          >
            Password:
          </div>
          <div
            className={cn(
              "rounded-md ring-(color:--input-focus-border) focus-within:ring-2",
              capslock && "ring-(color:--input-warn-border)",
            )}
          >
            <input
              required
              type={show ? "text" : "password"}
              className={cn(
                "rounded-md rounded-r-none border border-r-0",
                "border-(--input-border) bg-(--input-bg) px-3 py-2",
                "text-(--label-text) focus:ring-0 focus:outline-none",
                err && "border-(--input-error-border)",
                !show && "text-(--input-text)",
              )}
              onChange={(e) => {
                setError("");
                setPass(e.currentTarget.value);
              }}
              onKeyDown={(k) => {
                setCapslock(k.getModifierState("CapsLock"));
              }}
              id="pass"
              value={pass}
            />
            <button
              type="button"
              onClick={(e) => {
                (
                  e.currentTarget.previousElementSibling as HTMLElement | null
                )?.focus({ preventScroll: true });
                setShow((p) => !p);
              }}
              className={cn(
                "border border-l-0 border-(--input-border) bg-(--input-bg)",
                "rounded-md rounded-l-none px-4 py-2 font-semibold hover:bg-(--button-submit-bg)",
                "cursor-pointer text-(--label-text) hover:text-(--button-submit-text)",
                "focus:bg-(--button-submit-bg) focus:outline-0",
                "disabled:cursor-not-allowed disabled:opacity-50",
                capslock && "text-(--notice-700)",
                err && "border-(--input-error-border)",
              )}
            >
              {capslock ? "CAPS!" : show ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        {err && (
          <div
            className={cn("mt-1 text-right text-sm font-semibold text-red-500")}
          >
            {err}
          </div>
        )}
        <div className="mt-3 flex w-full gap-4">
          <button
            type="submit"
            className={cn(
              "rounded-md bg-(--button-submit-bg) px-4 py-2 font-semibold",
              "w-full basis-[200%] cursor-pointer text-(--button-submit-text)",
              "hover:bg-(--button-submit-hover-bg)",
              "focus:ring-2 focus:ring-(color:--input-focus-border) focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </button>
          <Link
            href={`/register${backParam}`}
            className={cn(
              "rounded-md bg-(--button-submit-bg) px-4 py-2 text-center font-semibold",
              "w-full cursor-pointer text-(--button-submit-text)",
              "hover:bg-(--button-submit-hover-bg)",
              "focus:ring-2 focus:ring-(color:--input-focus-border) focus:outline-none",
            )}
          >
            Register
          </Link>
        </div>
      </form>
    </div>
  );
};

export default function LoginPage() {
  const user = useUser();
  const { goBack } = useGoBack();

  if (user.logged) {
    goBack();
    return <></>;
  }

  return <LoginForm />;
}
