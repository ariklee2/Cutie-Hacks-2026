/**
 * GET /api/snapshot?name=<name> — whether a saved snapshot exists for that
 * name (data/<name>_snapshot.json), so a returning visitor can open it
 * without uploading again: `{ name, exists }`.
 *
 * POST /api/snapshot — saves the three Instagram export files into the repo's
 * data/ folder, runs the backend's transform on them, then runs every feature
 * and saves the results together:
 *
 *   data/<name>_liked_posts.json
 *   data/<name>_saved_posts.json      →  python3 filter/transform.py <name>
 *   data/<name>_videos_watched.json      → data/<name>_reels.parquet / .csv
 *                                     →  python3 features/snapshot.py <name>
 *                                          → data/<name>_snapshot.json
 *
 * Form fields: `name`, plus one file each under `liked_posts`, `saved_posts`
 * and `videos_watched`. The Python code is run unchanged, exactly as from the
 * command line. Runs on a Node server next to the repo (it writes to disk).
 *
 * Once the snapshot is written, two jobs start in the background without
 * holding up the response: the recommender (lib/server/recommendations.ts)
 * and the image-signal fetch, which rebuilds the snapshot with image objects
 * for the club classifier (lib/server/imageSignals.ts).
 *
 * In production (lib/server/deployPolicy.ts): an existing name is refused
 * rather than overwritten, and once the snapshot is built the raw JSON
 * uploads and the CSV copy are deleted — only the parquet table (needed for
 * recommendations) and the snapshot stay.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { INSTAGRAM_FILES, checkInstagramExport } from '@/lib/instagramFiles';
import { MAX_UPLOAD_BYTES, allowSnapshotOverwrite, keepUploads } from '@/lib/server/deployPolicy';
import { startImageSignalsInBackground } from '@/lib/server/imageSignals';
import { startRecommendationsInBackground } from '@/lib/server/recommendations';
import { pythonFailure, runPython } from '@/lib/server/python';
import { DATA_DIR, readSnapshot } from '@/lib/server/snapshotStore';
import { isValidSnapshotName, normaliseSnapshotName } from '@/lib/snapshotName';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRANSFORM_TIMEOUT_MS = 5 * 60 * 1000;

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const name = normaliseSnapshotName(new URL(request.url).searchParams.get('name') ?? '');
  if (!isValidSnapshotName(name)) return Response.json({ name, exists: false });
  return Response.json({ name, exists: (await readSnapshot(name)) !== null });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'Expected a form upload.');
  }

  const name = normaliseSnapshotName(String(form.get('name') ?? ''));
  if (!isValidSnapshotName(name)) {
    return fail(400, 'Name must be 1–40 letters, numbers, - or _.');
  }
  if (!allowSnapshotOverwrite && (await readSnapshot(name))) {
    return fail(409, `The name “${name}” is already taken. Pick another name.`);
  }

  // Read and check all three before writing anything — the same checks as the
  // upload page (lib/instagramFiles.ts), so nothing unusable reaches data/.
  const missing = INSTAGRAM_FILES.filter((spec) => !(form.get(spec.kind) instanceof File));
  if (missing.length > 0) {
    return fail(400, `Still needed: ${missing.map((spec) => spec.fileName).join(', ')}.`);
  }
  const contents: { fileName: string; text: string }[] = [];
  for (const spec of INSTAGRAM_FILES) {
    const file = form.get(spec.kind) as File;
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail(413, `${spec.fileName} is too large (the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
    }
    const text = await file.text();
    try {
      checkInstagramExport(spec.kind, text);
    } catch (error) {
      return fail(400, `${spec.fileName} can't be used: ${(error as Error).message}`);
    }
    contents.push({ fileName: `${name}_${spec.kind}.json`, text });
  }

  try {
    // data/ isn't in git (uploads are personal), so a fresh clone may not have it.
    await mkdir(DATA_DIR, { recursive: true });
    // A new upload for a name (development allows overwriting) gets new
    // recommendations: don't show the old ones while those are found.
    await rm(path.join(DATA_DIR, `${name}_recommendations.json`), { force: true });
    await Promise.all(
      contents.map(({ fileName, text }) => writeFile(path.join(DATA_DIR, fileName), text, 'utf8')),
    );
  } catch (error) {
    console.error('[snapshot] saving files failed', error);
    return fail(500, 'Could not save the files to data/.');
  }

  const python = (script: string) => runPython(script, [name], TRANSFORM_TIMEOUT_MS);

  // 1. One row per reel.
  let transformLog: string;
  try {
    transformLog = (await python('filter/transform.py')).trim();
  } catch (error) {
    console.error('[snapshot] transform failed:', pythonFailure(error));
    return fail(500, 'The files were saved, but the transform failed. See the server log.');
  }
  // transform.py ends with: "wrote <N> reels to <name>_reels.parquet and <name>_reels.csv ..."
  const reels = Number(transformLog.match(/wrote (\d+) reels/)?.[1] ?? NaN);

  // 2. Every feature, saved together in data/<name>_snapshot.json.
  let failedSections: string[];
  try {
    await python('features/snapshot.py');
    const snapshot = await readSnapshot(name);
    if (!snapshot) throw new Error(`data/${name}_snapshot.json was not written`);
    failedSections = snapshot.failed_sections ?? [];
  } catch (error) {
    console.error('[snapshot] features failed:', pythonFailure(error));
    return fail(500, 'The files were saved and transformed, but running the features failed. See the server log.');
  }

  // The raw exports aren't needed once the reels table exists: don't keep
  // people's Instagram data around longer than it takes to build the snapshot.
  if (!keepUploads) {
    const raw = [...contents.map((c) => c.fileName), `${name}_reels.csv`];
    await Promise.all(raw.map((f) => rm(path.join(DATA_DIR, f), { force: true }))).catch((error) =>
      console.error('[snapshot] removing uploads failed', error),
    );
  }

  // Start finding recommendations now, in the background, so they're usually
  // ready by the time the person reaches the For you scene.
  startRecommendationsInBackground(name);
  // And fetch the reels' image objects, then rebuild the snapshot so the club
  // classifier can use them (the text-only snapshot is already there).
  startImageSignalsInBackground(name);

  return Response.json({
    name,
    saved: contents.map((c) => `data/${c.fileName}`),
    outputs: [`data/${name}_reels.parquet`, `data/${name}_reels.csv`, `data/${name}_snapshot.json`],
    reels: Number.isFinite(reels) ? reels : null,
    failedSections,
    log: transformLog,
  });
}
