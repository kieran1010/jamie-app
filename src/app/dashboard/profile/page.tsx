import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeading } from "@/components/ui";
import { TutorProfileForm } from "@/components/TutorProfileForm";

export const dynamic = "force-dynamic";

export default async function TutorProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TUTOR") redirect("/dashboard");

  const profile = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });

  return (
    <>
      <PageHeading
        title={profile ? "My profile" : "Create your profile"}
        description="This is what students and parents see when they find you."
      />
      <Card>
        <TutorProfileForm
          defaults={{
            headline: profile?.headline ?? "",
            bio: profile?.bio ?? "",
            hourlyRate: profile ? (profile.hourlyRatePence / 100).toString() : "",
            postcode: profile?.postcode ?? "",
            travelRadiusMiles: profile?.travelRadiusMiles ?? 5,
            yearsExperience: profile?.yearsExperience ?? 0,
            qualifications: profile?.qualifications ?? "",
            dbsCertificateNumber: profile?.dbsCertificateNumber ?? "",
            dbsIssuedOn: profile?.dbsIssuedOn
              ? profile.dbsIssuedOn.toISOString().slice(0, 10)
              : "",
            offersOnline: profile?.offersOnline ?? true,
            offersInPerson: profile?.offersInPerson ?? true,
            published: profile?.published ?? true,
          }}
        />
      </Card>
    </>
  );
}
