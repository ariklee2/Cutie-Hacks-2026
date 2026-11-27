import classes from './Slate.module.css';

/**
 * A small clapperboard slate used as an eyebrow above a title: striped arm on
 * top, then "SCENE 03" (number in marquee gold) and a label. `scene` and
 * `of` are optional — without them it's just a labeled slate.
 */
export function Slate({ scene, of, label }: { scene?: number; of?: number; label: string }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <p className={classes.slate}>
      <span className={classes.arm} aria-hidden="true" />
      <span className={classes.body}>
        {scene != null && (
          <span className={classes.scene}>
            Scene <span className={classes.number}>{pad(scene)}</span>
            {of != null && <span className={classes.of}> / {pad(of)}</span>}
          </span>
        )}
        <span className={classes.label}>{label}</span>
      </span>
    </p>
  );
}
