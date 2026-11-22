/**
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
 * command line. Runs on the local Node server only (it writes to disk).
 */
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { INSTAGRAM_FILES, checkInstagramExport } from '@/lib/instagramFiles';
import { DATA_DIR, REPO_ROOT, readSnapshot } from '@/lib/server/snapshotStore';
import { isValidSnapshotName, normaliseSnapshotName } from '@/lib/snapshotName';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const run = promisify(execFile);

/** Python with pandas + pyarrow installed. */
const PYTHON = process.env.SNAPSHOT_PYTHON ?? 'python3';
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const TRANSFORM_TIMEOUT_MS = 5 * 60 * 1000;

const fail = (status: number, error: string) => Response.json({ error }, { status });

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

  // Read and check all three before writing anything — the same checks as the
  // upload page (lib/instagramFiles.ts), so nothing unusable reaches data/.
  const missing = INSTAGRAM_FILES.filter((spec) => !(form.get(spec.kind) instanceof File));
  if (missing.length > 0) {
    return fail(400, `Still needed: ${missing.map((spec) => spec.fileName).join(', ')}.`);
  }
  const contents: { fileName: string; text: string }[] = [];
  for (const spec of INSTAGRAM_FILES) {
    const file = form.get(spec.kind) as File;
    if (file.size > MAX_FILE_BYTES) return fail(413, `${spec.fileName} is too large.`);
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
    await Promise.all(
      contents.map(({ fileName, text }) => writeFile(path.join(DATA_DIR, fileName), text, 'utf8')),
    );
  } catch (error) {
    console.error('[snapshot] saving files failed', error);
    return fail(500, 'Could not save the files to data/.');
  }

  const python = (script: string) =>
    run(PYTHON, [script, name], { cwd: REPO_ROOT, timeout: TRANSFORM_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

  // 1. One row per reel.
  let transformLog: string;
  try {
    transformLog = (await python('filter/transform.py')).stdout.trim();
  } catch (error) {
    const err = error as { stderr?: string; message: string };
    console.error('[snapshot] transform failed', err.stderr ?? err.message);
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
    const err = error as { stderr?: string; message: string };
    console.error('[snapshot] features failed', err.stderr ?? err.message);
    return fail(500, 'The files were saved and transformed, but running the features failed. See the server log.');
  }

  return Response.json({
    name,
    saved: contents.map((c) => `data/${c.fileName}`),
    outputs: [`data/${name}_reels.parquet`, `data/${name}_reels.csv`, `data/${name}_snapshot.json`],
    reels: Number.isFinite(reels) ? reels : null,
    failedSections,
    log: transformLog,
  });
}
