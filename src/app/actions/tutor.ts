"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { geocodePostcode, normalisePostcode, outcodeOf } from "@/lib/geo";
import { poundsToPence, parseTimeToMinutes } from "@/lib/format";
import { dateKeyToUtcMidnight } from "@/lib/time";

export type ActionState = { error?: string; success?: string } | undefined;

/** The signed-in tutor's profile id, or null if they aren't a tutor. */
async function currentTutorProfileId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "TUTOR") return null;
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return profile?.id ?? null;
}

const profileSchema = z.object({
  headline: z.string().trim().min(10, "Please write a headline of at least 10 characters."),
  bio: z.string().trim().min(50, "Please write at least 50 characters about your teaching."),
  hourlyRate: z.string().trim().min(1, "Please give your hourly rate."),
  postcode: z.string().trim().min(1, "Please give your postcode."),
  travelRadiusMiles: z.coerce.number().int().min(0).max(100),
  yearsExperience: z.coerce.number().int().min(0).max(70),
  qualifications: z.string().trim().max(1000).optional(),
  dbsCertificateNumber: z.string().trim().max(50).optional(),
  dbsIssuedOn: z.string().trim().optional(),
  offersOnline: z.boolean(),
  offersInPerson: z.boolean(),
  published: z.boolean(),
});

