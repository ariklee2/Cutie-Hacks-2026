import { Container } from '@mantine/core';
import type { ReactNode } from 'react';

import { Slate } from '@/components/cinema/Slate';
import { StageLights } from '@/components/cinema/StageLights';

import classes from './LandingBand.module.css';

/**
 * One full-width band of the landing page below the film: its own solid
 * color (`band`, a --snapshot-color-band-* step or ink), film grain, a slate
 * eyebrow and a poster-type heading, then its content.
 */
export function LandingBand({
  id,
  band,
  eyebrow,
  heading,
  layout = 'stack',
  children,
}: {
  id: string;
  /** CSS color for the band, e.g. 'var(--snapshot-color-band-1)'. */
  band: string;
  eyebrow: string;
  heading: string;
  /** 'split': heading left, content right. 'stack': heading above content. */
  layout?: 'split' | 'stack';
  children: ReactNode;
}) {
  return (
    <section className={classes.band} style={{ background: band }} aria-labelledby={id}>
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
