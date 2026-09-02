import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeAvailabilityRuleAction, removeExceptionAction } from "@/app/actions/tutor";
import { AddAvailabilityRuleForm, AddExceptionForm } from "@/components/AvailabilityForms";
import { Card, EmptyState, PageHeading, buttonDanger } from "@/components/ui";
import { formatDate, formatMinuteOfDay, WEEKDAYS, WEEKDAY_ORDER } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TUTOR") redirect("/dashboard");

  const profile = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return (
      <>
        <PageHeading title="Availability" />
        <EmptyState title="Create your profile first">
          Add your headline, rate and postcode before setting your availability.
        </EmptyState>
      </>
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { tutorProfileId: profile.id },
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
    }),
    prisma.availabilityException.findMany({
      where: { tutorProfileId: profile.id, date: { gte: today } },
      orderBy: { date: "asc" },
    }),
  ]);

  const byDay = new Map<number, typeof rules>();
  for (const rule of rules) {
    const existing = byDay.get(rule.weekday);
    if (existing) existing.push(rule);
    else byDay.set(rule.weekday, [rule]);
  }

  return (
    <>
      <PageHeading
        title="Availability"
        description="Set the hours you normally teach, then block out the dates you are away. All times are UK time."
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <h2 className="font-semibold text-ink-900">Add regular hours</h2>
          <p className="mb-4 mt-1 text-xs text-ink-400">
            Repeats every week until you remove it.
          </p>
          <AddAvailabilityRuleForm />
        </Card>

        <Card>
          <h2 className="font-semibold text-ink-900">Block out a date</h2>
          <p className="mb-4 mt-1 text-xs text-ink-400">
            Overrides your regular hours for that day only.
          </p>
          <AddExceptionForm />
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-ink-900">Your normal week</h2>
        {rules.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">
            Nothing set yet. Students can&apos;t request lessons until you add some hours.
          </p>
        ) : (
          <dl className="mt-3 divide-y divide-ink-100 text-sm">
            {WEEKDAY_ORDER.map((day) => {
              const dayRules = byDay.get(day) ?? [];
              return (
                <div key={day} className="flex items-start gap-4 py-2.5">
                  <dt className="w-24 shrink-0 font-medium text-ink-600">{WEEKDAYS[day]}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {dayRules.length === 0 ? (
                      <span className="text-ink-400">Not available</span>
                    ) : (
                      dayRules.map((rule) => (
                        <form key={rule.id} action={removeAvailabilityRuleAction}>
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <button
                            type="submit"
                            title="Remove this block"
                            className="group inline-flex items-center gap-1.5 rounded-md bg-ink-100 px-2.5 py-1 text-xs text-ink-600 transition hover:bg-red-50 hover:text-red-700"
                          >
                            {formatMinuteOfDay(rule.startMinute)}–
                            {formatMinuteOfDay(rule.endMinute)}
                            <span aria-hidden className="text-ink-400 group-hover:text-red-600">
                              ×
                            </span>
                            <span className="sr-only">Remove</span>
                          </button>
                        </form>
                      ))
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-ink-900">Dates you are away</h2>
        {exceptions.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">Nothing blocked out.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100 text-sm">
            {exceptions.map((exception) => (
              <li key={exception.id} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-ink-600">
                  <span className="font-medium text-ink-900">{formatDate(exception.date)}</span>
                  {exception.startMinute !== null && exception.endMinute !== null
                    ? `, ${formatMinuteOfDay(exception.startMinute)}–${formatMinuteOfDay(exception.endMinute)}`
                    : " — all day"}
                  {exception.note ? ` · ${exception.note}` : ""}
                </span>
                <form action={removeExceptionAction}>
                  <input type="hidden" name="exceptionId" value={exception.id} />
                  <button type="submit" className={buttonDanger}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
