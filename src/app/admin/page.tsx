import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setTutorVerifiedAction } from "@/app/actions/admin";
import { Badge, Card, EmptyState, PageHeading, buttonPrimary, buttonSecondary } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const profiles = await prisma.tutorProfile.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeading
        title="Verify tutors"
        description="Only mark a tutor verified once you have seen their ID and DBS certificate. The badge is what parents rely on."
      />

      {profiles.length === 0 ? (
        <EmptyState title="No tutor profiles yet" />
      ) : (
        profiles.map((profile) => (
          <Card key={profile.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink-900">
                  <Link href={`/tutors/${profile.id}`} className="hover:underline">
                    {profile.user.name}
                  </Link>{" "}
                  {profile.verified ? (
                    <Badge tone="success">Verified</Badge>
                  ) : (
                    <Badge tone="warning">Not verified</Badge>
                  )}
                  {!profile.published ? <Badge>Hidden</Badge> : null}
                </p>
                <p className="mt-0.5 text-sm text-ink-600">{profile.user.email}</p>
                <dl className="mt-2 space-y-0.5 text-sm text-ink-600">
                  <div className="flex gap-2">
                    <dt className="text-ink-400">DBS number</dt>
                    <dd>{profile.dbsCertificateNumber ?? "not provided"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-400">Issued</dt>
                    <dd>{profile.dbsIssuedOn ? formatDate(profile.dbsIssuedOn) : "not provided"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-400">Qualifications</dt>
                    <dd>{profile.qualifications ?? "not provided"}</dd>
                  </div>
                </dl>
              </div>

              <form action={setTutorVerifiedAction}>
                <input type="hidden" name="tutorProfileId" value={profile.id} />
                <input type="hidden" name="verified" value={profile.verified ? "0" : "1"} />
                <button
                  type="submit"
                  className={profile.verified ? buttonSecondary : buttonPrimary}
                >
                  {profile.verified ? "Remove verification" : "Mark as verified"}
                </button>
              </form>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
