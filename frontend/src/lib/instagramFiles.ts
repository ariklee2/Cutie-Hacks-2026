/**
 * The three Instagram export files Insta Snapshot needs, how to recognise
 * them, and how to check a file really is one. Pure functions: used by the
 * upload page (in the browser) and by POST /api/snapshot (on the server), so
 * both apply exactly the same rules.
 *
 * The format (from Instagram's "Your activity" JSON export, the same one
 * filter/transform.py reads) — a top-level JSON list of entries:
 *
 *   [{ "timestamp": 1795156591,                 // seconds, a number
 *      "media": [],
 *      "label_values": [ { "label": "URL", "value": "https://…" },
 *                        { "label": "Caption", … },
 *                        { "title": "Hashtags", "dict": […] },
 *                        { "title": "Owner", "dict": […] }, … ] }, …]
 *
 * videos_watched.json entries also carry ad fields ("Ad library public URL",
 * "Brand partner's profile"); liked_posts.json and saved_posts.json never do.
 * Liked and saved files are otherwise identical, so their names tell them apart.
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

export const specFor = (kind: InstagramFileKind) =>
  INSTAGRAM_FILES.find((spec) => spec.kind === kind) as InstagramFileSpec;

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

type Entry = { timestamp?: unknown; label_values?: unknown };
type Label = { label?: unknown };

const labelsOf = (entry: Entry): unknown[] => (Array.isArray(entry.label_values) ? entry.label_values : []);
const hasLabel = (entry: Entry, name: string) =>
  labelsOf(entry).some((item) => !!item && typeof item === 'object' && (item as Label).label === name);

/** The ad field only videos_watched.json has. */
const AD_LABEL = 'Ad library public URL';

/**
 * Checks that `text` is the `kind` export. Returns its entry count, or throws
 * an Error whose message says, in plain words, what's wrong.
 */
export function checkInstagramExport(kind: InstagramFileKind, text: string): { entries: number } {
  const expected = specFor(kind).label.toLowerCase();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("it isn't a valid JSON file.");
  }

  if (!Array.isArray(data)) {
    throw new Error(
      `it isn't Instagram's ${expected} export (that file is a list of entries). ` +
        'Use the JSON file from Your activity in your Instagram data download.',
    );
  }

  // Every entry must look like the template: a numeric timestamp and a
  // label_values list with the post's URL.
  const bad = data.findIndex(
    (entry) =>
      !entry ||
      typeof entry !== 'object' ||
      typeof (entry as Entry).timestamp !== 'number' ||
      !Array.isArray((entry as Entry).label_values) ||
      !hasLabel(entry as Entry, 'URL'),
  );
  if (bad !== -1) {
    throw new Error(
      `it isn't Instagram's ${expected} export: entry ${bad + 1} is missing its timestamp or post link.`,
    );
  }

  // An empty list is a real (if quiet) week; nothing more to check.
  if (data.length === 0) return { entries: 0 };

  const withAds = data.filter((entry) => hasLabel(entry as Entry, AD_LABEL)).length;
  const mostlyAds = withAds / data.length > 0.5;
  if (kind === 'videos_watched' && !mostlyAds) {
    throw new Error("it contains posts you liked or saved, not videos you watched. Check you picked the right file.");
  }
  if (kind !== 'videos_watched' && mostlyAds) {
    throw new Error(
      `it contains videos or posts you viewed, not ${expected}. Check you picked the right file.`,
    );
  }

  return { entries: data.length };
}

/** Reads a picked file and checks it is the `kind` export (see checkInstagramExport). */
export async function readInstagramFile(kind: InstagramFileKind, file: File): Promise<{ entries: number }> {
  return checkInstagramExport(kind, await file.text());
}
