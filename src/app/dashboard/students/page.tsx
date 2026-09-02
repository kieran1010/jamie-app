import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeStudentAction } from "@/app/actions/students";
import { AddStudentForm } from "@/components/AddStudentForm";
import { Card, EmptyState, PageHeading, buttonDanger } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SEEKER") redirect("/dashboard");

  const students = await prisma.student.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <>
      <PageHeading
        title="Who I book for"
        description="Add a child here and you can say who each lesson is for when you request it. If you are booking for yourself, you don't need to add anyone."
      />

      <Card>
        <h2 className="font-semibold text-ink-900">Add a child</h2>
        <p className="mb-4 mt-1 text-xs text-ink-400">
          Only their first name and year group are shared with a tutor, and only on lessons you
          book for them.
        </p>
        <AddStudentForm />
      </Card>

      {students.length === 0 ? (
        <EmptyState title="Nobody added yet">
          You can still book lessons for yourself without adding anyone.
        </EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-ink-100 text-sm">
            {students.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-4 py-3">
                <span>
                  <span className="font-medium text-ink-900">{student.name}</span>
                  {student.yearGroup ? (
                    <span className="text-ink-400"> · {student.yearGroup}</span>
                  ) : null}
                  {student._count.bookings > 0 ? (
                    <span className="text-ink-400"> · {student._count.bookings} lessons</span>
                  ) : null}
                </span>
                <form action={removeStudentAction}>
                  <input type="hidden" name="studentId" value={student.id} />
                  <button type="submit" className={buttonDanger}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
