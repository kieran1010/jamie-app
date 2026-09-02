import { TIME_BANDS } from "@/lib/availability";
import { WEEKDAYS_SHORT, WEEKDAY_ORDER } from "@/lib/format";
import type { SearchCriteria } from "@/lib/search";
import { RADIUS_OPTIONS } from "@/lib/search";
import { buttonPrimary, buttonSecondary, Field, inputClass, labelClass } from "./ui";

type Taxonomy = {
  subjectsByCategory: [string, { id: string; slug: string; name: string }[]][];
  levels: { id: string; slug: string; name: string }[];
};

/**
 * A plain GET form, so filters live in the URL: results are shareable,
 * bookmarkable and work with the browser's back button.
 */
export function SearchFilters({
  criteria,
  taxonomy,
}: {
  criteria: SearchCriteria;
  taxonomy: Taxonomy;
}) {
  return (
    <form action="/search" className="space-y-5 rounded-xl border border-ink-200 bg-white p-5">
      <Field label="Subject" htmlFor="f-subject">
        <select
          id="f-subject"
          name="subject"
          defaultValue={criteria.subjectSlug ?? ""}
          className={inputClass}
        >
          <option value="">Any subject</option>
          {taxonomy.subjectsByCategory.map(([category, subjects]) => (
            <optgroup key={category} label={category}>
              {subjects.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field label="Level" htmlFor="f-level">
        <select
          id="f-level"
          name="level"
          defaultValue={criteria.levelSlug ?? ""}
          className={inputClass}
        >
          <option value="">Any level</option>
          {taxonomy.levels.map((l) => (
            <option key={l.id} value={l.slug}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Postcode" htmlFor="f-postcode">
        <input
          id="f-postcode"
          name="postcode"
          defaultValue={criteria.postcode ?? ""}
          placeholder="e.g. SE1 9RT"
          autoComplete="postal-code"
          className={inputClass}
        />
      </Field>

      <Field label="Search radius" htmlFor="f-radius">
        <select
          id="f-radius"
          name="radius"
          defaultValue={String(criteria.radiusMiles)}
          className={inputClass}
        >
          {RADIUS_OPTIONS.map((miles) => (
            <option key={miles} value={miles}>
              Within {miles} miles
            </option>
          ))}
        </select>
      </Field>

      <Field label="Lessons" htmlFor="f-mode">
        <select id="f-mode" name="mode" defaultValue={criteria.mode} className={inputClass}>
          <option value="ANY">Online or in person</option>
          <option value="ONLINE">Online only</option>
          <option value="IN_PERSON">In person only</option>
        </select>
      </Field>

      <fieldset>
        <legend className={labelClass}>Days that suit you</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEEKDAY_ORDER.map((day) => (
            <label
              key={day}
              className="cursor-pointer rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700"
            >
              <input
                type="checkbox"
                name="day"
                value={day}
                defaultChecked={criteria.weekdays.includes(day)}
                className="sr-only"
              />
              {WEEKDAYS_SHORT[day]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>Times that suit you</legend>
        <div className="mt-2 space-y-1.5">
          {(Object.keys(TIME_BANDS) as (keyof typeof TIME_BANDS)[]).map((band) => (
            <label key={band} className="flex items-center gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                name="band"
                value={band}
                defaultChecked={criteria.bands.includes(band)}
                className="size-4 rounded border-ink-200 text-brand-600 focus:ring-brand-500"
              />
              {TIME_BANDS[band].label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Maximum hourly rate" hint="Leave blank for any rate." htmlFor="f-price">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-400">£</span>
          <input
            id="f-price"
            name="maxPrice"
            inputMode="decimal"
            defaultValue={criteria.maxPricePence ? (criteria.maxPricePence / 100).toString() : ""}
            placeholder="45"
            className={inputClass}
          />
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink-600">
        <input
          type="checkbox"
          name="verified"
          value="1"
          defaultChecked={criteria.verifiedOnly}
          className="size-4 rounded border-ink-200 text-brand-600 focus:ring-brand-500"
        />
        Verified tutors only
      </label>

      <Field label="Sort by" htmlFor="f-sort">
        <select id="f-sort" name="sort" defaultValue={criteria.sort} className={inputClass}>
          <option value="distance">Nearest first</option>
          <option value="price">Lowest price first</option>
          <option value="experience">Most experienced first</option>
        </select>
      </Field>

      <div className="flex gap-2">
        <button type="submit" className={`${buttonPrimary} flex-1`}>
          Apply filters
        </button>
        <a href="/search" className={buttonSecondary}>
          Clear
        </a>
      </div>
    </form>
  );
}
