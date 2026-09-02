"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { registerAction } from "@/app/actions/auth";
import { Alert, Card, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, undefined);
  const [role, setRole] = useState<"SEEKER" | "TUTOR">("SEEKER");

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>

      <Card>
        <form action={formAction} className="space-y-4">
          {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink-600">I want to…</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["SEEKER", "Find a tutor", "For yourself or your child"],
                  ["TUTOR", "Offer tutoring", "Create a tutor profile"],
                ] as const
              ).map(([value, title, subtitle]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                    role === value
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                      : "border-ink-200 bg-white hover:bg-ink-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                    className="sr-only"
                  />
                  <span className="block font-semibold text-ink-900">{title}</span>
                  <span className="mt-0.5 block text-xs text-ink-400">{subtitle}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Full name" htmlFor="name">
            <input id="name" name="name" required autoComplete="name" className={inputClass} />
          </Field>

          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </Field>

          <Field label="Password" hint="At least 8 characters." htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>

          <SubmitButton pendingLabel="Creating account…" className="w-full">
            Create account
          </SubmitButton>
        </form>
      </Card>

      <p className="text-center text-sm text-ink-600">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
