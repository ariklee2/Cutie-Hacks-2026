import type { CSSProperties } from 'react';

import classes from './CreditsRoll.module.css';

/**
 * End credits: role / name pairs rolling up from the bottom of a window,
 * once, settling in the middle. Static under prefers-reduced-motion.
 */
export function CreditsRoll({
  credits,
  closing,
}: {
  credits: { role: string; name: string }[];
  /** Last line, larger ("The End"). */
  closing: string;
}) {
  return (
    <div className={classes.window}>
      <dl className={classes.roll} style={{ '--n': credits.length } as CSSProperties}>
        {credits.map((c) => (
          <div key={c.role} className={classes.credit}>
            <dt className={classes.role}>{c.role}</dt>
            <dd className={classes.name}>{c.name}</dd>
          </div>
        ))}
        <p className={classes.closing}>{closing}</p>
      </dl>
    </div>
  );
}
