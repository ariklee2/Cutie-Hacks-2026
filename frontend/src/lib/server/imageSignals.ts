/**
 * After an upload: fetch what Instagram's image recognition saw in each of
 * the person's reels (features/reel_media.py, via Apify; cached per reel in
 * data/<name>_apify_media.json) and then rebuild data/<name>_snapshot.json,
 * so the club classifier can use those image objects. Runs in the
 * background — the upload has already answered with a text-only snapshot,
 * and the club result improves when this finishes (usually a couple of
 * minutes). Failures are only logged: the text-only snapshot stays.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { imageSignalsEnabled, takeImageSignalRun } from './deployPolicy';
import { REPO_ROOT } from './snapshotStore';

const run = promisify(execFile);
const PYTHON = process.env.SNAPSHOT_PYTHON ?? 'python3';
const FETCH_TIMEOUT_MS = 10 * 60 * 1000;
const REBUILD_TIMEOUT_MS = 5 * 60 * 1000;

const store = globalThis as typeof globalThis & { __snapshotImageSignalRuns?: Set<string> };
const running = (store.__snapshotImageSignalRuns ??= new Set<string>());

export function startImageSignalsInBackground(name: string): void {
  if (!imageSignalsEnabled || running.has(name)) return;
  running.add(name);
  void (async () => {
    try {
      if (!(await takeImageSignalRun())) {
        console.warn(`[image signals] daily limit reached; ${name} keeps its text-only club`);
        return;
      }
      const python = (args: string[], timeout: number) =>
        run(PYTHON, args, { cwd: REPO_ROOT, timeout, maxBuffer: 10 * 1024 * 1024 });
      await python(['features/reel_media.py', name], FETCH_TIMEOUT_MS);
      await python(['features/snapshot.py', name], REBUILD_TIMEOUT_MS);
      console.log(`[image signals] ${name}: snapshot rebuilt with image objects`);
    } catch (error) {
      const err = error as { stderr?: string; stdout?: string; message: string };
      const reason = (err.stderr || err.stdout || '').trim().split('\n').pop() || err.message;
      console.error(`[image signals] ${name} failed:`, reason);
    } finally {
      running.delete(name);
    }
  })();
}
