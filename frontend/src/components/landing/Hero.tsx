import { Container, Title } from '@mantine/core';

import { FilmStrip } from '@/components/cinema/FilmStrip';

import classes from './Hero.module.css';

/**
 * Landing hero: film runs behind the whole section, edge to edge. The title
 * sits on it, vertically centered and left-aligned with the page content.
 */
export function Hero({ title }: { title: string }) {
  return (
    <section className={classes.hero}>
      <FilmStrip />
      <Container className={classes.inner}>
        <Title order={1} className={classes.title}>
          {title}
        </Title>
      </Container>
    </section>
  );
}
