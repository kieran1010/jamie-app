import Link from "next/link";

import { getTaxonomy } from "@/lib/search";
import { prisma } from "@/lib/db";
import { buttonPrimary, Card, Field, inputClass } from "@/components/ui";

// The live tutor count comes from the database, so this page must never be
// prerendered at build time: the number would be stale, and the build would
// need a reachable database it has no business requiring.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ subjectsByCategory, levels }, tutorCount] = await Promise.all([
    getTaxonomy(),
    prisma.tutorProfile.count({ where: { published: true } }),
  ]);

  return (
    <div className="space-y-14">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Find a tutor who is free when you are.
          </h1>
          <p className="max-w-xl text-lg text-ink-600">
            Search {tutorCount} tutors by subject, level and how far they are from
            you — then filter by the days and times that actually suit your week,
            and send a lesson request.
          </p>
          <p className="text-sm text-ink-400">
            Free to search. Tutors set their own rates and arrange payment with you
            directly.
          </p>
        </div>

        <Card className="lg:shadow-md">
          <form action="/search" className="space-y-4">
            <Field label="Subject" htmlFor="subject">
              <select id="subject" name="subject" className={inputClass} defaultValue="">
                <option value="">Any subject</option>
                {subjectsByCategory.map(([category, subjects]) => (
                  <optgroup key={category} label={category}>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.slug}>
                        {subject.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field label="Level" htmlFor="level">
              <select id="level" name="level" className={inputClass} defaultValue="">
                <option value="">Any level</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.slug}>
                    {level.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Your postcode" hint="Optional — used to sort by distance." htmlFor="postcode">
                <input
                  id="postcode"
                  name="postcode"
                  placeholder="e.g. SE1 9RT"
                  autoComplete="postal-code"
                  className={inputClass}
                />
              </Field>
              <Field label="Within" htmlFor="radius">
                <select id="radius" name="radius" defaultValue="10" className={inputClass}>
                  {[2, 5, 10, 20, 30, 50].map((miles) => (
                    <option key={miles} value={miles}>
                      {miles} miles
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <button type="submit" className={`${buttonPrimary} w-full`}>
              Search tutors
            </button>
          </form>
        </Card>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        {[
          {
            title: "Search the way you plan your week",
            body: "Filter by Tuesday evenings or Saturday mornings, not just by subject. Tutors publish a weekly pattern and block out the dates they are away.",
          },
          {
            title: "Distance you can trust",
            body: "Enter a postcode and see how far each tutor is, and whether they will travel to you or expect you to come to them.",
          },
          {
            title: "Request, then confirm",
            body: "Pick a free slot and send a request. The tutor accepts or declines, so nothing is booked without both sides agreeing.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <h2 className="font-semibold text-ink-900">{item.title}</h2>
            <p className="mt-2 text-sm text-ink-600">{item.body}</p>
          </Card>
        ))}
      </section>

      <section className="rounded-xl border border-ink-200 bg-white p-8 text-center">
        <h2 className="text-xl font-bold text-ink-900">Are you a tutor?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-600">
          Publish a profile with your subjects, levels, rate and weekly
          availability. Students find you by area and time, and you approve every
          lesson request before it is confirmed.
        </p>
        <Link href="/register" className={`${buttonPrimary} mt-5`}>
          Create a tutor profile
        </Link>
      </section>
    </div>
  );
}
