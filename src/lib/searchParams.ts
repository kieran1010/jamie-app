import { isTimeBand, type TimeBand } from "./availability";
import { DEFAULT_RADIUS_MILES, type SearchCriteria, type SortOption } from "./search";
import { poundsToPence } from "./format";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

/** Turn URL query parameters into validated search criteria. */
export function parseSearchParams(params: RawSearchParams): SearchCriteria {
  const modeRaw = first(params.mode);
  const mode = modeRaw === "ONLINE" || modeRaw === "IN_PERSON" ? modeRaw : "ANY";

  const sortRaw = first(params.sort);
  const sort: SortOption =
    sortRaw === "price" || sortRaw === "experience" ? sortRaw : "distance";

  const radiusRaw = Number(first(params.radius));
  const radiusMiles =
    Number.isFinite(radiusRaw) && radiusRaw > 0 && radiusRaw <= 200
      ? radiusRaw
      : DEFAULT_RADIUS_MILES;

  const weekdays = [
    ...new Set(
      all(params.day)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    ),
  ];

  const bands = [...new Set(all(params.band).filter(isTimeBand))] as TimeBand[];

  const maxPriceRaw = first(params.maxPrice);
  const maxPricePence = maxPriceRaw ? (poundsToPence(maxPriceRaw) ?? undefined) : undefined;

  return {
    subjectSlug: first(params.subject),
    levelSlug: first(params.level),
    postcode: first(params.postcode),
    radiusMiles,
    mode,
    weekdays,
    bands,
    maxPricePence,
    verifiedOnly: first(params.verified) === "1",
    sort,
  };
}

/** True when the user has narrowed the search at all. */
export function hasActiveFilters(criteria: SearchCriteria): boolean {
  return Boolean(
    criteria.subjectSlug ||
      criteria.levelSlug ||
      criteria.postcode ||
      criteria.mode !== "ANY" ||
      criteria.weekdays.length ||
      criteria.bands.length ||
      criteria.maxPricePence ||
      criteria.verifiedOnly,
  );
}
