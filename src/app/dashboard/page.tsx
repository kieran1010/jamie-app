import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Alert, Card, LinkButton, PageHeading } from "@/components/ui";
import { pluralise } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "TUTOR") {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: user.id },
      include: {
        _count: { select: { subjects: true, availability: true } },
        bookings: { where: { status: "PENDING" }, select: { id: true } },
      },
    });

    const missing: string[] = [];
    if (!profile) missing.push("Create your profile");
    else {
      if (profile._count.subjects === 0) missing.push("Add the subjects and levels you teach");
      if (profile._count.availability === 0) missing.push("Publish your weekly availability");
      if (!profile.published) missing.push("Switch your profile to published");
    }

    return (
      <>
        <PageHeading
          title={`Hello, ${user.name.split(" ")[0]}`}
          description="Your tutor dashboard."
          action={
            profile ? (
              <LinkButton href={`/tutors/${profile.id}`} variant="secondary">
                View public profile
              </LinkButton>
            ) : undefined
          }
        />

        {missing.length > 0 ? (
          <Alert tone="warning">
            <p className="font-semibold">
              Your profile isn&apos;t searchable yet. Still to do:
            </p>
            <ul className="mt-1.5 list-inside list-disc">
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Alert>
        ) : (
          <Alert tone="success">
            Your profile is live and searchable
            {profile?.verified ? " with a verified badge." : "."}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-medium text-ink-400">Pending requests</p>
            <p className="mt-1 text-2xl font-bold">{profile?.bookings.length ?? 0}</p>
            <LinkButton href="/dashboard/requests" variant="secondary" className="mt-3">
              Review
            </LinkButton>
          </Card>
          <Card>
            <p className="text-xs font-medium text-ink-400">Subject/level combinations</p>
            <p className="mt-1 text-2xl font-bold">{profile?._count.subjects ?? 0}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-ink-400">Weekly availability blocks</p>
            <p className="mt-1 text-2xl font-bold">{profile?._count.availability ?? 0}</p>
          </Card>
        </div>
      </>
    );
  }

  if (user.role === "ADMIN") {
    const [total, unverified] = await Promise.all([
      prisma.tutorProfile.count(),
      prisma.tutorProfile.count({ where: { verified: false } }),
    ]);
    return (
      <>
        <PageHeading title="Admin" description="Tutor verification." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-xs font-medium text-ink-400">Tutor profiles</p>
            <p className="mt-1 text-2xl font-bold">{total}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-ink-400">Awaiting verification</p>
            <p className="mt-1 text-2xl font-bold">{unverified}</p>
            <LinkButton href="/admin" variant="secondary" className="mt-3">
              Review
            </LinkButton>
          </Card>
        </div>
      </>
    );
  }

  const [pending, upcoming, students] = await Promise.all([
    prisma.booking.count({ where: { seekerId: user.id, status: "PENDING" } }),
    prisma.booking.count({
      where: { seekerId: user.id, status: "ACCEPTED", startAt: { gte: new Date() } },
    }),
    prisma.student.count({ where: { ownerId: user.id } }),
  ]);

  return (
    <>
      <PageHeading
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Your lessons and requests."
        action={<LinkButton href="/search">Find a tutor</LinkButton>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-ink-400">Awaiting a reply</p>
          <p className="mt-1 text-2xl font-bold">{pending}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-ink-400">Confirmed lessons ahead</p>
          <p className="mt-1 text-2xl font-bold">{upcoming}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-ink-400">People you book for</p>
          <p className="mt-1 text-2xl font-bold">{pluralise(students, "child", "children")}</p>
        </Card>
      </div>
      <LinkButton href="/dashboard/bookings" variant="secondary">
        See all my bookings
      </LinkButton>
    </>
  );
}
