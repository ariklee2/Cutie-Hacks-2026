/**
 * Server-only access to the repo's data/ folder (the Python backend's files).
 * Import only from route handlers and server components: it uses node:fs.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { SnapshotData } from '@/lib/snapshotData';
import { isValidSnapshotName } from '@/lib/snapshotName';

/** Repo root: the folder that holds data/, filter/ and features/ (frontend's parent). */
export const REPO_ROOT = process.env.SNAPSHOT_REPO_ROOT ?? path.resolve(process.cwd(), '..');
export const DATA_DIR = path.join(REPO_ROOT, 'data');

/**
 * Reads data/<name>_snapshot.json (written by features/snapshot.py).
 * Returns null if the name is invalid or no snapshot exists for it.
 */
export async function readSnapshot(name: string): Promise<SnapshotData | null> {
  if (!isValidSnapshotName(name)) return null;
  try {
    const text = await readFile(path.join(DATA_DIR, `${name}_snapshot.json`), 'utf8');
    return JSON.parse(text) as SnapshotData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
