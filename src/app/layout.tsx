import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "./hooks/theme";
import { UserProvider } from "./hooks/user";

export const metadata: Metadata = {
  title: "PS Game Library",
  description: "An app to keep track of owned PS1, PS2 and PSP games.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <ThemeProvider>
            <UserProvider>{children}</UserProvider>
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
