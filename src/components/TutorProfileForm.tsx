"use client";

import { useActionState } from "react";

import { saveTutorProfileAction } from "@/app/actions/tutor";
import { Alert, Field, inputClass, labelClass } from "./ui";
import { SubmitButton } from "./SubmitButton";

export type TutorProfileDefaults = {
  headline: string;
  bio: string;
  hourlyRate: string;
  postcode: string;
  travelRadiusMiles: number;
  yearsExperience: number;
  qualifications: string;
  dbsCertificateNumber: string;
  dbsIssuedOn: string;
  offersOnline: boolean;
  offersInPerson: boolean;
  published: boolean;
};

export function TutorProfileForm({ defaults }: { defaults: TutorProfileDefaults }) {
  const [state, formAction] = useActionState(saveTutorProfileAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field
        label="Headline"
        hint="One line students see first, e.g. 'A-Level Maths and Physics, exam-board focused'."
        htmlFor="headline"
      >
        <input
          id="headline"
          name="headline"
          defaultValue={defaults.headline}
          required
          maxLength={120}
          className={inputClass}
        />
      </Field>

      <Field
        label="About your teaching"
        hint="What you cover, how you run a session, and who you work best with."
        htmlFor="bio"
      >
        <textarea
          id="bio"
          name="bio"
          rows={6}
          defaultValue={defaults.bio}
          required
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hourly rate (£)" htmlFor="hourlyRate">
          <input
            id="hourlyRate"
            name="hourlyRate"
            inputMode="decimal"
            defaultValue={defaults.hourlyRate}
            required
            placeholder="45"
            className={inputClass}
          />
        </Field>

        <Field label="Years of experience" htmlFor="yearsExperience">
          <input
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            min={0}
            max={70}
            defaultValue={defaults.yearsExperience}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Qualifications"
        hint="Degrees, teaching qualifications, examiner experience."
        htmlFor="qualifications"
      >
        <input
          id="qualifications"
          name="qualifications"
          defaultValue={defaults.qualifications}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Postcode"
          hint="Only the first part is shown publicly. Used to measure distance."
          htmlFor="postcode"
        >
          <input
            id="postcode"
            name="postcode"
            defaultValue={defaults.postcode}
            required
            placeholder="SE1 9RT"
            autoComplete="postal-code"
            className={inputClass}
          />
        </Field>

        <Field label="How far will you travel?" htmlFor="travelRadiusMiles">
          <select
            id="travelRadiusMiles"
            name="travelRadiusMiles"
            defaultValue={String(defaults.travelRadiusMiles)}
            className={inputClass}
          >
            {[0, 1, 2, 3, 5, 8, 10, 15, 20, 30].map((miles) => (
              <option key={miles} value={miles}>
                {miles === 0 ? "I don't travel" : `Up to ${miles} miles`}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelClass}>Lesson types you offer</legend>
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            name="offersInPerson"
            defaultChecked={defaults.offersInPerson}
            className="size-4 rounded border-ink-200 text-brand-600"
          />
          In person
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            name="offersOnline"
            defaultChecked={defaults.offersOnline}
            className="size-4 rounded border-ink-200 text-brand-600"
          />
          Online
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-ink-200 p-4">
        <legend className="px-1 text-sm font-semibold text-ink-900">
          DBS certificate (optional)
        </legend>
        <p className="text-xs text-ink-400">
          Entering your certificate details doesn&apos;t verify you by itself. A Tutorly admin
          checks the certificate before the verified badge appears on your profile.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Certificate number" htmlFor="dbsCertificateNumber">
            <input
              id="dbsCertificateNumber"
              name="dbsCertificateNumber"
              defaultValue={defaults.dbsCertificateNumber}
              className={inputClass}
            />
          </Field>
          <Field label="Date issued" htmlFor="dbsIssuedOn">
            <input
              id="dbsIssuedOn"
              name="dbsIssuedOn"
              type="date"
              defaultValue={defaults.dbsIssuedOn}
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      <label className="flex items-start gap-2 rounded-lg bg-ink-100 p-3 text-sm text-ink-600">
        <input
          type="checkbox"
          name="published"
          defaultChecked={defaults.published}
          className="mt-0.5 size-4 rounded border-ink-200 text-brand-600"
        />
        <span>
          <span className="font-medium text-ink-900">Show my profile in search results.</span>
          <br />
          Untick this to take a break without deleting anything.
        </span>
      </label>

      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
