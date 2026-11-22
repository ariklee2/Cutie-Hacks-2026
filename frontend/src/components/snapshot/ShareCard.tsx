'use client';

import { useEffect, useState } from 'react';

import { snapshotContent } from '@/content/snapshot';

import classes from './ShareCard.module.css';

const copy = snapshotContent.share;

/**
 * The summary card: a white "screen" in a black frame with the week's
 * highlights in red, plus Share (the device's share sheet, where available)
 * and Copy text buttons that send the same lines as plain text.
 */
export function ShareCard({
  name,
  range,
  rows,
}: {
  name: string;
  range: string | null;
  rows: [label: string, value: string][];
}) {
  const [canShare, setCanShare] = useState(false);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const text = copy.text(copy.cardTitle, range, rows);

  useEffect(() => setCanShare(typeof navigator !== 'undefined' && 'share' in navigator), []);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  async function share() {
    try {
      await navigator.share({ title: copy.cardTitle, text });
    } catch {
      // Cancelled by the user, or not allowed: nothing to report.
    }
  }

  return (
    <div className={classes.wrap}>
      <article className={classes.frame} aria-label={copy.cardTitle}>
        <div className={classes.card}>
          <header className={classes.header}>
            <p className={classes.title}>{copy.cardTitle}</p>
            <p className={classes.meta}>
              @{name}
              {range && ` · ${range}`}
            </p>
          </header>
          <dl className={classes.rows}>
            {rows.map(([label, value]) => (
              <div key={label} className={classes.row}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      <div className={classes.actions}>
        {canShare && (
          <button type="button" className={classes.button} onClick={share}>
            {copy.shareButton}
          </button>
        )}
        <button type="button" className={classes.button} onClick={copyText}>
          {status === 'copied' ? copy.copied : copy.copyButton}
        </button>
        <span role="status" className={classes.status}>
          {status === 'failed' ? copy.copyFailed : ''}
        </span>
      </div>
    </div>
  );
}
