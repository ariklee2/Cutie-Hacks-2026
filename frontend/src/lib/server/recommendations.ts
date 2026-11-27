/**
 * Runs features/recommender.py for a name, writing
 * data/<name>_recommendations.json. Shared by POST /api/recommendations (the
 * For you scene) and POST /api/snapshot, which starts a run in the
 * background as soon as an upload is processed, so the results are usually
 * ready by the time the person reaches the For you scene.
 *
 * One run per name at a time (tracked on globalThis so every route sees the
 * same set), and each run takes one of the day's allowance in production
 * (deployPolicy.ts). The Apify token stays in the Python process.
 */
import { recommendationsEnabled, takeRecommendationRun } from './deployPolicy';
import { pythonFailure, runPython } from './python';
import { readRecommendations } from './snapshotStore';

const TIMEOUT_MS = 5 * 60 * 1000;

const store = globalThis as typeof globalThis & { __snapshotRecommendationRuns?: Set<string> };
/** Names with a run in progress (a double click or a second tab must not pay twice). */
const running = (store.__snapshotRecommendationRuns ??= new Set<string>());

export type RecommendationOutcome =
  | { ok: true; reels: number; profiles: number }
  | { ok: false; status: number; error: string };

export const isFindingRecommendations = (name: string) => running.has(name);

/** Runs the recommender now and waits for it. The name must already have a snapshot. */
export async function runRecommendations(name: string): Promise<RecommendationOutcome> {
  if (!recommendationsEnabled) return { ok: false, status: 503, error: 'Recommendations are turned off on this server.' };
  if (running.has(name)) {
    return { ok: false, status: 409, error: 'Recommendations are already being found for this name.' };
  }

  running.add(name);
  try {
    if (!(await takeRecommendationRun())) {
      return { ok: false, status: 429, error: 'Today’s recommendations are all used up. Try again tomorrow.' };
    }
    await runPython('features/recommender.py', [name], TIMEOUT_MS);
  } catch (error) {
    const reason = pythonFailure(error);
    console.error('[recommendations] failed:', reason);
    return { ok: false, status: 500, error: `Couldn't find recommendations: ${reason}` };
  } finally {
    running.delete(name);
  }

  const recommendations = await readRecommendations(name);
  if (!recommendations) return { ok: false, status: 500, error: 'The recommender ran but wrote no results.' };
  return { ok: true, reels: recommendations.reels.length, profiles: recommendations.profiles.length };
}

/**
 * Starts a run without waiting for it (after an upload). A failure is only
 * logged: the For you scene starts its own run, with a visible error and Try
 * again, if there are still no results when the person gets there.
 */
export function startRecommendationsInBackground(name: string): void {
  if (!recommendationsEnabled || running.has(name)) return;
  void runRecommendations(name).then((outcome) => {
    if (!outcome.ok && outcome.status !== 409) console.error(`[recommendations] background run for ${name}:`, outcome.error);
  });
}
