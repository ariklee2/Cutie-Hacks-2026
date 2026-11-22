import { Container } from '@mantine/core';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { snapshotContent } from '@/content/snapshot';
import { snapshotHref, snapshotSequence, type SnapshotStep } from '@/lib/snapshotSequence';

import { ArrowKeyNav } from './ArrowKeyNav';
import classes from './SnapshotPage.module.css';

const copy = snapshotContent;

/**
 * Layout shared by every snapshot page: title, subtitle, the page's content,
 * then links to the previous and next pages in the sequence.
 */
export function SnapshotPage({
  name,
  step,
  title,
  subtitle,
  children,
}: {
  name: string;
  step: SnapshotStep;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const index = snapshotSequence.indexOf(step);
  const previous = snapshotSequence[index - 1];
  const next = snapshotSequence[index + 1];

  return (
    <Container component="section" className={classes.page}>
      <h1 className={classes.title}>{title}</h1>
      <p className={classes.subtitle}>{subtitle}</p>

      {children}

      <ArrowKeyNav
        previous={previous && snapshotHref(name, previous)}
        next={next && snapshotHref(name, next)}
      />

      <nav className={classes.sequence} aria-label={copy.sequence.label}>
        {previous && (
          <Link href={snapshotHref(name, previous)} className={classes.sequenceLink} data-direction="previous">
            <span className={classes.sequenceHint}>{copy.sequence.previous}</span>
            <span className={classes.sequenceName}>{copy.steps[previous]}</span>
          </Link>
        )}
        <span className={classes.keysHint} aria-hidden="true">
          {copy.sequence.keysHint}
        </span>
        <Link
          href={snapshotHref(name, next ?? snapshotSequence[0])}
          className={classes.sequenceLink}
          data-direction="next"
        >
          <span className={classes.sequenceHint}>{next ? copy.sequence.next : copy.sequence.restart}</span>
          <span className={classes.sequenceName}>{copy.steps[next ?? snapshotSequence[0]]}</span>
        </Link>
      </nav>
    </Container>
  );
}

/** A line of copy in place of a chart (empty or failed section). */
export function SnapshotMessage({ children }: { children: ReactNode }) {
  return <p className={classes.message}>{children}</p>;
}
