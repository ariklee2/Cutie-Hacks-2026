/**
 * Safety rules for a public deployment. Each one defaults to "safe" when the
 * server runs in production (NODE_ENV=production, i.e. `next start` / the
 * Docker image) and to the old local-development behavior otherwise; every
 * one can be overridden with an environment variable.
 *
 *   ALLOW_SNAPSHOT_OVERWRITE  "true" lets an upload replace an existing name
 *                             (default: only in development)
 *   KEEP_UPLOADS              "true" keeps the raw Instagram JSON files and the
 *                             CSV copy after a snapshot is built (default: only
 *                             in development; the parquet table is always kept)
 *   RECOMMENDATIONS_ENABLED   "false" turns the Find recommendations button off
 *   RECOMMENDATIONS_DAILY_LIMIT  recommender runs allowed per UTC day across all
 *                             users, each of which may spend Apify credit
 *                             (default: 20 in production, unlimited otherwise)
 *   IMAGE_SIGNALS_ENABLED     "false" stops fetching image objects for the club
 *                             classifier after uploads
 *   IMAGE_SIGNALS_DAILY_LIMIT  image-signal fetches allowed per UTC day (each
 *                             ≈ $0.65 of Apify credit for ~250 reels; default
 *                             20 in production, unlimited otherwise)
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { DATA_DIR } from './snapshotStore';

const production = process.env.NODE_ENV === 'production';

const flag = (name: string, fallback: boolean) => {
  const value = process.env[name]?.trim().toLowerCase();
  return value === undefined || value === '' ? fallback : value === 'true' || value === '1';
};

export const allowSnapshotOverwrite = flag('ALLOW_SNAPSHOT_OVERWRITE', !production);
export const keepUploads = flag('KEEP_UPLOADS', !production);
export const recommendationsEnabled = flag('RECOMMENDATIONS_ENABLED', true);
export const imageSignalsEnabled = flag('IMAGE_SIGNALS_ENABLED', true);

/** Upload limit per file. Real exports are a few MB; this leaves plenty of room. */
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

/** A daily limit from an env var: unset → 20 in production, unlimited otherwise. */
const limitFrom = (name: string) => {
  const raw = process.env[name];
  const fallback = production ? 20 : Infinity;
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Takes one run from today's allowance in `file` (in data/, so counts
 * survive restarts). Returns false, taking nothing, when it's used up.
 */
async function takeDailyRun(file: string, limit: number): Promise<boolean> {
  if (limit === Infinity) return true;
  const usageFile = path.join(DATA_DIR, file);
  let usage = { date: today(), runs: 0 };
  try {
    const saved = JSON.parse(await readFile(usageFile, 'utf8')) as typeof usage;
    if (saved.date === usage.date && Number.isFinite(saved.runs)) usage = saved;
  } catch {
    // No file yet (or unreadable): today starts at zero.
  }
  if (usage.runs >= limit) return false;
  await writeFile(usageFile, JSON.stringify({ date: usage.date, runs: usage.runs + 1 }), 'utf8');
  return true;
}

const recommendationLimit = limitFrom('RECOMMENDATIONS_DAILY_LIMIT');
const imageSignalLimit = limitFrom('IMAGE_SIGNALS_DAILY_LIMIT');

/** One recommender run (Apify hashtag searches) from today's allowance. */
export const takeRecommendationRun = () => takeDailyRun('_recommendation_runs.json', recommendationLimit);

/** One image-signal fetch (Apify lookups of a user's reels) from today's allowance. */
export const takeImageSignalRun = () => takeDailyRun('_image_signal_runs.json', imageSignalLimit);
