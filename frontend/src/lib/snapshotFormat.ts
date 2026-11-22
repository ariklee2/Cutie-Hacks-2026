/** Formatting helpers shared by the snapshot pages. */
import { isSectionError, type SnapshotData } from '@/lib/snapshotData';

/** The backend splits days in this zone; used when the snapshot doesn't say. */
const DEFAULT_TIMEZONE = 'America/Los_Angeles';

/** Timezone the snapshot's local dates are in. */
export function snapshotTimezone(snapshot: SnapshotData): string {
  return isSectionError(snapshot.watch_time) ? DEFAULT_TIMEZONE : snapshot.watch_time.timezone;
}

/** "Nov 14" from a local "2026-11-14" date. */
export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Nov 14 – Nov 20" from the snapshot's per-day watch time, if available. */
export function weekRange(snapshot: SnapshotData): string | null {
  const watch = snapshot.watch_time;
  if (isSectionError(watch) || watch.per_day.length === 0) return null;
  return `${formatDate(watch.per_day[0].date)} – ${formatDate(watch.per_day[watch.per_day.length - 1].date)}`;
}

/** "4h 57m", "23m" or "under 1m" from a number of minutes. */
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 1) return 'under 1m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const formatHours = (hours: number) => formatMinutes(hours * 60);

/** "37%" from a 0–1 share. */
export const formatPercent = (share: number) => `${Math.round(share * 100)}%`;

/** "Fri, Nov 20" and "9:33 PM" for an ISO time, in the given zone. */
export function formatMoment(iso: string, timeZone: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone }),
  };
}