export async function saveTutorProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "TUTOR") return { error: "Only tutor accounts can do that." };

  const parsed = profileSchema.safeParse({
    headline: formData.get("headline"),
    bio: formData.get("bio"),
    hourlyRate: formData.get("hourlyRate"),
    postcode: formData.get("postcode"),
    travelRadiusMiles: formData.get("travelRadiusMiles"),
    yearsExperience: formData.get("yearsExperience"),
    qualifications: formData.get("qualifications") || undefined,
    dbsCertificateNumber: formData.get("dbsCertificateNumber") || undefined,
    dbsIssuedOn: formData.get("dbsIssuedOn") || undefined,
    offersOnline: formData.get("offersOnline") === "on",
    offersInPerson: formData.get("offersInPerson") === "on",
    published: formData.get("published") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const input = parsed.data;

  if (!input.offersOnline && !input.offersInPerson) {
    return { error: "Please offer online lessons, in-person lessons, or both." };
  }

  const hourlyRatePence = poundsToPence(input.hourlyRate);
  if (hourlyRatePence === null || hourlyRatePence <= 0) {
    return { error: "Please give your hourly rate as a number, for example 45 or 42.50." };
  }

  const postcode = normalisePostcode(input.postcode);
  if (!postcode) {
    return { error: "That doesn't look like a UK postcode." };
  }

  let issuedOn: Date | null = null;
  if (input.dbsIssuedOn) {
    issuedOn = dateKeyToUtcMidnight(input.dbsIssuedOn);
    if (!issuedOn) return { error: "That DBS issue date isn't valid." };
  }

  // Geocode so search can measure distance without calling out at query time.
  // A failure is not fatal: the profile saves and the tutor is told their
  // listing won't show a distance until the lookup succeeds.
  const geocoded = await geocodePostcode(postcode);

  const data = {
    headline: input.headline,
    bio: input.bio,
    hourlyRatePence,
    postcode,
    outcode: outcodeOf(postcode),
    travelRadiusMiles: input.travelRadiusMiles,
    yearsExperience: input.yearsExperience,
    qualifications: input.qualifications || null,
    dbsCertificateNumber: input.dbsCertificateNumber || null,
    dbsIssuedOn: issuedOn,
    offersOnline: input.offersOnline,
    offersInPerson: input.offersInPerson,
    published: input.published,
    ...(geocoded ? { latitude: geocoded.latitude, longitude: geocoded.longitude } : {}),
  };

  await prisma.tutorProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: { ...data, userId: user.id },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/search");

  return {
    success: geocoded
      ? "Profile saved."
      : "Profile saved, but we couldn't look up your postcode just now, so your listing won't show a distance until it succeeds. Saving again later will retry.",
  };
}

export async function addTutorSubjectAction(formData: FormData): Promise<void> {
  const tutorProfileId = await currentTutorProfileId();
  if (!tutorProfileId) return;

  const subjectId = String(formData.get("subjectId") ?? "");
  const levelIds = formData.getAll("levelId").map(String).filter(Boolean);
  if (!subjectId || levelIds.length === 0) return;

  await prisma.tutorSubject.createMany({
    data: levelIds.map((levelId) => ({ tutorProfileId, subjectId, levelId })),
    skipDuplicates: true,
  });

  revalidatePath("/dashboard/subjects");
  revalidatePath("/search");
}

export async function removeTutorSubjectAction(formData: FormData): Promise<void> {
  const tutorProfileId = await currentTutorProfileId();
  if (!tutorProfileId) return;

  const id = String(formData.get("tutorSubjectId") ?? "");
  if (!id) return;

  // Scope the delete by profile so an id from another tutor cannot be removed.
  await prisma.tutorSubject.deleteMany({ where: { id, tutorProfileId } });

  revalidatePath("/dashboard/subjects");
  revalidatePath("/search");
}

export async function addAvailabilityRuleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tutorProfileId = await currentTutorProfileId();
  if (!tutorProfileId) return { error: "Only tutor accounts can do that." };

  const weekdays = formData.getAll("weekday").map(Number).filter((n) => n >= 0 && n <= 6);
  const start = parseTimeToMinutes(String(formData.get("startTime") ?? ""));
  const end = parseTimeToMinutes(String(formData.get("endTime") ?? ""));

  if (weekdays.length === 0) return { error: "Please choose at least one day." };
  if (start === null || end === null) return { error: "Please give a start and end time." };
  if (end <= start) return { error: "The end time must be after the start time." };

  await prisma.availabilityRule.createMany({
    data: weekdays.map((weekday) => ({
      tutorProfileId,
      weekday,
      startMinute: start,
      endMinute: end,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/dashboard/availability");
  revalidatePath("/search");
  return { success: "Availability added." };
}

export async function removeAvailabilityRuleAction(formData: FormData): Promise<void> {
  const tutorProfileId = await currentTutorProfileId();
  if (!tutorProfileId) return;

  const id = String(formData.get("ruleId") ?? "");
  if (!id) return;

  await prisma.availabilityRule.deleteMany({ where: { id, tutorProfileId } });
  revalidatePath("/dashboard/availability");
  revalidatePath("/search");
}

export async function addExceptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tutorProfileId = await currentTutorProfileId();
  if (!tutorProfileId) return { error: "Only tutor accounts can do that." };

  const date = dateKeyToUtcMidnight(String(formData.get("date") ?? ""));
  if (!date) return { error: "Please choose a date." };

  const allDay = formData.get("allDay") === "on";
  let startMinute: number | null = null;
  let endMinute: number | null = null;

  if (!allDay) {
    startMinute = parseTimeToMinutes(String(formData.get("startTime") ?? ""));
    endMinute = parseTimeToMinutes(String(formData.get("endTime") ?? ""));
    if (startMinute === null || endMinute === null) {
      return { error: "Give a start and end time, or tick 'all day'." };
    }
    if (endMinute <= startMinute) return { error: "The end time must be after the start time." };
  }

  await prisma.availabilityException.create({
    data: {
      tutorProfileId,
      date,
      startMinute,
      endMinute,
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });

  revalidatePath("/dashboard/availability");
  return { success: "Time blocked out." };
}

export async function removeExceptionAction(formData: FormData): Promise<void> {
  const tutorProfileId = await currentTutorProfileId();
  if (!tutorProfileId) return;

  const id = String(formData.get("exceptionId") ?? "");
  if (!id) return;

  await prisma.availabilityException.deleteMany({ where: { id, tutorProfileId } });
  revalidatePath("/dashboard/availability");
}
