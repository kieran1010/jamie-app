"use client";

import { useActionState } from "react";

import { addStudentAction } from "@/app/actions/students";
import { Alert, Field, inputClass } from "./ui";
import { SubmitButton } from "./SubmitButton";

export function AddStudentForm() {
  const [state, formAction] = useActionState(addStudentAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="name">
          <input id="name" name="name" required className={inputClass} placeholder="Ellie" />
        </Field>
        <Field label="Year group" hint="Optional." htmlFor="yearGroup">
          <input id="yearGroup" name="yearGroup" className={inputClass} placeholder="Year 11" />
        </Field>
      </div>

      <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
    </form>
  );
}
