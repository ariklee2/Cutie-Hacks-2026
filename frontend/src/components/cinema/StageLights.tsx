import classes from './StageLights.module.css';

/**
 * The look of a lit movie screen, layered behind its parent's content (the
 * parent needs `position: relative` and `isolation: isolate`): two soft
 * spotlight beams swaying from above, a dark vignette at the edges and a
 * fine film grain over everything. Purely decorative; the beams and grain
 * stand still under prefers-reduced-motion.
 */
export function StageLights({ beams = true }: { beams?: boolean }) {
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
    </div>
  );
}
