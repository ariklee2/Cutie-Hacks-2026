import type { CSSProperties } from 'react';

import { CountUp } from './CountUp';
import classes from './StatList.module.css';

/** Supporting numbers, one per column between hairlines: value on top (counting up), what it means below. */
export function StatList({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className={classes.list}>
      {stats.map((s, i) => (
        <div key={s.label} className={classes.row} style={{ '--i': i } as CSSProperties}>
          <dt className={classes.label}>{s.label}</dt>
          <dd className={classes.value}>
            <CountUp text={s.value} delay={500 + i * 120} duration={900} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
