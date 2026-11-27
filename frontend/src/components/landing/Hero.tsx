import { Container, Title } from '@mantine/core';

import { FilmStrip } from '@/components/cinema/FilmStrip';
import { StageLights } from '@/components/cinema/StageLights';

import classes from './Hero.module.css';
import { TicketCta } from './TicketCta';

/**
 * Landing hero. The first screen is red with the film running edge to edge
 * just under the header, the title on it in poster type. Under the film: the
 * credits as a poster's billing block on the left, the gold ticket in on the right; the stage is lit by
 * swaying spotlights with film grain over it. The sections that follow start
 * just below the fold.
 */
export function Hero({ title, credits }: { title: string; credits: { role: string; name: string }[] }) {
  return (
    <section className={classes.stage}>
      <StageLights />
      <div className={classes.hero}>
        <FilmStrip />
        {/* Fluid: the title starts at the same 24px gutter as the Instagram glyph and the credits. */}
        <Container fluid className={classes.inner}>
          <Title order={1} className={classes.title}>
            {title}
          </Title>
        </Container>
      </div>
      <div className={classes.under}>
        {/* Under the film's bottom-left corner, a poster's billing block:
            small role above each name, a thin rule between credits. */}
        <dl className={classes.credits}>
          {credits.map((c) => (
            <div key={c.role} className={classes.credit}>
              <dt className={classes.role}>{c.role}</dt>
              <dd className={classes.name}>{c.name}</dd>
            </div>
          ))}
        </dl>
        <div className={classes.cta}>
          <TicketCta />
        </div>
      </div>
    </section>
  );
}
