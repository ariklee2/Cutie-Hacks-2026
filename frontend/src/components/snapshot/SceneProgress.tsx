'use client';

import { Container } from '@mantine/core';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';

import { snapshotContent } from '@/content/snapshot';
import { snapshotSequence } from '@/lib/snapshotSequence';

import classes from './SceneProgress.module.css';

/**
 * One thin segment per snapshot scene across the top: past scenes full,
 * the current one filling in, upcoming ones faint. Lives in the snapshot
 * layout, so it persists between scenes.
 */
export function SceneProgress() {
  const step = usePathname().split('/').pop();
  const current = snapshotSequence.findIndex((s) => s === step);
  if (current < 0) return null;

  return (
    <Container className={classes.bar}>
      <ol
        className={classes.segments}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={snapshotSequence.length}
        aria-valuenow={current + 1}
        aria-valuetext={snapshotContent.sequence.progress(current + 1, snapshotSequence.length)}
        style={{ '--n': snapshotSequence.length } as CSSProperties}
      >
        {snapshotSequence.map((s, i) => (
          <li
            key={s}
            className={classes.segment}
            data-state={i < current ? 'done' : i === current ? 'current' : 'upcoming'}
          >
            {/* Re-mount on each scene so the current segment fills again. */}
            <span key={i === current ? step : s} className={classes.fill} />
          </li>
        ))}
      </ol>
    </Container>
  );
}
