import Link from 'next/link';

import { Ticket } from '@/components/cinema/Ticket';
import { landingCta } from '@/content/landing';

import classes from './TicketCta.module.css';

/** The way in: a gold ticket ("Get your snapshot →") linking to the upload page. */
export function TicketCta() {
  return (
    <Link href={landingCta.href} className={classes.link}>
      <Ticket tone="gold" tilt={-2}>
        <span className={classes.label}>
          {landingCta.label} <span aria-hidden="true">→</span>
        </span>
      </Ticket>
    </Link>
  );
}
