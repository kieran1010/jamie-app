"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSlotBookable, LESSON_DURATIONS } from "@/lib/availability";

export type BookingFormState = { error?: string; success?: string } | undefined;

const requestSchema = z.object({
  tutorProfileId: z.string().min(1),
  subjectId: z.string().min(1, "Please choose a subject."),
  levelId: z.string().min(1, "Please choose a level."),
  startAt: z.string().min(1, "Please choose a time."),
  duration: z.coerce.number().int(),
  mode: z.enum(["ONLINE", "IN_PERSON"]),
  studentId: z.string().optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function requestBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Please sign in to request a lesson." };
  }
  if (user.role === "TUTOR") {
    return { error: "Tutor accounts cannot request lessons." };
  }

  const parsed = requestSchema.safeParse({
    tutorProfileId: formData.get("tutorProfileId"),
    subjectId: formData.get("subjectId"),
    levelId: formData.get("levelId"),
    startAt: formData.get("startAt"),
    duration: formData.get("duration"),
    mode: formData.get("mode"),
    studentId: formData.get("studentId") || undefined,
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const input = parsed.data;

  if (!LESSON_DURATIONS.includes(input.duration as (typeof LESSON_DURATIONS)[number])) {
    return { error: "That lesson length isn't available." };
  }

  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) {
    return { error: "That start time isn't valid." };
  }

  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: input.tutorProfileId },
    include: {
      subjects: true,
      availability: true,
      exceptions: true,
      bookings: { where: { status: "ACCEPTED" }, select: { startAt: true, endAt: true } },
    },
  });

  if (!tutor || !tutor.published) {
    return { error: "That tutor is no longer accepting requests." };
  }

  if (!tutor.subjects.some((s) => s.subjectId === input.subjectId && s.levelId === input.levelId)) {
    return { error: "That tutor doesn't teach that subject at that level." };
  }

  if (input.mode === "ONLINE" && !tutor.offersOnline) {
    return { error: "That tutor doesn't offer online lessons." };
  }
  if (input.mode === "IN_PERSON" && !tutor.offersInPerson) {
    return { error: "That tutor doesn't offer in-person lessons." };
  }

  // The form only offers valid slots, but re-check here: the form is a hint,
  // not a guarantee, and availability may have changed since it was rendered.
  const bookable = isSlotBookable({
    startAt,
    durationMinutes: input.duration,
    rules: tutor.availability,
    exceptions: tutor.exceptions,
    busy: tutor.bookings,
  });
  if (!bookable) {
    return {
      error: "That slot is no longer free. Please pick another time.",
    };
  }

  if (input.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, ownerId: user.id },
    });
    if (!student) return { error: "We couldn't find that student on your account." };
  }

  const endAt = new Date(startAt.getTime() + input.duration * 60_000);

  const duplicate = await prisma.booking.findFirst({
    where: {
      tutorProfileId: tutor.id,
      seekerId: user.id,
      startAt,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  });
  if (duplicate) {
    return { error: "You have already requested that slot with this tutor." };
  }

  await prisma.booking.create({
    data: {
      tutorProfileId: tutor.id,
      seekerId: user.id,
      studentId: input.studentId || null,
      subjectId: input.subjectId,
      levelId: input.levelId,
      startAt,
      endAt,
      mode: input.mode,
      message: input.message || null,
    },
  });

  revalidatePath(`/tutors/${tutor.id}`);
  revalidatePath("/dashboard/bookings");

  return {
    success:
      "Request sent. The tutor will accept or decline it — you can track it under My bookings.",
  };
}

const respondSchema = z.object({
  bookingId: z.string().min(1),
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  responseNote: z.string().trim().max(2000).optional(),
});

/** Tutor accepts or declines a pending request. */
export async function respondToBookingAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = respondSchema.safeParse({
    bookingId: formData.get("bookingId"),
    decision: formData.get("decision"),
    responseNote: formData.get("responseNote") || undefined,
  });
  if (!parsed.success) return;

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { tutorProfile: true },
  });

  if (!booking || booking.tutorProfile.userId !== user.id) return;
  if (booking.status !== "PENDING") return;

  // Accepting a slot that has since been filled would double-book the tutor.
  if (parsed.data.decision === "ACCEPTED") {
    const clash = await prisma.booking.findFirst({
      where: {
        tutorProfileId: booking.tutorProfileId,
        status: "ACCEPTED",
        startAt: { lt: booking.endAt },
        endAt: { gt: booking.startAt },
      },
    });
    if (clash) return;
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: parsed.data.decision,
      responseNote: parsed.data.responseNote || null,
      respondedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/requests");
}

/** Either side withdraws a request or cancels a confirmed lesson. */
export async function cancelBookingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tutorProfile: true },
  });
  if (!booking) return;

  const isSeeker = booking.seekerId === user.id;
  const isTutor = booking.tutorProfile.userId === user.id;
  if (!isSeeker && !isTutor) return;
  if (booking.status === "CANCELLED" || booking.status === "DECLINED") return;

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/requests");
}
