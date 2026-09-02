import { Alert, EmptyState } from "@/components/ui";
import { SearchFilters } from "@/components/SearchFilters";
import { TutorCard } from "@/components/TutorCard";
import { getTaxonomy, searchTutors } from "@/lib/search";
import { hasActiveFilters, parseSearchParams, type RawSearchParams } from "@/lib/searchParams";
import { pluralise } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const criteria = parseSearchParams(await searchParams);
  const [taxonomy, outcome] = await Promise.all([getTaxonomy(), searchTutors(criteria)]);

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
      <aside className="lg:sticky lg:top-6">
        <h1 className="mb-3 text-lg font-bold tracking-tight text-ink-900">Refine your search</h1>
        <SearchFilters criteria={criteria} taxonomy={taxonomy} />
      </aside>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight text-ink-900">
            {pluralise(outcome.results.length, "tutor")} found
          </h2>
          {outcome.searchedFrom ? (
            <p className="text-sm text-ink-400">
              Distances measured from {outcome.searchedFrom.postcode}
            </p>
          ) : null}
        </div>

        {outcome.locationWarning ? (
          <Alert tone="warning">{outcome.locationWarning}</Alert>
        ) : null}

        {outcome.results.length === 0 ? (
          <EmptyState title="No tutors match those filters yet">
            {hasActiveFilters(criteria)
              ? "Try widening the radius, removing a day or time, or raising the maximum rate."
              : "No tutors have published a profile yet."}
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {outcome.results.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
