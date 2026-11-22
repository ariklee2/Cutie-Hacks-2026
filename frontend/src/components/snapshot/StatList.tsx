import classes from './StatList.module.css';

/** Supporting numbers, one per row between hairlines: value on top, what it means below. */
export function StatList({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className={classes.list}>
      {stats.map((s) => (
        <div key={s.label} className={classes.row}>
          <dt className={classes.label}>{s.label}</dt>
          <dd className={classes.value}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
