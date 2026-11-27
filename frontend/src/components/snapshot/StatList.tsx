import type { CSSProperties } from 'react';

import { Ticket } from '@/components/cinema/Ticket';

import { CountUp } from './CountUp';
import classes from './StatList.module.css';

const TILTS = [-2, 1.5, -1, 2];

/**
 * Supporting numbers as a spread of cinema tickets: value on top in poster
 * type (counting up), what it means below. The
 * first ticket is gold, the rest paper; each is tossed at a slight angle.
 */
export function StatList({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className={classes.list}>
      {stats.map((s, i) => (
        <div key={s.label} className={classes.item} style={{ '--i': i } as CSSProperties}>
          <Ticket tone={i === 0 ? 'gold' : 'paper'} tilt={TILTS[i % TILTS.length]}>
            <dt className={classes.label}>{s.label}</dt>
            <dd className={classes.value}>
              <CountUp text={s.value} delay={500 + i * 120} duration={900} />
            </dd>
          </Ticket>
        </div>
      ))}
    </dl>
  );
}
