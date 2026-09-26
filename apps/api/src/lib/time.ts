const DAY_MS = 24 * 60 * 60 * 1000;
// Lunee is India-first: a "day" (task streaks, cycle day, plans) turns over at midnight IST (UTC+5:30), not at 05:30.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** A Date whose UTC fields read as the current wall-clock time in India. Use only for calendar-day maths. */
export function istNow(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** YYYY-MM-DD for the Indian calendar day `offsetDays` from today. */
export function istDay(offsetDays = 0): string {
  return new Date(Date.now() + IST_OFFSET_MS + offsetDays * DAY_MS).toISOString().slice(0, 10);
}
