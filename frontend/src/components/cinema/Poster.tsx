import type { ReactNode } from 'react';

import classes from './Poster.module.css';

/**
 * A one-sheet movie poster for a scene's #1 (top creator, top hashtag):
 * an ink frame with sprocket holes down both sides, a gold sheet inside with
 * a small billing line ("Starring"), the name huge in poster type, and a
 * caption. `name` shrinks to fit long handles.
 */
export function Poster({ billing, name, caption }: { billing: string; name: string; caption: ReactNode }) {
  const size = name.length > 18 ? 'small' : name.length > 11 ? 'medium' : 'large';
  return (
    <figure className={classes.poster}>
      <div className={classes.sheet}>
        <p className={classes.billing}>{billing}</p>
        <p className={classes.name} data-size={size}>
          {name}
        </p>
        <figcaption className={classes.caption}>{caption}</figcaption>
      </div>
    </figure>
  );
}
