import classes from './StageLights.module.css';

/**
 * The look of a lit movie screen, layered behind its parent's content (the
 * parent needs `position: relative` and `isolation: isolate`): two soft
 * spotlight beams swaying from above, a dark vignette at the edges, a fine
 * film grain over everything, and the projector's light flickering
 * (`flicker={false}` drops it; the snapshot scenes do). Purely
 * decorative; all of it stands still under prefers-reduced-motion.
 */
export function StageLights({ beams = true, flicker = true }: { beams?: boolean; flicker?: boolean }) {
  return (
    <div className={classes.stage} aria-hidden="true">
      {beams && (
        <>
          <span className={classes.beam} data-side="left" />
          <span className={classes.beam} data-side="right" />
        </>
      )}
      <span className={classes.vignette} />
      <span className={classes.grain} />
      {flicker && <span className={classes.flicker} />}
    </div>
  );
}
