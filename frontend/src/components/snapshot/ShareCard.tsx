'use client';

import { toPng } from 'html-to-image';
import { useEffect, useRef, useState } from 'react';

import { snapshotContent } from '@/content/snapshot';

import classes from './ShareCard.module.css';

const copy = snapshotContent.share;

/**
 * The summary card, story-shaped (9:16) so it can be posted as is: a white
 * "screen" in a black frame with the week's highlights in red. Save image
 * downloads the card as a PNG; Share (the device's share sheet, where
 * available) and Copy text send the same lines as plain text.
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
  const card = useRef<HTMLElement>(null);
  const [canShare, setCanShare] = useState(false);
  const [status, setStatus] = useState<'idle' | 'copied' | 'saving' | 'copyFailed' | 'saveFailed'>('idle');
  const text = copy.text(copy.cardTitle, range, rows);

  useEffect(() => setCanShare(typeof navigator !== 'undefined' && 'share' in navigator), []);

  async function saveImage() {
    if (!card.current) return;
    setStatus('saving');
    try {
      const url = await toPng(card.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}-insta-snapshot.png`;
      link.click();
      setStatus('idle');
    } catch {
      setStatus('saveFailed');
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('copyFailed');
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
      <article ref={card} className={classes.frame} aria-label={copy.cardTitle}>
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

      <div className={classes.side}>
        <div className={classes.actions}>
          <button
            type="button"
            className={classes.button}
            data-primary
            onClick={saveImage}
            disabled={status === 'saving'}
          >
            {status === 'saving' ? copy.saving : copy.saveButton}
          </button>
          {canShare && (
            <button type="button" className={classes.button} onClick={share}>
              {copy.shareButton}
            </button>
          )}
          <button type="button" className={classes.button} onClick={copyText}>
            {status === 'copied' ? copy.copied : copy.copyButton}
          </button>
        </div>
        <p role="status" className={classes.status}>
          {status === 'copyFailed' ? copy.copyFailed : status === 'saveFailed' ? copy.saveFailed : ''}
        </p>
      </div>
    </div>
  );
}
