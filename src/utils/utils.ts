import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import z from "zod";

export const randomString = (len: number) => {
  const randomVs = new Uint32Array(len);
  crypto.getRandomValues(randomVs);
  return Array.from(randomVs)
    .map((q) => String.fromCharCode((q % 89) + 37))
    .join("");
};
export const hash = async (
  text: string,
  nfo: string[] | { salt: string },
): Promise<{ hash: string; salt: string }> => {
  const salt = !Array.isArray(nfo)
    ? nfo.salt
    : nfo.reduce<string>((p, n) => p + n.substring(0, 4), "") +
      randomString(10);
  const tbuff = new TextEncoder().encode(salt + text);
  const cbuff = await crypto.subtle.digest("SHA-256", tbuff);
  const hashArray = Array.from(new Uint8Array(cbuff));
  const hash = hashArray
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
  return { hash, salt };
};

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const zodStringToJson = z.string().transform((val, { issues }) => {
  try {
    return JSON.parse(val) as unknown;
  } catch {
    issues.push({
      code: "custom",
      message: "Invalid JSON",
      input: val,
    });

    return z.NEVER;
  }
});
export const isNotNull = <T>(v: T | null | undefined): v is NonNullable<T> =>
  !!v;
