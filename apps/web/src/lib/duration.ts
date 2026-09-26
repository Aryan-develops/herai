/** "How long did it last?" presets, in minutes, and a friendly formatter shared by the log forms and the timeline. */
export const DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 5, label: "A moment" },
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 180, label: "A few hours" },
  { minutes: 720, label: "Most of the day" },
  { minutes: 1440, label: "All day" },
  { minutes: 2880, label: "2+ days" },
];

export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const preset = DURATIONS.find((d) => d.minutes === minutes);
  if (preset) return preset.label.toLowerCase();
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} days`;
}
