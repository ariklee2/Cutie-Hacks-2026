import { Container } from '@mantine/core';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Slate } from '@/components/cinema/Slate';
import { StageLights } from '@/components/cinema/StageLights';
import { snapshotContent } from '@/content/snapshot';
import { snapshotHref, snapshotSequence, type SnapshotStep } from '@/lib/snapshotSequence';

import { ArrowKeyNav } from './ArrowKeyNav';
import { SceneLink } from './SceneLink';
import { SceneTapArea } from './SceneTapArea';
import classes from './SnapshotPage.module.css';

const copy = snapshotContent;

/**
 * One snapshot scene: at least a full screen, in its own background color
 * (`data-scene`, see globals.css), lit like a movie screen (StageLights:
 * spotlights, vignette, grain), with a giant faint `backdrop` word behind
 * it. A clapper slate ("Scene 03 / 09") sits above the poster-type title;
 * slate, title, subtitle, content and the Back / Next links come in one
 * after another. Tap the sides, use ← →, or the links to move (with the film wipe).
 * The last scene offers Start over (first scene) and Back to home (landing).
 */
export function SnapshotPage({
  name,
  step,
  title,
  subtitle,
  backdrop,
  children,
}: {
  name: string;
  step: SnapshotStep;
  title: string;
  subtitle: string;
  /** Giant faint word behind the scene, e.g. "#f1". Decorative. */
  backdrop?: string;
  children: ReactNode;
}) {
  const index = snapshotSequence.indexOf(step);
  const previous = snapshotSequence[index - 1];
  const next = snapshotSequence[index + 1];
  const previousHref = previous && snapshotHref(name, previous);
  const nextHref = next && snapshotHref(name, next);

  return (
    <SceneTapArea className={classes.scene} data-scene={step} previous={previousHref} next={nextHref}>
      {/* No projector flicker here: these scenes are for reading numbers. */}
      <StageLights flicker={false} />
      {backdrop && (
        <span className={classes.backdrop} aria-hidden="true">
          {backdrop}
        </span>
      )}

      <Container component="section" className={classes.page}>
        <div className={classes.body}>
          <div className={classes.slate}>
            <Slate scene={index + 1} of={snapshotSequence.length} label={copy.steps[step]} />
          </div>
          <h1 className={classes.title}>
            <span className={classes.titleLine}>{title}</span>
          </h1>
          <p className={classes.subtitle}>{subtitle}</p>
          <div className={classes.content}>{children}</div>
        </div>

        <ArrowKeyNav previous={previousHref} next={nextHref} />

        <nav className={classes.sequence} aria-label={copy.sequence.label}>
          {previous && (
            <SceneLink href={snapshotHref(name, previous)} className={classes.sequenceLink} data-direction="previous">
              <span className={classes.sequenceHint}>{copy.sequence.previous}</span>
              <span className={classes.sequenceName}>{copy.steps[previous]}</span>
            </SceneLink>
          )}
          {next ? (
            <>
              <span className={classes.keysHint} aria-hidden="true">
                {copy.sequence.keysHint}
              </span>
              <SceneLink href={snapshotHref(name, next)} className={classes.sequenceLink} data-direction="next">
                <span className={classes.sequenceHint}>{copy.sequence.next}</span>
                <span className={classes.sequenceName}>{copy.steps[next]}</span>
              </SceneLink>
            </>
          ) : (
            // Last scene: replay from the first scene (middle), or leave for the landing page (right).
            <>
              <SceneLink
                href={snapshotHref(name, snapshotSequence[0])}
                className={classes.sequenceLink}
                data-direction="restart"
              >
                <span className={classes.sequenceHint}>{copy.sequence.restart}</span>
                <span className={classes.sequenceName}>{copy.steps[snapshotSequence[0]]}</span>
              </SceneLink>
              <Link href={copy.sequence.home.href} className={classes.sequenceLink} data-direction="next">
                <span className={classes.sequenceHint}>{copy.sequence.home.hint}</span>
                <span className={classes.sequenceName}>{copy.sequence.home.name}</span>
              </Link>
            </>
          )}
        </nav>
      </Container>
    </SceneTapArea>
  );
}

/** A line of copy in place of a chart (empty or failed section). */
export function SnapshotMessage({ children }: { children: ReactNode }) {
  return <p className={classes.message}>{children}</p>;
}
