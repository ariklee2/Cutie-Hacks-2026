'use client';

import { useCallback, useState } from 'react';

import { uploadContent } from '@/content/upload';
import {
  INSTAGRAM_FILES,
  identifyInstagramFile,
  readInstagramFile,
  specFor,
  type InstagramFileKind,
} from '@/lib/instagramFiles';
import { extractInstagramFiles, isZipFile } from '@/lib/instagramZip';

export type SlotState =
  | { status: 'waiting' }
  | { status: 'reading'; fileName: string }
  | { status: 'added'; fileName: string; entries: number; file: File }
  | { status: 'problem'; fileName: string; message: string };

type Slots = Record<InstagramFileKind, SlotState>;

const emptySlots = (): Slots =>
  Object.fromEntries(INSTAGRAM_FILES.map((spec) => [spec.kind, { status: 'waiting' }])) as Slots;

/**
 * Tracks the three Instagram files: which have been added, which failed and
 * why. Takes the files themselves or Instagram's whole .zip download. Adding a file of the same kind again replaces it. The File objects are
 * kept so they can be sent to the backend once it has an upload endpoint.
 */
export function useInstagramFiles() {
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [unrecognised, setUnrecognised] = useState<string[]>([]);
  /** A .zip is being opened (its name), so the screen can say so. */
  const [unzipping, setUnzipping] = useState<string | null>(null);

  const setSlot = (kind: InstagramFileKind, state: SlotState) =>
    setSlots((prev) => ({ ...prev, [kind]: state }));

  /** Check and slot each file (already-extracted ones included). */
  const addJsonFiles = useCallback((files: Iterable<File>, rejected: string[]) => {
    for (const file of files) {
      const kind = identifyInstagramFile(file.name);
      if (!kind) {
        rejected.push(uploadContent.notAFile(file.name));
        continue;
      }
      setSlot(kind, { status: 'reading', fileName: file.name });
      readInstagramFile(kind, file)
        .then(({ entries }) => setSlot(kind, { status: 'added', fileName: file.name, entries, file }))
        .catch((error: Error) =>
          setSlot(kind, { status: 'problem', fileName: file.name, message: error.message }),
        );
    }
  }, []);

  /**
   * Accepts the three .json files and/or Instagram's whole download (.zip):
   * a zip is opened in the browser and only the three files are taken out
   * of it (lib/instagramZip.ts).
   */
  const addFiles = useCallback(
    (files: Iterable<File>) => {
      const all = [...files];
      const zips = all.filter(isZipFile);
      const rejected: string[] = [];
      addJsonFiles(
        all.filter((file) => !isZipFile(file)),
        rejected,
      );
      setUnrecognised(rejected);

      for (const zip of zips) {
        setUnzipping(zip.name);
        extractInstagramFiles(zip)
          .then(({ files: found, missing, htmlFormat }) => {
            const notes: string[] = [];
            addJsonFiles(found, notes);
            if (htmlFormat && found.length === 0) notes.push(uploadContent.zipHtml(zip.name));
            else if (missing.length > 0)
              notes.push(uploadContent.zipMissing(zip.name, missing.map((kind) => specFor(kind).fileName)));
            setUnrecognised((prev) => [...prev, ...notes]);
          })
          .catch(() => setUnrecognised((prev) => [...prev, uploadContent.zipUnreadable(zip.name)]))
          .finally(() => setUnzipping((current) => (current === zip.name ? null : current)));
      }
    },
    [addJsonFiles],
  );

  const addedCount = INSTAGRAM_FILES.filter((spec) => slots[spec.kind].status === 'added').length;
  const allAdded = addedCount === INSTAGRAM_FILES.length;

  return { slots, unrecognised, unzipping, addFiles, addedCount, allAdded };
}
