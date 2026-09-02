"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { requestBookingAction } from "@/app/actions/booking";
import { Alert, Field, inputClass, labelClass } from "./ui";
import { SubmitButton } from "./SubmitButton";

export type SlotOption = {
  startAt: string;
  dateKey: string;
  dayLabel: string;
  timeLabel: string;
};

export type SubjectOption = {
  subjectId: string;
  levelId: string;
  label: string;
};

export type BookingFormProps = {
  tutorProfileId: string;
  tutorName: string;
  subjectOptions: SubjectOption[];
  offersOnline: boolean;
  offersInPerson: boolean;
  /** Bookable slots keyed by lesson length in minutes. */
  slotsByDuration: Record<string, SlotOption[]>;
  durations: number[];
  students: { id: string; name: string }[];
  viewer: "guest" | "seeker" | "tutor";
};

export function BookingForm(props: BookingFormProps) {
  const [state, formAction] = useActionState(requestBookingAction, undefined);
  const [duration, setDuration] = useState(String(props.durations[0]));
  const [pair, setPair] = useState(
    props.subjectOptions[0] ? `${props.subjectOptions[0].subjectId}:${props.subjectOptions[0].levelId}` : "",
  );
  const [startAt, setStartAt] = useState("");

  const slots = props.slotsByDuration[duration] ?? [];

  const days = useMemo(() => {
    const grouped = new Map<string, { dayLabel: string; slots: SlotOption[] }>();
    for (const slot of slots) {
      const existing = grouped.get(slot.dateKey);
      if (existing) existing.slots.push(slot);
      else grouped.set(slot.dateKey, { dayLabel: slot.dayLabel, slots: [slot] });
    }
    return [...grouped.entries()];
  }, [slots]);

  const [subjectId, levelId] = pair.split(":");

  if (props.viewer === "guest") {
    return (
      <Alert tone="info">
        <Link href="/login" className="font-semibold underline">
          Sign in
        </Link>{" "}
        or{" "}
        <Link href="/register" className="font-semibold underline">
          create a free account
        </Link>{" "}
        to request a lesson with {props.tutorName}.
      </Alert>
    );
  }

  if (props.viewer === "tutor") {
    return <Alert tone="info">Tutor accounts can&apos;t request lessons.</Alert>;
  }

  if (props.subjectOptions.length === 0) {
    return <Alert tone="warning">This tutor hasn&apos;t listed any subjects yet.</Alert>;
  }

  if (state?.success) {
    return <Alert tone="success">{state.success}</Alert>;
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <input type="hidden" name="tutorProfileId" value={props.tutorProfileId} />
      <input type="hidden" name="subjectId" value={subjectId ?? ""} />
      <input type="hidden" name="levelId" value={levelId ?? ""} />
      <input type="hidden" name="startAt" value={startAt} />

      <Field label="Subject and level" htmlFor="pair">
        <select
          id="pair"
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          className={inputClass}
        >
          {props.subjectOptions.map((option) => (
            <option key={`${option.subjectId}:${option.levelId}`} value={`${option.subjectId}:${option.levelId}`}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      {props.students.length > 0 ? (
        <Field label="Who is the lesson for?" htmlFor="studentId">
          <select id="studentId" name="studentId" className={inputClass} defaultValue="">
            <option value="">Me</option>
            {props.students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <fieldset>
        <legend className={labelClass}>Lesson length</legend>
        <div className="mt-2 flex gap-2">
          {props.durations.map((minutes) => (
            <label
              key={minutes}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                duration === String(minutes)
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              <input
                type="radio"
                name="duration"
                value={minutes}
                checked={duration === String(minutes)}
                onChange={() => {
                  setDuration(String(minutes));
                  // A slot valid for 60 minutes may not fit 120, so clear it.
                  setStartAt("");
                }}
                className="sr-only"
              />
              {minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes > 60 ? "s" : ""}`}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>Lesson type</legend>
        <div className="mt-2 flex gap-2">
          {props.offersInPerson ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-600 has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700">
              <input
                type="radio"
                name="mode"
                value="IN_PERSON"
                defaultChecked={props.offersInPerson}
                className="size-4 text-brand-600"
              />
              In person
            </label>
          ) : null}
          {props.offersOnline ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-600 has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700">
              <input
                type="radio"
                name="mode"
                value="ONLINE"
                defaultChecked={!props.offersInPerson}
                className="size-4 text-brand-600"
              />
              Online
            </label>
          ) : null}
        </div>
      </fieldset>

      <div>
        <p className={labelClass}>Choose a time</p>
        {days.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-400">
            No free slots of this length in the next few weeks. Try a shorter lesson.
          </p>
        ) : (
          <div className="mt-2 max-h-80 space-y-3 overflow-y-auto rounded-lg border border-ink-200 p-3">
            {days.map(([dateKey, day]) => (
              <div key={dateKey}>
                <p className="text-xs font-semibold text-ink-400">{day.dayLabel}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {day.slots.map((slot) => (
                    <label
                      key={slot.startAt}
                      className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                        startAt === slot.startAt
                          ? "border-brand-500 bg-brand-600 text-white"
                          : "border-ink-200 text-ink-600 hover:bg-ink-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="slotChoice"
                        checked={startAt === slot.startAt}
                        onChange={() => setStartAt(slot.startAt)}
                        className="sr-only"
                      />
                      {slot.timeLabel}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Field label="Message to the tutor" hint="Optional — what would you like to focus on?" htmlFor="message">
        <textarea id="message" name="message" rows={3} className={inputClass} />
      </Field>

      <SubmitButton pendingLabel="Sending request…" className="w-full">
        {startAt ? "Send lesson request" : "Choose a time to continue"}
      </SubmitButton>
      {!startAt ? (
        <p className="text-center text-xs text-ink-400">
          Pick one of the times above before sending your request.
        </p>
      ) : null}
    </form>
  );
}
