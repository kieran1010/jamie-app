import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "Tutorly — find a tutor near you",
  description:
    "Search UK tutors by subject, level, area and availability, then request a lesson.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en-GB">
      <body className="min-h-screen antialiased">
        <header className="border-b border-ink-200 bg-white">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-brand-700">
              Tutorly
            </Link>
            <Link href="/search" className="text-sm font-medium text-ink-600 hover:text-ink-900">
              Find a tutor
            </Link>

            <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-ink-600 hover:text-ink-900"
                  >
                    Dashboard
                  </Link>
                  {user.role === "ADMIN" ? (
                    <Link
                      href="/admin"
                      className="text-sm font-medium text-ink-600 hover:text-ink-900"
                    >
                      Admin
                    </Link>
                  ) : null}
                  <span className="text-sm text-ink-400">{user.name}</span>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="text-sm font-medium text-ink-600 underline-offset-2 hover:text-ink-900 hover:underline"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-ink-600 hover:text-ink-900"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    Join
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>

        <footer className="mt-16 border-t border-ink-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-ink-400">
            Tutorly — a demonstration tutor marketplace. Tutor listings do not
            constitute a recommendation; always carry out your own checks before
            arranging lessons.
          </div>
        </footer>
      </body>
    </html>
  );
}
