import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "./db";
import { TIME_BANDS, type TimeBand } from "./availability";
import { boundingBox, geocodePostcode, haversineMiles, normalisePostcode } from "./geo";

export const DEFAULT_RADIUS_MILES = 10;
export const RADIUS_OPTIONS = [2, 5, 10, 20, 30, 50];

export type SortOption = "distance" | "price" | "experience";

export type SearchCriteria = {
  subjectSlug?: string;
  levelSlug?: string;
  postcode?: string;
  radiusMiles: number;
  mode: "ANY" | "ONLINE" | "IN_PERSON";
  weekdays: number[];
  bands: TimeBand[];
  maxPricePence?: number;
  verifiedOnly: boolean;
  sort: SortOption;
};

export type SearchResult = {
  id: string;
  name: string;
  headline: string;
  bio: string;
  hourlyRatePence: number;
  outcode: string;
  yearsExperience: number;
  verified: boolean;
  offersOnline: boolean;
  offersInPerson: boolean;
  travelRadiusMiles: number;
  subjects: { subject: string; level: string }[];
  availability: { weekday: number; startMinute: number; endMinute: number }[];
  /** Miles from the searched postcode, or null when we could not place either end. */
  distanceMiles: number | null;
  /** True when the tutor's own travel radius reaches the student. */
  travelsToYou: boolean;
  /**
   * True when the tutor sits outside the search radius and is only in the
   * results because they teach online. The card must say so, otherwise a
   * Leeds tutor in a "within 20 miles of London" search looks like a bug.
   */
  onlineOnlyAtThisDistance: boolean;
};

export type SearchOutcome = {
  results: SearchResult[];
  /** Set when a postcode was given but could not be resolved to coordinates. */
  locationWarning: string | null;
  searchedFrom: { latitude: number; longitude: number; postcode: string } | null;
};

/**
 * Resolve a postcode to coordinates, preferring the local cache.
 *
 * Search must never be slower than one database round-trip for a postcode
 * people have looked up before, and must still return sensible results when
 * postcodes.io is unreachable.
 */
export async function resolvePostcode(raw: string) {
  const normalised = normalisePostcode(raw);
  if (!normalised) return { coords: null, reason: "format" as const };

  const cached = await prisma.postcodeLookup.findUnique({ where: { postcode: normalised } });
  if (cached) {
    return {
      coords: { latitude: cached.latitude, longitude: cached.longitude, postcode: normalised },
      reason: null,
    };
  }

  const geocoded = await geocodePostcode(normalised);
  if (!geocoded) return { coords: null, reason: "lookup" as const };

  await prisma.postcodeLookup.upsert({
    where: { postcode: normalised },
    update: { latitude: geocoded.latitude, longitude: geocoded.longitude },
    create: {
      postcode: normalised,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    },
  });

  return { coords: { ...geocoded, postcode: normalised }, reason: null };
}

function availabilityFilter(weekdays: number[], bands: TimeBand[]): Prisma.TutorProfileWhereInput {
  if (weekdays.length === 0 && bands.length === 0) return {};

  const conditions: Prisma.AvailabilityRuleWhereInput[] = [];
  if (weekdays.length > 0) conditions.push({ weekday: { in: weekdays } });
  if (bands.length > 0) {
    conditions.push({
      OR: bands.map((band) => ({
        // Overlap, not containment: a 4–8pm slot counts as both afternoon and evening.
        startMinute: { lt: TIME_BANDS[band].end },
        endMinute: { gt: TIME_BANDS[band].start },
      })),
    });
  }

  // `some` means one single rule must satisfy every condition, so "Tuesday" and
  // "evening" together find Tuesday evenings, not a Tuesday plus some evening.
  return { availability: { some: { AND: conditions } } };
}

