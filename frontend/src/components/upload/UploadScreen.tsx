'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';

import { uploadContent } from '@/content/upload';
import { createSnapshot, type SnapshotResult } from '@/lib/api/snapshot';
import { rememberSnapshot } from '@/lib/savedSnapshot';
import { INSTAGRAM_FILES, type InstagramFileKind } from '@/lib/instagramFiles';
import { normaliseSnapshotName } from '@/lib/snapshotName';

import { SnapshotForm } from './SnapshotForm';
import { useInstagramFiles } from './useInstagramFiles';
import classes from './UploadScreen.module.css';

const { screen } = uploadContent;

type SubmitState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'done'; result: SnapshotResult }
  | { status: 'error'; message: string };

/**
 * The movie screen is the drop zone: drop the three files on it, or click /
 * press Enter to pick them. Under the screen, the three file names turn green
 * as each is added; any problems are listed below. Once all three are in and
 * named, "Create Snapshot" saves them to data/, runs the transform and every
 * feature (via POST /api/snapshot), then goes to the first page of the
 * snapshot sequence (/snapshot/<name>/top-creators).
 */
export function UploadScreen() {
  const { slots, unrecognised, unzipping, addFiles: addToSlots, allAdded } = useInstagramFiles();
  const [name, setName] = useState('');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const router = useRouter();

  // New files make any earlier result stale.
  const addFiles = (files: Iterable<File>) => {
    setSubmit({ status: 'idle' });
    addToSlots(files);
  };

  const createSnapshotFromFiles = async () => {
    const files = {} as Record<InstagramFileKind, File>;
    for (const spec of INSTAGRAM_FILES) {
      const slot = slots[spec.kind];
      if (slot.status !== 'added') return;
      files[spec.kind] = slot.file;
    }
    setSubmit({ status: 'saving' });
    try {
      const result = await createSnapshot(normaliseSnapshotName(name), files);
      setSubmit({ status: 'done', result });
      // First page of the snapshot sequence.
      rememberSnapshot(result.name); // so the landing page can reopen it without re-uploading
      router.push(`/snapshot/${encodeURIComponent(result.name)}/top-creators`);
    } catch (error) {
      setSubmit({ status: 'error', message: (error as Error).message });
    }
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0); // dragenter/leave fire for children too

  // A file dropped beside the screen would otherwise make the browser leave
  // the page to open it.
  useEffect(() => {
    const block = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  const problems = [
    ...INSTAGRAM_FILES.flatMap((spec) => {
      const slot = slots[spec.kind];
      return slot.status === 'problem' ? [uploadContent.problem(slot.fileName, slot.message)] : [];
    }),
    ...unrecognised,
    ...(submit.status === 'error' ? [submit.message] : []),
    ...(submit.status === 'done' && submit.result.failedSections.length > 0
      ? [uploadContent.screen.partial(submit.result.failedSections)]
      : []),
  ];

  // After any problem with a file, say exactly which files are still needed.
  const stillNeeded = INSTAGRAM_FILES.filter((spec) => slots[spec.kind].status !== 'added').map(
    (spec) => spec.fileName,
  );
  const fileProblem = unrecognised.length > 0 || INSTAGRAM_FILES.some((spec) => slots[spec.kind].status === 'problem');
  if (fileProblem && stillNeeded.length > 0) problems.push(uploadContent.stillNeeded(stillNeeded));

  const openPicker = () => inputRef.current?.click();

  const onDragEnter = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div className={classes.wrap}>
      <div
        role="button"
        tabIndex={0}
        aria-describedby="upload-instructions"
        className={classes.screen}
        data-dragging={dragging || undefined}
        data-complete={allAdded || undefined}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = ''; // allow choosing the same file again
          }}
        />
        <div className={classes.picture} id="upload-instructions">
          {dragging ? (
            <p className={classes.title}>{screen.dragging}</p>
          ) : unzipping ? (
            <>
              <span className={classes.spinner} aria-hidden="true" />
              <p className={classes.title}>{uploadContent.unzipping}</p>
            </>
          ) : submit.status === 'saving' ? (
            <>
              <span className={classes.spinner} aria-hidden="true" />
              <p className={classes.title}>{screen.saving}</p>
              <p className={classes.note}>{screen.savingNote}</p>
            </>
          ) : submit.status === 'done' ? (
            <>
              <p className={classes.title}>{screen.done}</p>
              <p className={classes.note}>{screen.doneNote(submit.result.reels, submit.result.name)}</p>
            </>
          ) : allAdded ? (
            <>
              <p className={classes.title}>{screen.complete}</p>
              <p className={classes.note}>{screen.completeNote}</p>
            </>
          ) : (
            <>
              <p className={classes.prompt}>{screen.prompt}</p>
              <p className={classes.promptFiles}>{screen.promptFiles}</p>
            </>
          )}
        </div>
      </div>

      {/* Toolbar flush under the screen: name + the three files at the
          bottom-left corner, "Create Snapshot" at the bottom-right. */}
      <SnapshotForm
        name={name}
        onNameChange={setName}
        ready={allAdded}
        submitting={submit.status === 'saving'}
        onSubmit={createSnapshotFromFiles}
      >
        {/* Each file name turns green once that exact file is in. */}
        <ul className={classes.fileList} aria-live="polite">
          {INSTAGRAM_FILES.map((spec) => {
            const added = slots[spec.kind].status === 'added';
            return (
              <li key={spec.kind} data-added={added || undefined}>
                {spec.fileName}
                {added && <span className={classes.visuallyHidden}> {uploadContent.fileAdded}</span>}
              </li>
            );
          })}
        </ul>
      </SnapshotForm>

      <div className={classes.status} role="status" aria-live="polite">
        {problems.map((message) => (
          <p key={message} className={classes.message}>
            {message}
          </p>
        ))}
      </div>
    </div>
  );
}
