import type { CSSProperties } from 'react';

import type { LandingItem } from '@/content/landing';

import classes from './SceneCards.module.css';

/**
 * What's showing: one card per snapshot scene, each a frame of film (ink
 * with sprocket holes along the top and bottom) holding a white frame with
 * "Scene 01" in gold, the scene's name in poster type and its one-liner.
 */
export function SceneCards({ scenes }: { scenes: LandingItem[] }) {
  return (
    <ol className={classes.grid}>
      {scenes.map((scene, i) => (
        <li key={scene.name} className={classes.card} style={{ '--i': i } as CSSProperties}>
          <div className={classes.frame}>
            <p className={classes.number}>Scene {String(i + 1).padStart(2, '0')}</p>
            <h3 className={classes.name}>{scene.name}</h3>
            <p className={classes.detail}>{scene.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
