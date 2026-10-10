const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o });
const md = fmt({ month: "short", day: "numeric" });
const wdmd = fmt({ weekday: "short", month: "short", day: "numeric" });
const wd = fmt({ weekday: "short" });

// "2026-10-03" -> Date at UTC midnight, formatted in UTC so the day never shifts.
const d = (day: string) => new Date(`${day}T00:00:00Z`);
export const shortDate = (day: string) => md.format(d(day));
export const longDate = (day: string) => wdmd.format(d(day));
export const weekdayShort = (day: string) => wd.format(d(day));

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

export function ago(iso: string | null) {
  if (!iso) return "Never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  const days = Math.round(s / 86400);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export const n = (v: number) => v.toLocaleString("en-US");
