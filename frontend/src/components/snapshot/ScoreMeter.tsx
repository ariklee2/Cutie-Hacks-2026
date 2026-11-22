import type { CSSProperties } from 'react';

import classes from './ScoreMeter.module.css';

/**
 * A 0–100 score as one white bar on a hairline track, with a tick at the
 * threshold and a label at each end. The bar grows in on load (off under
 * prefers-reduced-motion).
 */
export function ScoreMeter({
  score,
  threshold,
  label,
  valueText,
  thresholdText,
  ends,
}: {
  score: number;
  threshold: number;
  label: string;
  valueText: string;
  thresholdText: string;
  ends: readonly [string, string];
}) {
  const clamped = Math.min(Math.max(score, 0), 100);

  return (
    <div className={classes.meter} style={{ '--score': clamped / 100, '--threshold': threshold / 100 } as CSSProperties}>
      <div
        className={classes.track}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
      >
        <span className={classes.bar} />
        <span className={classes.tick} aria-hidden="true" />
      </div>
      <div className={classes.scale} aria-hidden="true">
        <span>{ends[0]}</span>
        <span className={classes.thresholdText}>{thresholdText}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}
