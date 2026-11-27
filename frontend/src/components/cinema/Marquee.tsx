import type { ReactNode } from 'react';

import classes from './Marquee.module.css';

/**
 * A theatre marquee screen: a 16:9 ink board ringed with gold bulbs that
 * chase around it (two sets lighting in turn), with the words centered on
 * it in poster type.
 * The bulbs stay lit and still under prefers-reduced-motion.
 */
export function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className={classes.marquee}>
      <span className={classes.bulbs} data-set="a" aria-hidden="true" />
      <span className={classes.bulbs} data-set="b" aria-hidden="true" />
      <p className={classes.words}>{children}</p>
    </div>
  );
}
