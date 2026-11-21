import classes from './IntroClapper.module.css';

/**
 * A full-screen film clapperboard: two striped arms across the top (the upper
 * one hinged at the left so it can snap shut) and the slate filling the rest.
 * Ink and paper only.
 */
export function Clapperboard() {
  return (
    <div className={classes.clapper}>
      <div className={classes.arms}>
        <div className={classes.stick} />
        <div className={classes.base} />
      </div>
      <div className={classes.slate}>
        <p className={classes.slateTitle}>INSTA SNAPSHOT</p>
        <div className={classes.slateRule} />
        <div className={classes.slateRule} />
      </div>
    </div>
  );
}
