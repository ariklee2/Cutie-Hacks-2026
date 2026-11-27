/**
 * POST /api/recommendations — runs `python3 features/recommender.py <name>`
 * for a user who already has a snapshot, writing
 * data/<name>_recommendations.json. Body: { "name": "<name>" }.
 *
 * This spends Apify credit (≈ $0.16 for an uncached run; cached hashtag
 * queries are free) and takes up to a minute. The recommendations scene calls
 * it automatically when it opens and there are no results yet. One run per
 * name at a time, and (in production) a daily cap on runs across all users
 * (lib/server/deployPolicy.ts). The Apify token stays in the Python process (APIFY_TOKEN in the
 * repo-root .env); it never reaches this route or the browser.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { recommendationsEnabled, takeRecommendationRun } from '@/lib/server/deployPolicy';
import { REPO_ROOT, readRecommendations, readSnapshot } from '@/lib/server/snapshotStore';
import { isValidSnapshotName, normaliseSnapshotName } from '@/lib/snapshotName';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const run = promisify(execFile);
const PYTHON = process.env.SNAPSHOT_PYTHON ?? 'python3';
const TIMEOUT_MS = 5 * 60 * 1000;

/** Names with a run in progress (a double click must not pay twice). */
const running = new Set<string>();

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = normaliseSnapshotName(String(body?.name ?? ''));
  if (!isValidSnapshotName(name)) return fail(400, 'Invalid name.');
  if (!(await readSnapshot(name))) return fail(404, `No snapshot for ${name}. Upload your files first.`);
  if (!recommendationsEnabled) return fail(503, 'Recommendations are turned off on this server.');
  if (running.has(name)) return fail(409, 'Recommendations are already being found for this name.');

  running.add(name);
  if (!(await takeRecommendationRun())) {
    running.delete(name);
    return fail(429, 'Today’s recommendations are all used up. Try again tomorrow.');
  }
  try {
    await run(PYTHON, ['features/recommender.py', name], { cwd: REPO_ROOT, timeout: TIMEOUT_MS });
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message: string };
    // recommender.py exits with a one-line reason (no token is ever printed).
    const reason = (err.stderr || err.stdout || '').trim().split('\n').pop() || err.message;
    console.error('[recommendations] failed:', reason);
    return fail(500, `Couldn't find recommendations: ${reason}`);
  } finally {
    running.delete(name);
  }

  const recommendations = await readRecommendations(name);
  if (!recommendations) return fail(500, 'The recommender ran but wrote no results.');
  return Response.json({ reels: recommendations.reels.length, profiles: recommendations.profiles.length });
}
