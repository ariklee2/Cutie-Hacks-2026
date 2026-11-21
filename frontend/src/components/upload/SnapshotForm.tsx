'use client';

import { useId, type FormEvent, type ReactNode } from 'react';

import { uploadContent } from '@/content/upload';
import { isValidSnapshotName, normaliseSnapshotName } from '@/lib/snapshotName';

import classes from './SnapshotForm.module.css';

interface SnapshotFormProps {
  name: string;
  onNameChange: (name: string) => void;
  /** All three files are in. */
  ready: boolean;
  submitting: boolean;
  onSubmit: () => void;
  /** Shown to the right of the name field (the three file names). */
  children?: ReactNode;
}

const { form } = uploadContent;

/**
 * The toolbar under the screen, flush with its edges: `children` (the file
 * names) at the bottom-left corner; the name field then "Create Snapshot" at
 * the bottom-right. The button is enabled once all three files are in and the
 * name is valid.
 */
export function SnapshotForm({ name, onNameChange, ready, submitting, onSubmit, children }: SnapshotFormProps) {
  const id = useId();
  const valid = isValidSnapshotName(normaliseSnapshotName(name));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready && valid && !submitting) onSubmit();
  };

  return (
    <form className={classes.toolbar} onSubmit={submit}>
      <div className={classes.left}>{children}</div>
      <div className={classes.right}>
        <label htmlFor={`${id}-name`} className={classes.visuallyHidden}>
          {form.nameLabel}
        </label>
        <input
          id={`${id}-name`}
          className={classes.input}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={form.namePlaceholder}
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          aria-invalid={name !== '' && !valid}
        />
        <button type="submit" className={classes.submit} disabled={!ready || !valid || submitting}>
          {submitting ? form.submitting : form.submit}
        </button>
      </div>
    </form>
  );
}
