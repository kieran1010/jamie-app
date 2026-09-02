import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSlots, LESSON_DURATIONS } from "@/lib/availability";
import { formatDate, formatMinuteOfDay, formatPounds, WEEKDAYS, WEEKDAY_ORDER } from "@/lib/format";
import { dateKeyToUtcMidnight } from "@/lib/time";
import { BookingForm, type SlotOption } from "@/components/BookingForm";
import { Badge, Card } from "@/components/ui";

/** How far ahead the booking calendar looks. */
const BOOKING_HORIZON_DAYS = 28;

export const dynamic = "force-dynamic";

export default async function TutorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profile, viewer] = await Promise.all([
    prisma.tutorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        subjects: { include: { subject: true, level: true } },
        availability: true,
        exceptions: { orderBy: { date: "asc" } },
        bookings: { where: { status: "ACCEPTED" }, select: { startAt: true, endAt: true } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!profile || !profile.published) notFound();

  const students =
    viewer && viewer.role === "SEEKER"
      ? await prisma.student.findMany({
          where: { ownerId: viewer.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [];

  // Generate slots for every offered lesson length up front, so switching
  // length in the form is instant and needs no round-trip.
  const slotsByDuration: Record<string, SlotOption[]> = {};
  for (const duration of LESSON_DURATIONS) {
    slotsByDuration[String(duration)] = generateSlots({
      rules: profile.availability,
      exceptions: profile.exceptions,
      busy: profile.bookings,
      durationMinutes: duration,
      days: BOOKING_HORIZON_DAYS,
    }).map((slot) => ({
      startAt: slot.startAt.toISOString(),
      dateKey: slot.dateKey,
      // Formatted server-side in Europe/London so the client renders identically.
      dayLabel: formatDate(dateKeyToUtcMidnight(slot.dateKey) ?? slot.startAt),
      timeLabel: formatMinuteOfDay(slot.startMinute),
    }));
  }

  const subjectOptions = profile.subjects
    .map((s) => ({
      subjectId: s.subjectId,
      levelId: s.levelId,
      label: `${s.subject.name} · ${s.level.name}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const availabilityByDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (const rule of profile.availability) {
    const existing = availabilityByDay.get(rule.weekday);
    if (existing) existing.push(rule);
    else availabilityByDay.set(rule.weekday, [rule]);
  }

  const upcomingExceptions = profile.exceptions.filter(
    (e) => e.date.getTime() >= Date.now() - 24 * 60 * 60 * 1000,
  );

  const viewerKind = !viewer ? "guest" : viewer.role === "TUTOR" ? "tutor" : "seeker";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">{profile.user.name}</h1>
          <p className="mt-1 text-lg text-ink-600">{profile.headline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.verified ? <Badge tone="success">ID &amp; DBS verified</Badge> : null}
            {profile.offersOnline ? <Badge tone="brand">Online lessons</Badge> : null}
            {profile.offersInPerson ? <Badge tone="brand">In-person lessons</Badge> : null}
            <Badge>{profile.yearsExperience} years&apos; experience</Badge>
            <Badge>{profile.outcode}</Badge>
          </div>
        </div>

        <Card>
          <h2 className="font-semibold text-ink-900">About</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
            {profile.bio}
          </p>
          {profile.qualifications ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-ink-900">Qualifications</h3>
              <p className="mt-1 text-sm text-ink-600">{profile.qualifications}</p>
            </>
          ) : null}
        </Card>

        <Card>
          <h2 className="font-semibold text-ink-900">Subjects and levels</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {subjectOptions.length === 0 ? (
              <p className="text-sm text-ink-400">No subjects listed yet.</p>
            ) : (
              subjectOptions.map((option) => (
                <span
                  key={`${option.subjectId}-${option.levelId}`}
                  className="rounded-md bg-ink-100 px-2.5 py-1 text-sm text-ink-600"
                >
                  {option.label}
                </span>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink-900">Typical weekly availability</h2>
          <p className="mt-1 text-xs text-ink-400">All times are UK time.</p>
          <dl className="mt-3 divide-y divide-ink-100 text-sm">
            {WEEKDAY_ORDER.map((day) => {
              const rules = (availabilityByDay.get(day) ?? []).sort(
                (a, b) => a.startMinute - b.startMinute,
              );
              return (
                <div key={day} className="flex gap-4 py-2">
                  <dt className="w-24 shrink-0 font-medium text-ink-600">{WEEKDAYS[day]}</dt>
                  <dd className={rules.length ? "text-ink-900" : "text-ink-400"}>
                    {rules.length
                      ? rules
                          .map(
                            (r) =>
                              `${formatMinuteOfDay(r.startMinute)}–${formatMinuteOfDay(r.endMinute)}`,
                          )
                          .join(", ")
                      : "Not available"}
                  </dd>
                </div>
              );
            })}
          </dl>

          {upcomingExceptions.length > 0 ? (
            <div className="mt-4 rounded-lg bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Away or unavailable</p>
              <ul className="mt-1.5 space-y-1 text-xs text-amber-800">
                {upcomingExceptions.slice(0, 8).map((exception) => (
                  <li key={exception.id}>
                    {formatDate(exception.date)}
                    {exception.startMinute !== null && exception.endMinute !== null
                      ? `, ${formatMinuteOfDay(exception.startMinute)}–${formatMinuteOfDay(exception.endMinute)}`
                      : " (all day)"}
                    {exception.note ? ` — ${exception.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="font-semibold text-ink-900">Location and travel</h2>
          <p className="mt-2 text-sm text-ink-600">
            Based in {profile.outcode}.{" "}
            {profile.offersInPerson
              ? `Travels up to ${profile.travelRadiusMiles} miles for in-person lessons.`
              : "Teaches online only."}
          </p>
          <p className="mt-2 text-xs text-ink-400">
            Only the first part of a tutor&apos;s postcode is shown publicly.
          </p>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink-900">Safeguarding</h2>
          {profile.verified ? (
            <p className="mt-2 text-sm text-ink-600">
              This tutor&apos;s identity and DBS certificate have been checked by Tutorly
              {profile.verifiedAt ? ` on ${formatDate(profile.verifiedAt)}` : ""}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-600">
              This tutor has not yet completed Tutorly&apos;s identity and DBS check.
              Ask to see their certificate before arranging lessons with a child.
            </p>
          )}
        </Card>
      </div>

      <aside className="lg:sticky lg:top-6">
        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-ink-900">Request a lesson</h2>
            <p className="text-lg font-bold text-ink-900">
              {formatPounds(profile.hourlyRatePence)}
              <span className="text-xs font-normal text-ink-400"> / hr</span>
            </p>
          </div>
          <p className="mt-1 mb-4 text-xs text-ink-400">
            Nothing is confirmed until {profile.user.name.split(" ")[0]} accepts.
          </p>

          <BookingForm
            tutorProfileId={profile.id}
            tutorName={profile.user.name}
            subjectOptions={subjectOptions}
            offersOnline={profile.offersOnline}
            offersInPerson={profile.offersInPerson}
            slotsByDuration={slotsByDuration}
            durations={[...LESSON_DURATIONS]}
            students={students}
            viewer={viewerKind}
          />
        </Card>
      </aside>
    </div>
  );
}
