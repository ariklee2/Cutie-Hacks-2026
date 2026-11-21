/**
 * Snapshot names become file names in the repo's data/ folder
 * (data/<name>_liked_posts.json, data/<name>_reels.csv, ...), like the
 * existing "justin" and "arik". Shared by the upload page and the server
 * route so both apply the same rule.
 */
export const SNAPSHOT_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/** Lowercases and trims what the user typed; spaces become underscores. */
export function normaliseSnapshotName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

export function isValidSnapshotName(name: string): boolean {
  return SNAPSHOT_NAME_PATTERN.test(name);
}
