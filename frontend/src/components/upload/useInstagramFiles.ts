'use client';

import { useCallback, useState } from 'react';

import { uploadContent } from '@/content/upload';
import {
  INSTAGRAM_FILES,
  identifyInstagramFile,
  readInstagramFile,
  type InstagramFileKind,
} from '@/lib/instagramFiles';

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
 * why. Adding a file of the same kind again replaces it. The File objects are
 * kept so they can be sent to the backend once it has an upload endpoint.
 */
export function useInstagramFiles() {
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [unrecognised, setUnrecognised] = useState<string[]>([]);

  const setSlot = (kind: InstagramFileKind, state: SlotState) =>
    setSlots((prev) => ({ ...prev, [kind]: state }));

  const addFiles = useCallback((files: Iterable<File>) => {
    const rejected: string[] = [];
    for (const file of files) {
      const kind = identifyInstagramFile(file.name);
      if (!kind) {
        rejected.push(uploadContent.notAFile(file.name));
        continue;
      }
      setSlot(kind, { status: 'reading', fileName: file.name });
      readInstagramFile(file)
        .then(({ entries }) => setSlot(kind, { status: 'added', fileName: file.name, entries, file }))
        .catch((error: Error) =>
          setSlot(kind, { status: 'problem', fileName: file.name, message: error.message }),
        );
    }
    setUnrecognised(rejected);
  }, []);

  const addedCount = INSTAGRAM_FILES.filter((spec) => slots[spec.kind].status === 'added').length;
  const allAdded = addedCount === INSTAGRAM_FILES.length;

  return { slots, unrecognised, addFiles, addedCount, allAdded };
}
