'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';

import { uploadContent } from '@/content/upload';
import { snapshotExists } from '@/lib/api/snapshot';
import { rememberSnapshot } from '@/lib/savedSnapshot';
import { isValidSnapshotName, normaliseSnapshotName } from '@/lib/snapshotName';

import classes from './OpenSavedSnapshot.module.css';

const copy = uploadContent.openSaved;

/**
 * "Already made one?": a name field and Open Snapshot. If data/<name>_snapshot.json
 * exists on the server, goes straight to its first scene (and remembers the
 * name for the landing page); otherwise says so. No files are uploaded.
 */
export function OpenSavedSnapshot() {
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function open(event: FormEvent) {
    event.preventDefault();
    const normalised = normaliseSnapshotName(name);
    if (!isValidSnapshotName(normalised)) {
      setMessage(copy.invalid);
      return;
    }
    setChecking(true);
    setMessage(null);
    try {
      if (await snapshotExists(normalised)) {
        rememberSnapshot(normalised);
        router.push(`/snapshot/${encodeURIComponent(normalised)}/top-creators`);
        return; // keep "Opening…" while the scene loads
      }
      setMessage(copy.notFound(normalised));
    } catch {
      setMessage(copy.failed);
    }
    setChecking(false);
  }

  return (
    <form className={classes.open} onSubmit={open}>
      <p className={classes.prompt} id={`${id}-prompt`}>
        {copy.prompt}
      </p>
      <div className={classes.row}>
        <label htmlFor={`${id}-name`} className={classes.visuallyHidden}>
          {copy.nameLabel}
        </label>
        <input
          id={`${id}-name`}
          className={classes.input}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setMessage(null);
          }}
          placeholder={copy.namePlaceholder}
          aria-describedby={`${id}-prompt`}
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
        />
        <button type="submit" className={classes.submit} disabled={checking || name.trim() === ''}>
          {checking ? copy.checking : copy.submit}
        </button>
      </div>
      <p role="status" className={classes.message}>
        {message}
      </p>
    </form>
  );
}
