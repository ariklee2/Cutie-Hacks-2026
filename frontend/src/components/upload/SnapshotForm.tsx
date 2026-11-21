'use client';

import { useId, type FormEvent } from 'react';

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
}

const { form } = uploadContent;

/**
 * Name + "Create Snapshot" under the screen. The button is enabled once all
 * three files are in and the name is valid.
 */
export function SnapshotForm({ name, onNameChange, ready, submitting, onSubmit }: SnapshotFormProps) {
  const id = useId();
  const valid = isValidSnapshotName(normaliseSnapshotName(name));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready && valid && !submitting) onSubmit();
  };

  return (
    <form className={classes.form} onSubmit={submit}>
      <label htmlFor={`${id}-name`} className={classes.label}>
        {form.nameLabel}
      </label>
      <div className={classes.row}>
        <input
          id={`${id}-name`}
          className={classes.input}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={form.namePlaceholder}
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          aria-describedby={`${id}-hint`}
          aria-invalid={name !== '' && !valid}
        />
        <button type="submit" className={classes.submit} disabled={!ready || !valid || submitting}>
          {submitting ? form.submitting : form.submit}
        </button>
      </div>
      <p id={`${id}-hint`} className={classes.hint}>
        {form.nameHint}
      </p>
    </form>
  );
}
