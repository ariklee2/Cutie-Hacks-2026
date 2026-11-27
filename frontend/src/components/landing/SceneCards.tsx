'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { LandingScene } from '@/content/landing';
import { snapshotHref } from '@/lib/snapshotSequence';
import { useSavedSnapshot } from '@/lib/useSavedSnapshot';

import classes from './SceneCards.module.css';

/**
 * What's showing: one card per snapshot scene, each a frame of film (ink
 * with sprocket holes along the top and bottom) holding a white frame with
 * "Scene 01" in gold, the scene's name in poster type and its one-liner.
 * Once this browser has a snapshot (the same one the header's "View @name's
 * snapshot" opens), every card is a link straight to that scene of it.
 */
export function SceneCards({ scenes }: { scenes: LandingScene[] }) {
  const saved = useSavedSnapshot();
  return (
    <ol className={classes.grid}>
      {scenes.map((scene, i) => {
        const frame = (
          <div className={classes.frame}>
            <p className={classes.number}>Scene {String(i + 1).padStart(2, '0')}</p>
            <h3 className={classes.name}>{scene.name}</h3>
            <p className={classes.detail}>{scene.detail}</p>
          </div>
        );
        return (
          <li key={scene.step} className={classes.card} style={{ '--i': i } as CSSProperties}>
            {saved ? (
              <Link href={snapshotHref(saved, scene.step)} className={classes.link}>
                {frame}
              </Link>
            ) : (
              frame
            )}
          </li>
        );
      })}
    </ol>
  );
}
