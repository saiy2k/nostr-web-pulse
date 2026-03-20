import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import "nostr-components/themes/dark";
import "nostr-components/themes";
import NostrSupportActions from "./components/NostrSupportActions";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nostr Web Pulse",
  description:
    "See which websites the Nostr community is reacting to and zapping.",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <header className="border-b border-foreground/10">
          <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80">
              <span className="text-xl font-bold tracking-tight">
                Nostr Web Pulse
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <p className="hidden sm:block text-sm text-foreground/50 max-w-[220px] text-right">
                Reactions &amp; zaps across the open web
              </p>
              <Suspense
                fallback={
                  <div
                    className="h-9 min-w-[180px] rounded-md bg-foreground/5 animate-pulse"
                    aria-hidden
                  />
                }
              >
                <NostrSupportActions />
              </Suspense>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-6 pt-6 text-center text-sm text-foreground/50 border-t border-foreground/10">
          <div>
            Vibe coded with <span className="text-red-500">♥</span> by{' '}
            <a
              href="https://x.com/saiy2k"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              @saiy2k
            </a>
          </div>
          <div className="mt-1">
            <a
              href="https://github.com/saiy2k/nostr-web-pulse"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Source on GitHub
            </a>
          </div>
          <div className="mt-1">
            Firebase Firestore acts as a cache layer for this website, rather than fetching directly from nostr relays.
          </div>
        </footer>
      </body>
    </html>
  );
}