export async function searchTutors(criteria: SearchCriteria): Promise<SearchOutcome> {
  const where: Prisma.TutorProfileWhereInput[] = [{ published: true }];

  if (criteria.subjectSlug || criteria.levelSlug) {
    where.push({
      subjects: {
        some: {
          ...(criteria.subjectSlug ? { subject: { slug: criteria.subjectSlug } } : {}),
          ...(criteria.levelSlug ? { level: { slug: criteria.levelSlug } } : {}),
        },
      },
    });
  }

  if (criteria.verifiedOnly) where.push({ verified: true });
  if (criteria.maxPricePence) where.push({ hourlyRatePence: { lte: criteria.maxPricePence } });
  if (criteria.mode === "ONLINE") where.push({ offersOnline: true });
  if (criteria.mode === "IN_PERSON") where.push({ offersInPerson: true });

  const availability = availabilityFilter(criteria.weekdays, criteria.bands);
  if (Object.keys(availability).length > 0) where.push(availability);

  let searchedFrom: { latitude: number; longitude: number; postcode: string } | null = null;
  let locationWarning: string | null = null;

  if (criteria.postcode?.trim()) {
    const resolved = await resolvePostcode(criteria.postcode);
    if (resolved.coords) {
      searchedFrom = resolved.coords;
    } else if (resolved.reason === "format") {
      locationWarning = `"${criteria.postcode}" doesn't look like a UK postcode, so results aren't filtered by distance.`;
    } else {
      locationWarning =
        "We couldn't look that postcode up just now, so results aren't filtered by distance.";
    }
  }

  // Narrow in SQL with a bounding box, then apply the exact circular distance in
  // application code. Online-only tutors have no useful location, so they are
  // brought in via the OR branch rather than being excluded by the box.
  if (searchedFrom && criteria.mode !== "ONLINE") {
    const box = boundingBox(searchedFrom.latitude, searchedFrom.longitude, criteria.radiusMiles);
    const nearby: Prisma.TutorProfileWhereInput = {
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLon, lte: box.maxLon },
    };
    where.push(
      criteria.mode === "IN_PERSON" ? nearby : { OR: [nearby, { offersOnline: true }] },
    );
  }

  const profiles = await prisma.tutorProfile.findMany({
    where: { AND: where },
    include: {
      user: { select: { name: true } },
      subjects: { include: { subject: true, level: true } },
      availability: true,
    },
    take: 200,
  });

  const results: SearchResult[] = [];

  for (const profile of profiles) {
    let distanceMiles: number | null = null;
    if (searchedFrom && profile.latitude !== null && profile.longitude !== null) {
      distanceMiles = haversineMiles(searchedFrom, {
        latitude: profile.latitude,
        longitude: profile.longitude,
      });
    }

    // The bounding box is a square, so drop the corners that fall outside the circle.
    const tooFar = distanceMiles !== null && distanceMiles > criteria.radiusMiles;
    if (tooFar && !(criteria.mode !== "IN_PERSON" && profile.offersOnline)) continue;

    results.push({
      id: profile.id,
      name: profile.user.name,
      headline: profile.headline,
      bio: profile.bio,
      hourlyRatePence: profile.hourlyRatePence,
      outcode: profile.outcode,
      yearsExperience: profile.yearsExperience,
      verified: profile.verified,
      offersOnline: profile.offersOnline,
      offersInPerson: profile.offersInPerson,
      travelRadiusMiles: profile.travelRadiusMiles,
      subjects: profile.subjects.map((s) => ({ subject: s.subject.name, level: s.level.name })),
      availability: profile.availability.map((a) => ({
        weekday: a.weekday,
        startMinute: a.startMinute,
        endMinute: a.endMinute,
      })),
      distanceMiles,
      travelsToYou:
        !tooFar &&
        distanceMiles !== null &&
        profile.offersInPerson &&
        distanceMiles <= profile.travelRadiusMiles,
      onlineOnlyAtThisDistance: tooFar,
    });
  }

  results.sort((a, b) => {
    if (criteria.sort === "price") return a.hourlyRatePence - b.hourlyRatePence;
    if (criteria.sort === "experience") return b.yearsExperience - a.yearsExperience;
    // Distance: tutors we could not place sort last rather than first.
    const da = a.distanceMiles ?? Number.POSITIVE_INFINITY;
    const db = b.distanceMiles ?? Number.POSITIVE_INFINITY;
    if (da === db) return a.hourlyRatePence - b.hourlyRatePence;
    return da - db;
  });

  return { results, locationWarning, searchedFrom };
}

export async function getTaxonomy() {
  const [subjects, levels] = await Promise.all([
    prisma.subject.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.level.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const byCategory = new Map<string, typeof subjects>();
  for (const subject of subjects) {
    const existing = byCategory.get(subject.category);
    if (existing) existing.push(subject);
    else byCategory.set(subject.category, [subject]);
  }

  return { subjects, levels, subjectsByCategory: [...byCategory.entries()] };
}
