import {
  londonDateAtOffset,
  londonParts,
  londonWallTimeToUtc,
  utcMidnightToDateKey,
} from "./time";

/** Half-open interval of minutes from midnight, London local time. */
export type Interval = { start: number; end: number };

export type WeeklyRule = { weekday: number; startMinute: number; endMinute: number };
export type DateException = {
  date: Date;
  startMinute: number | null;
  endMinute: number | null;
};
export type BusyPeriod = { startAt: Date; endAt: Date };

export type Slot = {
  /** Absolute instant the lesson starts. */
  startAt: Date;
  endAt: Date;
  /** London calendar day, YYYY-MM-DD. */
  dateKey: string;
  startMinute: number;
};

/** Students cannot book a lesson starting sooner than this. */
export const MIN_LEAD_HOURS = 12;
/** Candidate start times are offered on this grid within each open window. */
export const SLOT_STEP_MINUTES = 30;
export const LESSON_DURATIONS = [60, 90, 120] as const;

export const TIME_BANDS = {
  morning: { label: "Morning (before 12pm)", start: 6 * 60, end: 12 * 60 },
  afternoon: { label: "Afternoon (12–5pm)", start: 12 * 60, end: 17 * 60 },
  evening: { label: "Evening (after 5pm)", start: 17 * 60, end: 22 * 60 },
} as const;

export type TimeBand = keyof typeof TIME_BANDS;

export function isTimeBand(value: string): value is TimeBand {
  return value in TIME_BANDS;
}

/** Remove `blocks` from `base`, returning whatever open time is left. */
export function subtractIntervals(base: Interval, blocks: Interval[]): Interval[] {
  let remaining: Interval[] = [base];

  for (const block of blocks) {
    const next: Interval[] = [];
    for (const piece of remaining) {
      if (block.end <= piece.start || block.start >= piece.end) {
        next.push(piece); // no overlap
        continue;
      }
      if (block.start > piece.start) next.push({ start: piece.start, end: block.start });
      if (block.end < piece.end) next.push({ start: block.end, end: piece.end });
    }
    remaining = next;
  }

  return remaining.filter((i) => i.end > i.start);
}

function mergeRules(rules: WeeklyRule[], weekday: number): Interval[] {
  const same = rules
    .filter((r) => r.weekday === weekday && r.endMinute > r.startMinute)
    .map((r) => ({ start: r.startMinute, end: r.endMinute }))
    .sort((a, b) => a.start - b.start);

  const merged: Interval[] = [];
  for (const interval of same) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/**
 * Turn a tutor's weekly pattern into concrete bookable slots.
 *
 * Weekly rules give the base availability; dated exceptions carve time out of
 * it (a null start/end blocks the whole day); accepted bookings block their own
 * span; and anything inside the lead time is dropped.
 */
export function generateSlots(options: {
  rules: WeeklyRule[];
  exceptions: DateException[];
  busy: BusyPeriod[];
  durationMinutes: number;
  days: number;
  now?: Date;
}): Slot[] {
  const { rules, exceptions, busy, durationMinutes, days } = options;
  const now = options.now ?? new Date();
  const earliest = now.getTime() + MIN_LEAD_HOURS * 60 * 60 * 1000;

  const exceptionsByDate = new Map<string, Interval[]>();
  for (const exception of exceptions) {
    const key = utcMidnightToDateKey(exception.date);
    const interval: Interval =
      exception.startMinute === null || exception.endMinute === null
        ? { start: 0, end: 1440 }
        : { start: exception.startMinute, end: exception.endMinute };
    const existing = exceptionsByDate.get(key);
    if (existing) existing.push(interval);
    else exceptionsByDate.set(key, [interval]);
  }

  const slots: Slot[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = londonDateAtOffset(now, offset);
    const windows = mergeRules(rules, day.weekday);
    if (windows.length === 0) continue;

    const blocked = exceptionsByDate.get(day.dateKey) ?? [];

    for (const window of windows) {
      for (const open of subtractIntervals(window, blocked)) {
        for (
          let start = open.start;
          start + durationMinutes <= open.end;
          start += SLOT_STEP_MINUTES
        ) {
          const startAt = londonWallTimeToUtc(day.year, day.month, day.day, start);
          if (startAt.getTime() < earliest) continue;

          const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
          const clashes = busy.some(
            (b) => b.startAt.getTime() < endAt.getTime() && b.endAt.getTime() > startAt.getTime(),
          );
          if (clashes) continue;

          slots.push({ startAt, endAt, dateKey: day.dateKey, startMinute: start });
        }
      }
    }
  }

  return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Group slots by London day, preserving chronological order. */
export function groupSlotsByDay(slots: Slot[]): { dateKey: string; slots: Slot[] }[] {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const existing = groups.get(slot.dateKey);
    if (existing) existing.push(slot);
    else groups.set(slot.dateKey, [slot]);
  }
  return [...groups.entries()].map(([dateKey, grouped]) => ({ dateKey, slots: grouped }));
}

/**
 * Confirm a requested lesson really sits inside the tutor's published
 * availability. The booking form only offers valid slots, but the request is
 * re-checked on the server because the form is a hint, not a guarantee.
 */
export function isSlotBookable(options: {
  startAt: Date;
  durationMinutes: number;
  rules: WeeklyRule[];
  exceptions: DateException[];
  busy: BusyPeriod[];
  now?: Date;
}): boolean {
  const { startAt, durationMinutes, rules, exceptions, busy } = options;
  const now = options.now ?? new Date();

  if (startAt.getTime() < now.getTime() + MIN_LEAD_HOURS * 60 * 60 * 1000) return false;

  const parts = londonParts(startAt);
  const endMinute = parts.minuteOfDay + durationMinutes;
  // A lesson may not run past midnight; tutors express availability per day.
  if (endMinute > 1440) return false;

  const windows = mergeRules(rules, parts.weekday);
  const blocked = exceptions
    .filter((e) => utcMidnightToDateKey(e.date) === parts.dateKey)
    .map<Interval>((e) =>
      e.startMinute === null || e.endMinute === null
        ? { start: 0, end: 1440 }
        : { start: e.startMinute, end: e.endMinute },
    );

  const fitsWindow = windows.some((window) =>
    subtractIntervals(window, blocked).some(
      (open) => parts.minuteOfDay >= open.start && endMinute <= open.end,
    ),
  );
  if (!fitsWindow) return false;

  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
  return !busy.some(
    (b) => b.startAt.getTime() < endAt.getTime() && b.endAt.getTime() > startAt.getTime(),
  );
}
