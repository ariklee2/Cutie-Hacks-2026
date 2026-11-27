/**
 * POST /api/recommendations — runs `python3 features/recommender.py <name>`
 * for a user who already has a snapshot, writing
 * data/<name>_recommendations.json. Body: { "name": "<name>" }.
 *
 * This spends Apify credit (≈ $0.16 for an uncached run; cached hashtag
 * queries are free) and takes up to a minute. POST /api/snapshot already
 * starts a run in the background after each upload; the recommendations
 * scene calls this when it opens and there are still no results. One run per
 * name at a time, and (in production) a daily cap on runs across all users
 * (lib/server/deployPolicy.ts). The Apify token stays in the Python process (APIFY_TOKEN in the
 * repo-root .env); it never reaches this route or the browser.
 */
import { runRecommendations } from '@/lib/server/recommendations';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isValidSnapshotName, normaliseSnapshotName } from '@/lib/snapshotName';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = normaliseSnapshotName(String(body?.name ?? ''));
  if (!isValidSnapshotName(name)) return fail(400, 'Invalid name.');
  if (!(await readSnapshot(name))) return fail(404, `No snapshot for ${name}. Upload your files first.`);

  // 409 when a run for this name is already going (e.g. the one started by
  // the upload): the scene then waits and refreshes until the results exist.
  const outcome = await runRecommendations(name);
  if (!outcome.ok) return fail(outcome.status, outcome.error);
  return Response.json({ reels: outcome.reels, profiles: outcome.profiles });
}
