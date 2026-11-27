/**
 * Instagram's "Download your information" arrives as one .zip. This finds
 * the three files Insta Snapshot needs inside it — wherever they sit in the
 * folders, e.g. your_instagram_activity/likes/liked_posts.json and
 * ads_information/ads_and_topics/videos_watched.json — and returns them as
 * ordinary Files, so they go through the same checks as files dropped one by
 * one. Runs in the browser: only these three files are ever uploaded, never
 * the rest of the download (messages, photos, …). Only the three entries are
 * decompressed.
 */
import { unzip } from 'fflate';

import { INSTAGRAM_FILES, type InstagramFileKind } from './instagramFiles';

export const isZipFile = (file: File) =>
  file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';

const baseName = (path: string) => path.split('/').pop()?.toLowerCase() ?? '';

export interface ZipExtraction {
  /** The needed files found inside, named like the export (e.g. "liked_posts.json"). */
  files: File[];
  /** Needed files that weren't in the zip. */
  missing: InstagramFileKind[];
  /** The zip has the HTML versions instead (downloaded with Format: HTML). */
  htmlFormat: boolean;
}

export async function extractInstagramFiles(zip: File): Promise<ZipExtraction> {
  const wanted = new Set(INSTAGRAM_FILES.map((spec) => spec.fileName));
  const htmlNames = new Set(INSTAGRAM_FILES.map((spec) => spec.fileName.replace(/\.json$/, '.html')));
  let htmlFormat = false;

  const data = new Uint8Array(await zip.arrayBuffer());
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(
      data,
      {
        filter: (entry) => {
          const name = baseName(entry.name);
          if (htmlNames.has(name)) htmlFormat = true;
          return wanted.has(name);
        },
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
  });

  // If a name appears twice (an unusual export), the first one wins.
  const found = new Map<string, Uint8Array>();
  for (const [path, bytes] of Object.entries(entries)) {
    const name = baseName(path);
    if (!found.has(name)) found.set(name, bytes);
  }

  const files = [...found].map(
    ([name, bytes]) => new File([bytes as BlobPart], name, { type: 'application/json' }),
  );
  const missing = INSTAGRAM_FILES.filter((spec) => !found.has(spec.fileName)).map((spec) => spec.kind);
  return { files, missing, htmlFormat };
}
