import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "KitchenSlip",
  description: "Turn a vendor paper slip into a kitchen order.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full font-[family-name:var(--font-sans)] text-[var(--ink)]">
        <header className="mx-auto flex w-full max-w-6xl items-end justify-between px-6 pt-8 pb-4">
          <Link href="/" className="block">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--moss)]">For the pass</p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl italic leading-none">
              KitchenSlip
            </h1>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/" className="hover:text-[var(--rust)]">
              New slip
            </Link>
            <Link href="/orders" className="hover:text-[var(--rust)]">
              Orders
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-6 pb-16">{children}</main>
      </body>
    </html>
  );
}
