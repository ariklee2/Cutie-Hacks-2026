/**
 * Client call for POST /api/snapshot (src/app/api/snapshot/route.ts): saves
 * the three files into data/, runs filter/transform.py, then runs every
 * feature into data/<name>_snapshot.json (see src/lib/snapshotData.ts). This route
 * lives in the Next.js app itself (same origin), so it doesn't use
 * NEXT_PUBLIC_API_URL.
 */
import type { InstagramFileKind } from '@/lib/instagramFiles';

import { ApiError } from './client';

export interface SnapshotResult {
  name: string;
  /** Saved inputs, e.g. "data/justin_liked_posts.json". */
  saved: string[];
  /** Outputs, e.g. "data/justin_reels.csv", "data/justin_snapshot.json". */
  outputs: string[];
  /** Reels in the transformed table, from transform.py's output. */
  reels: number | null;
  /** Snapshot sections whose feature raised an error (empty when all ran). */
  failedSections: string[];
  log: string;
}

export async function createSnapshot(
  name: string,
  files: Record<InstagramFileKind, File>,
): Promise<SnapshotResult> {
  const form = new FormData();
  form.set('name', name);
  for (const [kind, file] of Object.entries(files)) form.set(kind, file);

  const response = await fetch('/api/snapshot', { method: 'POST', body: form });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body ? String(body.error) : 'Something went wrong.';
    throw new ApiError(message, response.status, body);
  }
  return body as SnapshotResult;
}

/**
 * GET /api/snapshot?name=… — whether a saved snapshot exists for `name`
 * (already uploaded and processed), so it can be opened without re-uploading.
 */
export async function snapshotExists(name: string): Promise<boolean> {
  const response = await fetch(`/api/snapshot?name=${encodeURIComponent(name)}`);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError('Could not check for a saved snapshot.', response.status, body);
  return Boolean(body && typeof body === 'object' && 'exists' in body && body.exists);
}
