/**
 * Shape of data/<user>_snapshot.json, written by features/snapshot.py after
 * every upload. This is the data the snapshot pages and charts are built from.
 * Keep in sync with SCHEMA_VERSION in features/snapshot.py.
 *
 * Times are ISO 8601 strings (UTC unless noted); shares are 0–1. A section
 * whose feature failed is `{ error: string }` instead, and is listed in
 * `failed_sections`.
 */

export interface SectionError {
  error: string;
}

export type Section<T> = T | SectionError;

export const isSectionError = <T>(section: Section<T>): section is SectionError =>
  typeof section === 'object' && section !== null && 'error' in section;

export interface SnapshotData {
  user: string;
  schema_version: 1;
  generated_at: string;
  /** features/top_creators.py — watched reels per creator (3s+ views), top 5. */
  top_creators: Section<{ creator: string; reels: number }[]>;
  /** features/top_hashtags.py — watched reels per hashtag, top 5. */
  top_hashtags: Section<{ hashtag: string; reels: number }[]>;
  /** features/reels_watched_duration.py — dates are local to `timezone`. */
  watch_time: Section<{
    timezone: string;
    total_hours: number;
    per_day: { date: string; weekday: string; hours: number }[];
    busiest_day: { date: string; weekday: string; hours: number } | null;
  }>;
  /** features/binge_session.py — sessions of 2+ reels, ≤ 2 min apart, longest first. */
  binge_sessions: Section<{
    count: number;
    median_minutes: number | null;
    longest: BingeSession[];
    sessions: BingeSession[];
  }>;
  /** features/loyal_or_variety.py — score 0–100; 50+ is Loyal. */
  loyal_or_variety: Section<{
    label: 'Loyal' | 'Variety' | 'Unknown';
    score: number | null;
    repeat_share?: number;
    top5_share?: number;
    concentration?: number;
    engaged_reels?: number;
    creators?: number;
    one_time_creators?: number;
    top_creators?: { creator: string; points: number }[];
  }>;
  /** features/clubs.py — the user's club and each club's share of engagement. */
  club: Section<{
    club: string;
    reason: string;
    shares: { club: string; share: number }[];
    reels_counted?: number;
    reels_unclassified?: number;
    by_source?: Record<string, number>;
  }>;
  failed_sections: string[];
}

export interface BingeSession {
  start: string;
  end: string;
  minutes: number;
  reels: number;
}
