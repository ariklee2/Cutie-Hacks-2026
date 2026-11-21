'use client';

import { useEffect, useState, type AnimationEvent } from 'react';

import { Clapperboard } from './Clapperboard';
import { INTRO_SEEN_ATTR, markIntroSeen } from './introSession';
import classes from './IntroClapper.module.css';

/**
 * First-visit intro: a clapperboard snaps shut, then the overlay fades away to
 * reveal the page. Plays once per browser session, can be skipped with a
 * click, and never shows under prefers-reduced-motion (handled in CSS, so the
 * server-rendered overlay is hidden before first paint).
 */
export function IntroClapper() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const seen = document.documentElement.hasAttribute(INTRO_SEEN_ATTR);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || reduced) setDone(true);
  }, []);

  const finish = () => {
    markIntroSeen();
    setDone(true);
  };

  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    // CSS modules hash keyframe names, so match on the readable part.
    if (event.target === event.currentTarget && event.animationName.includes('exit')) finish();
  };

  if (done) return null;

  return (
    <div className={classes.overlay} onAnimationEnd={onAnimationEnd} onClick={finish} aria-hidden="true">
      <Clapperboard />
    </div>
  );
}
