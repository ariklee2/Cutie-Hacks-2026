import type { CSSProperties, ReactNode } from 'react';

import classes from './Ticket.module.css';

/**
 * A cinema ticket: a main part (`children`) and an optional stub (`stub`,
 * e.g. "No. 1") behind a perforated line, with round notches cut where they
 * meet. Without a stub, the notches are cut into the middle of both ends.
 * `tone` picks the paper: "gold" (ink text) or "paper" (ink text). `tilt`
 * is a small rotation in degrees, for a tossed-on-the-table look.
 */
export function Ticket({
  children,
  stub,
  tone = 'paper',
  tilt = 0,
  className,
  style,
}: {
  children: ReactNode;
  stub?: ReactNode;
  tone?: 'paper' | 'gold';
  tilt?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={[classes.ticket, className].filter(Boolean).join(' ')}
      data-tone={tone}
      data-stub={stub ? '' : undefined}
      style={{ '--tilt': `${tilt}deg`, ...style } as CSSProperties}
    >
      <div className={classes.main}>{children}</div>
      {stub && (
        <div className={classes.stub} aria-hidden="true">
          {stub}
        </div>
      )}
    </div>
  );
}
