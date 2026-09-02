import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addTutorSubjectAction, removeTutorSubjectAction } from "@/app/actions/tutor";
import { getTaxonomy } from "@/lib/search";
import { Card, EmptyState, PageHeading, buttonPrimary, inputClass, labelClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TUTOR") redirect("/dashboard");

  const profile = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return (
      <>
        <PageHeading title="Subjects & levels" />
        <EmptyState title="Create your profile first">
          Add your headline, rate and postcode before listing subjects.
        </EmptyState>
      </>
    );
  }

  const [taxonomy, existing] = await Promise.all([
    getTaxonomy(),
    prisma.tutorSubject.findMany({
      where: { tutorProfileId: profile.id },
      include: { subject: true, level: true },
    }),
  ]);

  // Group what the tutor already teaches by subject, so each subject is one row.
  const bySubject = new Map<
    string,
    { subjectName: string; entries: { id: string; levelName: string; sortOrder: number }[] }
  >();
  for (const row of existing) {
    const group = bySubject.get(row.subjectId);
    const entry = { id: row.id, levelName: row.level.name, sortOrder: row.level.sortOrder };
    if (group) group.entries.push(entry);
    else bySubject.set(row.subjectId, { subjectName: row.subject.name, entries: [entry] });
  }
  const grouped = [...bySubject.values()].sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName),
  );

  return (
    <>
      <PageHeading
        title="Subjects & levels"
        description="Students search on these, so list each level you genuinely teach."
      />

      <Card>
        <h2 className="font-semibold text-ink-900">Add a subject</h2>
        <form action={addTutorSubjectAction} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="subjectId" className={labelClass}>
              Subject
            </label>
            <select id="subjectId" name="subjectId" required className={inputClass}>
              {taxonomy.subjectsByCategory.map(([category, subjects]) => (
                <optgroup key={category} label={category}>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className={labelClass}>Levels you teach it at</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {taxonomy.levels.map((level) => (
                <label
                  key={level.id}
                  className="cursor-pointer rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700"
                >
                  <input type="checkbox" name="levelId" value={level.id} className="sr-only" />
                  {level.name}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className={buttonPrimary}>
            Add
          </button>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-600">
          What you currently teach ({existing.length} combinations)
        </h2>
        {grouped.length === 0 ? (
          <EmptyState title="No subjects listed yet">
            Your profile won&apos;t appear in subject searches until you add at least one.
          </EmptyState>
        ) : (
          grouped.map((group) => (
            <Card key={group.subjectName}>
              <p className="font-semibold text-ink-900">{group.subjectName}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.entries
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((entry) => (
                    <form key={entry.id} action={removeTutorSubjectAction}>
                      <input type="hidden" name="tutorSubjectId" value={entry.id} />
                      <button
                        type="submit"
                        title={`Remove ${group.subjectName} at ${entry.levelName}`}
                        className="group inline-flex items-center gap-1.5 rounded-md bg-ink-100 px-2.5 py-1 text-xs text-ink-600 transition hover:bg-red-50 hover:text-red-700"
                      >
                        {entry.levelName}
                        <span aria-hidden className="text-ink-400 group-hover:text-red-600">
                          ×
                        </span>
                        <span className="sr-only">Remove</span>
                      </button>
                    </form>
                  ))}
              </div>
            </Card>
          ))
        )}
      </section>
    </>
  );
}
