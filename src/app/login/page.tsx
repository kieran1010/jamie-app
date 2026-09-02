"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/app/actions/auth";
import { Alert, Card, Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <Card>
        <form action={formAction} className="space-y-4">
          {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </Field>

          <SubmitButton pendingLabel="Signing in…" className="w-full">
            Sign in
          </SubmitButton>
        </form>
      </Card>

      <p className="text-center text-sm text-ink-600">
        No account yet?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Create one
        </Link>
        .
      </p>
    </div>
  );
}
