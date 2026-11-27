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

/** Upload limit per file. Real exports are a few MB; this leaves plenty of room. */
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

const dailyLimit = (() => {
  const raw = process.env.RECOMMENDATIONS_DAILY_LIMIT;
  if (raw === undefined || raw.trim() === '') return production ? 20 : Infinity;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : production ? 20 : Infinity;
})();

/** Run counts live in data/ so they survive restarts (data/ is the persistent disk). */
const USAGE_FILE = path.join(DATA_DIR, '_recommendation_runs.json');
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Takes one recommender run from today's allowance. Returns false (and
 * takes nothing) when today's limit is used up.
 */
export async function takeRecommendationRun(): Promise<boolean> {
  if (dailyLimit === Infinity) return true;
  let usage = { date: today(), runs: 0 };
  try {
    const saved = JSON.parse(await readFile(USAGE_FILE, 'utf8')) as typeof usage;
    if (saved.date === usage.date && Number.isFinite(saved.runs)) usage = saved;
  } catch {
    // No file yet (or unreadable): today starts at zero.
  }
  if (usage.runs >= dailyLimit) return false;
  await writeFile(USAGE_FILE, JSON.stringify({ date: usage.date, runs: usage.runs + 1 }), 'utf8');
  return true;
}
