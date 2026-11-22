'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { FilmStrip } from '@/components/cinema/FilmStrip';
import { snapshotSequence } from '@/lib/snapshotSequence';

import classes from './SceneTransition.module.css';

type Phase = 'idle' | 'covering' | 'revealing';
/** Which side the destination scene is on: the film comes in from there. */
type Direction = 'forward' | 'back';

/** Strips stacked to cover the screen (each `--wipe-strip-height` tall, so frames keep their shape). */
const STRIPS = 6;

const stepIndex = (path: string) => snapshotSequence.findIndex((s) => s === path.split('/').pop());

/** Moves to another snapshot scene, with the film wipe. */
const SceneNavContext = createContext<(href: string) => void>(() => {});

export const useSceneNav = () => useContext(SceneNavContext);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Seconds → ms for the --snapshot-scene-wipe token, read from the page. */
function wipeMs(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--snapshot-scene-wipe').trim();
  const seconds = parseFloat(raw);
  return Number.isFinite(seconds) ? seconds * 1000 : 550;
}

/**
 * Wraps the snapshot scenes (it lives in their shared layout, so it persists
 * between them). Moving to another scene runs a film wipe: a wall of film
 * strips (stacked at their natural height, so the frames aren't stretched)
 * sweeps in from the side the destination scene is on — the right going
 * forward, the left going back — until it covers the screen; the next scene
 * loads behind it, then the film carries on out the other side. Under
 * prefers-reduced-motion, scenes simply cut.
 */
export function SceneTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const [direction, setDirection] = useState<Direction>('forward');
  const target = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (href: string) => {
      if (href === pathname || target.current) return;
      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }
      target.current = href;
      setDirection(stepIndex(href) < stepIndex(pathname) ? 'back' : 'forward');
      setPhase('covering');
      timer.current = setTimeout(() => router.push(href), wipeMs());
    },
    [pathname, router],
  );

  // The new scene is in: sweep the film off it.
  useEffect(() => {
    if (!target.current) return;
    target.current = null;
    setPhase('revealing');
    timer.current = setTimeout(() => setPhase('idle'), wipeMs());
  }, [pathname]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <SceneNavContext.Provider value={go}>
      {children}
      <div className={classes.wipe} data-phase={phase} data-direction={direction} aria-hidden="true">
        {phase !== 'idle' &&
          Array.from({ length: STRIPS }, (_, i) => (
            <div key={i} className={classes.strip}>
              <FilmStrip />
            </div>
          ))}
      </div>
    </SceneNavContext.Provider>
  );
}
