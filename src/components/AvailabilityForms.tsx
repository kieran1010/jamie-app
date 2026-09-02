"use client";

import { useActionState } from "react";

import { addAvailabilityRuleAction, addExceptionAction } from "@/app/actions/tutor";
import { WEEKDAYS_SHORT, WEEKDAY_ORDER } from "@/lib/format";
import { Alert, Field, inputClass, labelClass } from "./ui";
import { SubmitButton } from "./SubmitButton";

export function AddAvailabilityRuleForm() {
  const [state, formAction] = useActionState(addAvailabilityRuleAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <fieldset>
        <legend className={labelClass}>Days</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEEKDAY_ORDER.map((day) => (
            <label
              key={day}
              className="cursor-pointer rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700"
            >
              <input type="checkbox" name="weekday" value={day} className="sr-only" />
              {WEEKDAYS_SHORT[day]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <Field label="From" htmlFor="startTime">
          <input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue="16:00"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Until" htmlFor="endTime">
          <input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue="19:00"
            required
            className={inputClass}
          />
        </Field>
      </div>

      <SubmitButton pendingLabel="Adding…">Add to my week</SubmitButton>
    </form>
  );
}

export function AddExceptionForm() {
  const [state, formAction] = useActionState(addExceptionAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Date" htmlFor="date">
        <input id="date" name="date" type="date" required className={inputClass} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink-600">
        <input
          type="checkbox"
          name="allDay"
          defaultChecked
          className="size-4 rounded border-ink-200 text-brand-600"
        />
        Away all day
      </label>

      <div className="grid grid-cols-2 gap-4">
        <Field label="From" hint="Only if not all day." htmlFor="exStart">
          <input id="exStart" name="startTime" type="time" className={inputClass} />
        </Field>
        <Field label="Until" hint="Only if not all day." htmlFor="exEnd">
          <input id="exEnd" name="endTime" type="time" className={inputClass} />
        </Field>
      </div>

      <Field label="Note" hint="Optional, shown on your public profile." htmlFor="note">
        <input id="note" name="note" placeholder="Half term" className={inputClass} />
      </Field>

      <SubmitButton pendingLabel="Blocking…" variant="secondary">
        Block this out
      </SubmitButton>
    </form>
  );
}
