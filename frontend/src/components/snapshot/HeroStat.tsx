import type { ReactNode } from 'react';

import { CountUp } from './CountUp';
import classes from './HeroStat.module.css';

/** One headline figure for a scene ("4h 57m", "Variety"); its numbers count up. */
export function HeroStat({ value, children }: { value: string; children?: ReactNode }) {
  return (
    <div className={classes.hero}>
      <p className={classes.value} data-long={value.length > 10 || undefined}>
        <CountUp text={value} />
      </p>
      {children && <div className={classes.caption}>{children}</div>}
    </div>
  );
}
