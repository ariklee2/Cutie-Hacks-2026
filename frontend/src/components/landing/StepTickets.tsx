import { Ticket } from '@/components/cinema/Ticket';
import type { LandingItem } from '@/content/landing';

import classes from './StepTickets.module.css';

const TILTS = [-1.5, 1, -0.5];

/** How to get in: one ticket per step, numbered on the stub ("No. 1"). */
export function StepTickets({ steps }: { steps: LandingItem[] }) {
  return (
    <ol className={classes.list}>
      {steps.map((step, i) => (
        <li key={step.name}>
          <Ticket tone={i === steps.length - 1 ? 'gold' : 'paper'} tilt={TILTS[i % TILTS.length]} stub={`No. ${i + 1}`}>
            <h3 className={classes.name}>{step.name}</h3>
            <p className={classes.detail}>{step.detail}</p>
          </Ticket>
        </li>
      ))}
    </ol>
  );
}
