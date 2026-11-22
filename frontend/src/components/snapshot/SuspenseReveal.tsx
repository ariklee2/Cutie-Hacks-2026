'use client';

import { useEffect, useState, type ReactNode } from 'react';

import classes from './SuspenseReveal.module.css';

/**
 * Builds suspense before a verdict: shows `prompt` big ("Loyal… or
 * variety?"), then after `wait` ms — or on a click / Enter — snaps the
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
    <button type="button" className={classes.prompt} onClick={() => setRevealed(true)}>
      <span className={classes.promptText}>{prompt}</span>
      <span className={classes.visuallyHidden}>{revealLabel}</span>
    </button>
  );
}
