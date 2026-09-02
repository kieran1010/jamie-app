"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Set or clear a tutor's verified badge. Admin-only: a tutor can enter their
 * DBS number themselves, but only an admin can assert it has been checked.
 */
export async function setTutorVerifiedAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return;

  const tutorProfileId = String(formData.get("tutorProfileId") ?? "");
  const verified = formData.get("verified") === "1";
  if (!tutorProfileId) return;

  await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: { verified, verifiedAt: verified ? new Date() : null },
  });

  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath(`/tutors/${tutorProfileId}`);
}
