import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelBookingAction } from "@/app/actions/booking";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { Card, EmptyState, LinkButton, PageHeading, buttonDanger } from "@/components/ui";
import { formatDateTime, formatPounds, formatTimeRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "TUTOR") redirect("/dashboard/requests");

  const bookings = await prisma.booking.findMany({
    where: { seekerId: user.id },
    include: {
      tutorProfile: {
        include: { user: { select: { name: true, email: true, phone: true } } },
      },
      student: { select: { name: true } },
      subject: true,
      level: true,
    },
    orderBy: { startAt: "desc" },
  });

  const now = new Date();
  const upcoming = bookings.filter((b) => b.startAt >= now && b.status !== "CANCELLED");
  const past = bookings.filter((b) => b.startAt < now || b.status === "CANCELLED");

  return (
    <>
      <PageHeading
        title="My bookings"
        description="Requests you have sent and lessons that are confirmed."
        action={<LinkButton href="/search">Find a tutor</LinkButton>}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-600">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing booked yet">
            <Link href="/search" className="font-semibold text-brand-600 hover:underline">
              Search for a tutor
            </Link>{" "}
            to send your first request.
          </EmptyState>
        ) : (
          upcoming.map((booking) => (
            <Card key={booking.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">
                    {booking.subject.name} · {booking.level.name} with{" "}
                    <Link
                      href={`/tutors/${booking.tutorProfileId}`}
                      className="text-brand-700 hover:underline"
                    >
                      {booking.tutorProfile.user.name}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {formatDateTime(booking.startAt)} –{" "}
                    {formatTimeRange(booking.startAt, booking.endAt).split("–")[1]} ·{" "}
                    {booking.mode === "ONLINE" ? "Online" : "In person"}
                    {booking.student ? ` · for ${booking.student.name}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-ink-400">
                    {formatPounds(booking.tutorProfile.hourlyRatePence)} per hour, paid directly to
                    the tutor.
                  </p>
                  {booking.status === "ACCEPTED" ? (
                    <p className="mt-1 text-sm text-ink-600">
                      Contact: {booking.tutorProfile.user.email}
                      {booking.tutorProfile.user.phone
                        ? ` · ${booking.tutorProfile.user.phone}`
                        : ""}
                    </p>
                  ) : null}
                  {booking.responseNote ? (
                    <blockquote className="mt-2 border-l-2 border-ink-200 pl-3 text-sm text-ink-600">
                      {booking.responseNote}
                    </blockquote>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <BookingStatusBadge status={booking.status} />
                  {booking.status === "PENDING" || booking.status === "ACCEPTED" ? (
                    <form action={cancelBookingAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button type="submit" className={buttonDanger}>
                        {booking.status === "PENDING" ? "Withdraw" : "Cancel"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-600">Past and cancelled ({past.length})</h2>
          {past.map((booking) => (
            <Card key={booking.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-600">
                  {booking.subject.name} with {booking.tutorProfile.user.name} ·{" "}
                  {formatDateTime(booking.startAt)}
                </p>
                <BookingStatusBadge status={booking.status} />
              </div>
            </Card>
          ))}
        </section>
      ) : null}
    </>
  );
}
