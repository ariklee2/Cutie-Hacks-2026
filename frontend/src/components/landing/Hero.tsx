import { Container, Title } from '@mantine/core';

import { FilmStrip } from '@/components/cinema/FilmStrip';

import classes from './Hero.module.css';

/**
 * Landing hero. The first screen is plain red with the film centered in it
 * (red above and below), so the sections that follow start just below the
 * fold. The film runs edge to edge sideways; the title sits on it, vertically
 * centered and left-aligned with the page content.
 */
export function Hero({ title, credit }: { title: string; credit: string }) {
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
      {/* Just under the film's bottom-left corner, mirroring Get Snapshot
          above its top-right. */}
      <p className={classes.credit}>{credit}</p>
    </section>
  );
}
