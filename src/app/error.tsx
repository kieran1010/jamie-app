"use client";

import { buttonPrimary } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold text-ink-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-600">
        Sorry — that didn&apos;t work. Try again, and if it keeps happening the details are in the
        server log.
      </p>
      <button type="button" onClick={reset} className={`${buttonPrimary} mt-6`}>
        Try again
      </button>
    </div>
  );
}
