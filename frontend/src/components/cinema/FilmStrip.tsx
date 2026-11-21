import type { CSSProperties } from 'react';

import { sprocketTile } from './filmArt';
import classes from './FilmStrip.module.css';

/**
 * Film running horizontally behind its parent, like film through a projector:
 * ink edges with sprocket holes, paper frames separated by ink gaps. Fills its
 * nearest `position: relative` ancestor completely.
 */
export function FilmStrip() {
  return (
    <div className={classes.film} aria-hidden="true">
      <div
        className={classes.track}
        style={{ '--film-sprocket': sprocketTile() } as CSSProperties}
      />
    </div>
  );
}
