import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 text-sm text-ink-600">
        That page doesn&apos;t exist, or the tutor is no longer listed.
      </p>
      <LinkButton href="/search" className="mt-6">
        Search for a tutor
      </LinkButton>
    </div>
  );
}
