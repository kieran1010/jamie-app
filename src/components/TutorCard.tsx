import Link from "next/link";

import type { SearchResult } from "@/lib/search";
import { formatMinuteOfDay, formatPounds, WEEKDAYS_SHORT, WEEKDAY_ORDER } from "@/lib/format";
import { Badge } from "./ui";

function availabilitySummary(availability: SearchResult["availability"]): string {
  if (availability.length === 0) return "No availability published yet";

  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (const rule of availability) {
    const existing = byDay.get(rule.weekday);
    if (existing) existing.push(rule);
    else byDay.set(rule.weekday, [rule]);
  }

  return WEEKDAY_ORDER.filter((day) => byDay.has(day))
    .map((day) => {
      const rules = byDay.get(day)!.sort((a, b) => a.startMinute - b.startMinute);
      const times = rules
        .map((r) => `${formatMinuteOfDay(r.startMinute)}–${formatMinuteOfDay(r.endMinute)}`)
        .join(", ");
      return `${WEEKDAYS_SHORT[day]} ${times}`;
    })
    .join(" · ");
}

export function TutorCard({ tutor }: { tutor: SearchResult }) {
  // Show at most a handful of subject/level pairs so a broad tutor does not
  // dominate the results list.
  const shown = tutor.subjects.slice(0, 5);
  const remaining = tutor.subjects.length - shown.length;

  return (
    <article className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">
            <Link href={`/tutors/${tutor.id}`} className="hover:text-brand-700 hover:underline">
              {tutor.name}
            </Link>
          </h2>
          <p className="mt-0.5 text-sm text-ink-600">{tutor.headline}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-ink-900">{formatPounds(tutor.hourlyRatePence)}</p>
          <p className="text-xs text-ink-400">per hour</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tutor.verified ? <Badge tone="success">ID &amp; DBS verified</Badge> : null}
        {tutor.offersOnline ? <Badge tone="brand">Online</Badge> : null}
        {tutor.offersInPerson ? <Badge tone="brand">In person</Badge> : null}
        <Badge>{tutor.yearsExperience} yrs experience</Badge>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-ink-600">{tutor.bio}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <span
            key={`${s.subject}-${s.level}`}
            className="rounded-md bg-ink-100 px-2 py-1 text-xs text-ink-600"
          >
            {s.subject} <span className="text-ink-400">· {s.level}</span>
          </span>
        ))}
        {remaining > 0 ? (
          <span className="px-1 py-1 text-xs text-ink-400">+{remaining} more</span>
        ) : null}
      </div>

      <dl className="mt-4 space-y-1 border-t border-ink-100 pt-3 text-xs text-ink-600">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-ink-400">Usually free</dt>
          <dd>{availabilitySummary(tutor.availability)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-ink-400">Location</dt>
          <dd>
            {tutor.outcode}
            {tutor.distanceMiles !== null ? (
              <>
                {" · "}
                <span className="font-medium text-ink-900">
                  {tutor.distanceMiles < 1
                    ? "under a mile away"
                    : `${tutor.distanceMiles.toFixed(1)} miles away`}
                </span>
              </>
            ) : null}
            {tutor.onlineOnlyAtThisDistance ? (
              <span className="text-ink-400"> · too far to travel, so online lessons only</span>
            ) : tutor.distanceMiles !== null && tutor.offersInPerson ? (
              <span className="text-ink-400">
                {tutor.travelsToYou
                  ? " · travels to you"
                  : ` · travels up to ${tutor.travelRadiusMiles} miles, so you would go to them`}
              </span>
            ) : tutor.offersInPerson ? (
              <span className="text-ink-400"> · travels up to {tutor.travelRadiusMiles} miles</span>
            ) : (
              <span className="text-ink-400"> · online only</span>
            )}
          </dd>
        </div>
      </dl>

      <Link
        href={`/tutors/${tutor.id}`}
        className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline"
      >
        View profile and request a lesson →
      </Link>
    </article>
  );
}
