/**
 * Everything in this app is scheduled in UK local time, but stored as absolute
 * UTC instants. These helpers are the only place that conversion happens, so
 * that British Summer Time is handled in exactly one spot.
 */

export const TZ = "Europe/London";

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export type LondonParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday .. 6 = Saturday
  minuteOfDay: number;
  dateKey: string; // YYYY-MM-DD
};

function rawParts(instant: Date) {
  const out: Record<string, string> = {};
  for (const { type, value } of partsFormatter.formatToParts(instant)) {
    out[type] = value;
  }
  return out;
}

/** How many minutes ahead of UTC Europe/London is at the given instant. */
export function londonOffsetMinutes(instant: Date): number {
  const p = rawParts(instant);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  // The formatted parts only carry second resolution, so compare like with like.
  return (asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000;
}

/** Break an absolute instant into its Europe/London calendar fields. */
export function londonParts(instant: Date): LondonParts {
  const p = rawParts(instant);
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    minuteOfDay: hour * 60 + minute,
    dateKey: `${p.year}-${p.month}-${p.day}`,
  };
}

/**
 * Convert a London wall-clock time to the absolute instant it refers to.
 *
 * Done by guessing with the offset at the naive instant and then re-checking,
 * which resolves clock changes. On the spring-forward morning a wall time that
 * does not exist (01:30) resolves forward; on the autumn morning an ambiguous
 * wall time resolves to the first (BST) occurrence.
 */
export function londonWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
): Date {
  const naive = Date.UTC(year, month - 1, day, 0, 0) + minuteOfDay * 60_000;
  const firstGuess = naive - londonOffsetMinutes(new Date(naive)) * 60_000;
  const settled = naive - londonOffsetMinutes(new Date(firstGuess)) * 60_000;
  return new Date(settled);
}

/** The London calendar date `offset` days from the London date of `instant`. */
export function londonDateAtOffset(instant: Date, offset: number) {
  const { year, month, day } = londonParts(instant);
  const shifted = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    dateKey: shifted.toISOString().slice(0, 10),
  };
}

/** Parse a YYYY-MM-DD date key without any timezone drift. */
export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

/** Midnight UTC for a date key — how @db.Date columns are stored. */
export function dateKeyToUtcMidnight(key: string): Date | null {
  const parsed = parseDateKey(key);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
}

export function utcMidnightToDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
