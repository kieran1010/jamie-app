"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type FormState = { error?: string } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please give your full name."),
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address."),
  password: z.string().min(8, "Please use at least 8 characters."),
  role: z.enum(["SEEKER", "TUTOR"]),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { name, email, password, role } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "An account with that email already exists. Try signing in instead." };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
  });

  await createSession(user.id);
  redirect(role === "TUTOR" ? "/dashboard/profile" : "/search");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address."),
  password: z.string().min(1, "Please enter your password."),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Same message either way, so the form cannot be used to discover which
  // email addresses have accounts.
  const genericFailure = { error: "Those details didn't match an account." };
  if (!user) return genericFailure;
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return genericFailure;

  await createSession(user.id);
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
