"use client";

import { useUser } from "../hooks/user";
import { useState } from "react";
import { cn } from "~/utils/utils";
import { api } from "~/trpc/react";
import DarkModeSwitch, { AccentSwitch } from "../_components/themeSwitches";
import Link from "next/link";
import { useGoBack } from "../hooks/goBack";
import { SERVER_ERROR_MESSAGE, SERVER_ERRS } from "~/utils/server_errors";

const NO_ERR = [false, false, false, false] as [
  boolean,
  boolean,
  boolean,
  boolean,
];

const serverErrToFields = (
  err: (typeof SERVER_ERRS)[keyof typeof SERVER_ERRS],
): typeof NO_ERR => {
  switch (err) {
    case SERVER_ERRS.INVALID_USERNAME_OR_PASSWORD:
    case SERVER_ERRS.USER_EXISTS:
      return [true, true, true, true];
    case SERVER_ERRS.USER_WITH_LOGIN_EXISTS:
    case SERVER_ERRS.INVALID_USERNAME:
      return [true, false, false, false];
    case SERVER_ERRS.USER_WITH_MAIL_EXISTS:
    case SERVER_ERRS.INVALID_EMAIL:
      return [false, true, false, false];
    case SERVER_ERRS.INVALID_PASSWORD:
    case SERVER_ERRS.PASSWORD_TOO_SHORT:
    case SERVER_ERRS.PASSWORD_WITH_INVALID_CHARACTERS:
      return [false, false, true, true];
    default:
      return NO_ERR;
  }
};

const RegisterForm = () => {
  const [pass, setPass] = useState<string>("");
  const [redoPass, setRedoPass] = useState<string>("");
  const [login, setLogin] = useState<string>("");
  const [mail, setMail] = useState<string>("");
  const [err, setError] = useState("");
  const [errFields, setErrFields] = useState(NO_ERR);
  const [capslock, setCapslock] = useState(false);
  const [show, setShow] = useState(false);

  const { backParam, goBack } = useGoBack();
  const registerMutation = api.user.register.useMutation();

  const clearErrors = () => {
    setError("");
    setErrFields(NO_ERR);
  };

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-(--deeper-bg)",
      )}
    >
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
          if (pass !== redoPass) {
            setErrFields([false, false, true, true]);
            setError("Passwords are different!");
            return;
          }

          const registered = await registerMutation.mutateAsync({
            email: mail,
            login,
            pass,
          });

          if (registered) {
            setError(SERVER_ERROR_MESSAGE[registered.err]);
            setErrFields(serverErrToFields(registered.err));
          } else {
            goBack({ path: `/login?ras=${login}` });
          }
        }}
      >
        <label className={cn("flex flex-col gap-2")} htmlFor="login">
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
                errFields[0] && "border-(--input-error-border)",
                "text-(--input-text)",
              )}
              onChange={(e) => {
                clearErrors();
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
        <label className={cn("mt-2 flex flex-col gap-2")} htmlFor="mail">
          <div
            className={cn(
              "mb-0 flex items-center gap-2",
              "text-base font-medium text-(--label-text)",
            )}
          >
            E-mail:
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
                errFields[1] && "border-(--input-error-border)",
                "text-(--input-text)",
              )}
              onChange={(e) => {
                clearErrors();
                setMail(e.currentTarget.value);
              }}
              onKeyDown={(k) => {
                setCapslock(k.getModifierState("CapsLock"));
              }}
              id="mail"
              value={mail}
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
                errFields[2] && "border-(--input-error-border)",
                !show && "text-(--input-text)",
              )}
              onChange={(e) => {
                clearErrors();
                setPass(e.currentTarget.value);
              }}
              onKeyDown={(k) => {
                setCapslock(k.getModifierState("CapsLock"));
              }}
              id="pass"
              value={pass}
              autoFocus
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
                errFields[2] && "border-(--input-error-border)",
              )}
            >
              {capslock ? "CAPS!" : show ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <label className={cn("mt-2 flex flex-col gap-2")} htmlFor="repass">
          <div
            className={cn(
              "mb-0 flex items-center gap-2",
              "text-base font-medium text-(--label-text)",
            )}
          >
            Confirm password:
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
                errFields[3] && "border-(--input-error-border)",
                !show && "text-(--input-text)",
              )}
              onChange={(e) => {
                clearErrors();
                setRedoPass(e.currentTarget.value);
              }}
              onKeyDown={(k) => {
                setCapslock(k.getModifierState("CapsLock"));
              }}
              id="repass"
              value={redoPass}
              autoFocus
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
                errFields[3] && "border-(--input-error-border)",
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
            {err
              .split("")
              .map((q, i) => (q === "\n" ? <br key={`err_break${i}`} /> : q))}
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
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? "Registering..." : "Register"}
          </button>
          <Link
            href={`/login${backParam}`}
            className={cn(
              "rounded-md bg-(--button-submit-bg) px-4 py-2 text-center font-semibold",
              "w-full cursor-pointer text-(--button-submit-text)",
              "hover:bg-(--button-submit-hover-bg)",
              "focus:ring-2 focus:ring-(color:--input-focus-border) focus:outline-none",
            )}
          >
            Login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default function Page() {
  const user = useUser();
  const { goBack } = useGoBack();

  if (user.logged) {
    goBack();
    return <></>;
  }

  return <RegisterForm />;
}
