"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionState = { error?: string; success?: string } | undefined;

export async function addStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "SEEKER") return { error: "Only learner accounts can do that." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Please give the child's name." };

  await prisma.student.create({
    data: {
      ownerId: user.id,
      name,
      yearGroup: String(formData.get("yearGroup") ?? "").trim() || null,
    },
  });

  revalidatePath("/dashboard/students");
  return { success: `${name} added.` };
}

export async function removeStudentAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = String(formData.get("studentId") ?? "");
  if (!id) return;

  // Scoped by owner so one account cannot delete another's records.
  // Past bookings keep their history: studentId is set to null, not cascaded.
  await prisma.student.deleteMany({ where: { id, ownerId: user.id } });
  revalidatePath("/dashboard/students");
}
