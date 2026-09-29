// The app works in Philippine time (Asia/Manila, UTC+8, no daylight saving)
// regardless of the device's or server's clock settings: hosting servers
// run on UTC, and a staff laptop may be set to another zone.
export const APP_TIME_ZONE = "Asia/Manila";

// Today's date in the Philippines, YYYY-MM-DD (optionally `offsetDays` ago/ahead).
export function manilaDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });
}

// The current time in the Philippines, HH:MM (24-hour).
export function manilaTime(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

// A stored timestamp (e.g. created_at) as Philippine date and time,
// e.g. "Sep 28, 2026, 12:06 PM".
export function formatManila(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-US", {
        timeZone: APP_TIME_ZONE,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}
