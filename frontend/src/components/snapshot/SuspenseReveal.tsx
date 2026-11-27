'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';

import classes from './SuspenseReveal.module.css';

/**
 * Builds suspense before a verdict: shows `prompt` big ("Loyal… or
 * variety?") beside a spinning film reel, then after `wait` ms — or on a click / Enter — snaps the
 * answer (`children`) in like a clapperboard closing. Under
 * prefers-reduced-motion the answer shows straight away.
 */
export function SuspenseReveal({
  prompt,
  revealLabel,
  wait = 1600,
  children,
}: {
  prompt: string;
  /** Button text for revealing early (keyboard / screen readers). */
  revealLabel: string;
  wait?: number;
  children: ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }
    const timer = setTimeout(() => setRevealed(true), wait);
    return () => clearTimeout(timer);
  }, [wait]);

  if (revealed) {
    return (
      <div className={classes.answer} aria-live="polite">
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={classes.prompt}
      onClick={() => setRevealed(true)}
    >
      <FilmReel />
      <span className={classes.promptText}>{prompt}</span>
      <span className={classes.visuallyHidden}>{revealLabel}</span>
    </button>
  );
}

const HOLES = 5;

/**
 * A film reel seen face on, spinning while the question waits: a white disc
 * with five round windows around a small hub (cut out with a mask, so the
 * scene color shows through).
 */
function FilmReel() {
  const id = useId();
  const mask = `${id}-reel`;
  return (
    <svg className={classes.reel} viewBox="-50 -50 100 100" aria-hidden="true">
      <defs>
        <mask id={mask}>
          <circle r="46" fill="#fff" />
          {Array.from({ length: HOLES }, (_, i) => {
            const a = (i / HOLES) * 2 * Math.PI;
            // Rounded so the server and browser render the same numbers.
            const cx = (26 * Math.sin(a)).toFixed(2);
            const cy = (-26 * Math.cos(a)).toFixed(2);
            return <circle key={i} cx={cx} cy={cy} r="12" fill="#000" />;
          })}
          <circle r="5" fill="#000" />
        </mask>
      </defs>
      <g className={classes.reelSpin}>
        <circle r="46" mask={`url(#${mask})`} className={classes.reelDisc} />
        <circle r="40" className={classes.reelRim} />
      </g>
    </svg>
  );
}
