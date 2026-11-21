/**
 * The three Instagram export files Insta Snapshot needs, and how to recognise
 * and sanity-check them in the browser. Nothing here uploads anything; it only
 * reads files the user picked.
 */

export type InstagramFileKind = 'liked_posts' | 'saved_posts' | 'videos_watched';

export interface InstagramFileSpec {
  kind: InstagramFileKind;
  /** The file name in Instagram's data export. */
  fileName: string;
  label: string;
}

export const INSTAGRAM_FILES: InstagramFileSpec[] = [
  { kind: 'liked_posts', fileName: 'liked_posts.json', label: 'Liked posts' },
  { kind: 'saved_posts', fileName: 'saved_posts.json', label: 'Saved posts' },
  { kind: 'videos_watched', fileName: 'videos_watched.json', label: 'Videos watched' },
];

/**
 * Which of the three files this is, from its name. Matches the export name
 * anywhere in the file name, so renamed copies like "justin_liked_posts.json"
 * still count. Returns null for anything else.
 */
export function identifyInstagramFile(name: string): InstagramFileKind | null {
  const lower = name.toLowerCase();
  if (!lower.endsWith('.json')) return null;
  return INSTAGRAM_FILES.find((spec) => lower.includes(spec.kind))?.kind ?? null;
}

/**
 * The list of entries in an export: either the top-level array, or the first
 * array inside a top-level object (some export versions wrap the list).
 */
function findEntries(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const list = Object.values(data).find(Array.isArray);
    return list ?? null;
  }
  return null;
}

const looksLikeEntry = (entry: unknown) =>
  !!entry && typeof entry === 'object' && 'timestamp' in entry;

/**
 * Reads and checks one export file. Resolves with its entry count; rejects
 * with a user-readable message if it isn't JSON or isn't a list of entries.
 */
export async function readInstagramFile(file: File): Promise<{ entries: number }> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  const entries = findEntries(data);
  if (!entries) throw new Error("This doesn't look like an Instagram export.");
  if (entries.length > 0 && !looksLikeEntry(entries[0])) {
    throw new Error("This doesn't look like an Instagram export.");
  }
  return { entries: entries.length };
}
