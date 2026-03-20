import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <header className="border-b border-foreground/10">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80">
              <span className="text-xl font-bold tracking-tight">
                Nostr Web Pulse
              </span>
            </Link>
            <p className="hidden sm:block text-sm text-foreground/50">
              Reactions &amp; zaps across the open web
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
