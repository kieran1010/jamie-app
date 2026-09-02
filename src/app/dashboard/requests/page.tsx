import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelBookingAction, respondToBookingAction } from "@/app/actions/booking";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { Card, EmptyState, PageHeading, buttonDanger, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import { formatDateTime, formatTimeRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TUTOR") redirect("/dashboard");

  const profile = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return (
      <>
        <PageHeading title="Lesson requests" />
        <EmptyState title="Create your profile first">
          Students can only send requests once your profile is published.
        </EmptyState>
      </>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { tutorProfileId: profile.id },
    include: {
      seeker: { select: { name: true, email: true, phone: true } },
      student: { select: { name: true, yearGroup: true } },
      subject: true,
      level: true,
    },
    orderBy: [{ status: "asc" }, { startAt: "asc" }],
  });

  const pending = bookings.filter((b) => b.status === "PENDING");
  const rest = bookings.filter((b) => b.status !== "PENDING");

  return (
    <>
      <PageHeading
        title="Lesson requests"
        description="Nothing is in your diary until you accept it."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-600">
          Awaiting your reply ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState title="No requests waiting">
            New requests will appear here.
          </EmptyState>
        ) : (
          pending.map((booking) => (
            <Card key={booking.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">
                    {booking.subject.name} · {booking.level.name}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {formatDateTime(booking.startAt)} –{" "}
                    {formatTimeRange(booking.startAt, booking.endAt).split("–")[1]} ·{" "}
                    {booking.mode === "ONLINE" ? "Online" : "In person"}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    Requested by {booking.seeker.name}
                    {booking.student
                      ? ` for ${booking.student.name}${
                          booking.student.yearGroup ? ` (${booking.student.yearGroup})` : ""
                        }`
                      : " for themselves"}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>

              {booking.message ? (
                <blockquote className="mt-3 border-l-2 border-ink-200 pl-3 text-sm text-ink-600">
                  {booking.message}
                </blockquote>
              ) : null}

              <form action={respondToBookingAction} className="mt-4 space-y-3">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input
                  name="responseNote"
                  placeholder="Optional note back to them"
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="ACCEPTED"
                    className={buttonPrimary}
                  >
                    Accept
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="DECLINED"
                    className={buttonSecondary}
                  >
                    Decline
                  </button>
                </div>
              </form>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-600">Everything else ({rest.length})</h2>
        {rest.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          rest.map((booking) => (
            <Card key={booking.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">
                    {booking.subject.name} · {booking.level.name}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {formatDateTime(booking.startAt)} · {booking.seeker.name}
                    {booking.student ? ` for ${booking.student.name}` : ""}
                  </p>
                  {booking.status === "ACCEPTED" ? (
                    <p className="mt-1 text-sm text-ink-600">
                      Contact: {booking.seeker.email}
                      {booking.seeker.phone ? ` · ${booking.seeker.phone}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <BookingStatusBadge status={booking.status} />
                  {booking.status === "ACCEPTED" && booking.startAt > new Date() ? (
                    <form action={cancelBookingAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button type="submit" className={buttonDanger}>
                        Cancel
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </Card>
          ))
        )}
      </section>
    </>
  );
}
