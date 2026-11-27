import { Container } from '@mantine/core';

import { Marquee } from '@/components/cinema/Marquee';
import { StageLights } from '@/components/cinema/StageLights';
import { landingContent } from '@/content/landing';

import classes from './Finale.module.css';
import { TicketCta } from './TicketCta';

/** The last band: a lit marquee screen under spotlights, then the ticket in. */
export function Finale() {
  const copy = landingContent.finale;
  return (
    <section className={classes.finale} aria-label={copy.marquee}>
      <StageLights />
      <Container className={classes.inner}>
        <Marquee>{copy.marquee}</Marquee>
        <p className={classes.text}>{copy.text}</p>
        <TicketCta />
      </Container>
    </section>
  );
}
