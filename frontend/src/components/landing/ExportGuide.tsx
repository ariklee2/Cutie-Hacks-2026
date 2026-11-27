import type { LandingItem } from '@/content/landing';

import classes from './ExportGuide.module.css';
import { TicketCta } from './TicketCta';

/**
 * How to export your data from Meta: an intro line, the steps as a numbered
 * list (big gold numbers in poster type), then a link out to Accounts Center
 * and the gold ticket to the upload page.
 */
export function ExportGuide({
  intro,
  steps,
  link,
}: {
  intro: string;
  steps: LandingItem[];
  link: { label: string; href: string; newTab: string };
}) {
  return (
    <div className={classes.guide}>
      <p className={classes.intro}>{intro}</p>
      <ol className={classes.steps}>
        {steps.map((step, i) => (
          <li key={step.name} className={classes.step}>
            <span className={classes.number} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 className={classes.name}>{step.name}</h3>
              <p className={classes.detail}>{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className={classes.actions}>
        <a href={link.href} target="_blank" rel="noopener noreferrer" className={classes.link}>
          {link.label} <span aria-hidden="true">↗</span>
          <span className={classes.visuallyHidden}> ({link.newTab})</span>
        </a>
        <TicketCta />
      </div>
    </div>
  );
}
