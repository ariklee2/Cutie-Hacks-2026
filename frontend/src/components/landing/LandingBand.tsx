import { Container } from '@mantine/core';
import type { ReactNode } from 'react';

import { Slate } from '@/components/cinema/Slate';
import { StageLights } from '@/components/cinema/StageLights';

import classes from './LandingBand.module.css';

/**
 * One full-width band of the landing page below the film. Every band is the
 * same page red with film grain; a soft shadow along its top edge (as if the
 * section above casts it) marks where a new section starts. Then a slate
 * eyebrow, a poster-type heading and its content.
 */
export function LandingBand({
  id,
  eyebrow,
  heading,
  layout = 'stack',
  children,
}: {
  id: string;
  eyebrow: string;
  heading: string;
  /** 'split': heading left, content right. 'stack': heading above content. */
  layout?: 'split' | 'stack';
  children: ReactNode;
}) {
  return (
    <section className={classes.band} aria-labelledby={id}>
      <StageLights beams={false} />
      <Container className={classes.inner} data-layout={layout}>
        <div className={classes.head}>
          <Slate label={eyebrow} />
          <h2 id={id} className={classes.heading}>
            {heading}
          </h2>
        </div>
        <div className={classes.body}>{children}</div>
      </Container>
    </section>
  );
}
