import type { ReactNode } from 'react';

import classes from './HeroStat.module.css';

/** One headline figure for a page ("4h 57m", "Variety"), with a line under it. */
export function HeroStat({ value, children }: { value: string; children?: ReactNode }) {
  return (
    <div className={classes.hero}>
      <p className={classes.value}>{value}</p>
      {children && <div className={classes.caption}>{children}</div>}
    </div>
  );
}
