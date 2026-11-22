import { Container, Title } from '@mantine/core';

import { FilmStrip } from '@/components/cinema/FilmStrip';

import classes from './Hero.module.css';

/**
 * Landing hero. The first screen is plain red with the film centered in it
 * (red above and below), so the sections that follow start just below the
 * fold. The film runs edge to edge sideways; the title sits on it, vertically
 * centered and left-aligned with the page content.
 */
export function Hero({ title, credit, inspiration }: { title: string; credit: string; inspiration: string }) {
  return (
    <section className={classes.stage}>
      <div className={classes.hero}>
        <FilmStrip />
        <Container className={classes.inner}>
          <Title order={1} className={classes.title}>
            {title}
          </Title>
        </Container>
      </div>
      {/* Under the film's bottom-left corner, mirroring Get Snapshot above
          its top-right: who made it | what inspired it, on one line. */}
      <p className={classes.credits}>
        <span className={classes.credit}>{credit}</span>
        {/* Not aria-hidden: it keeps the two phrases from running together for screen readers. */}
        <span className={classes.separator}>|</span>
        <span className={classes.inspiration}>{inspiration}</span>
      </p>
    </section>
  );
}
