'use client';

import { useId, useState, type CSSProperties } from 'react';

import { snapshotContent } from '@/content/snapshot';

import classes from './ColumnLineChart.module.css';

export interface ColumnLinePoint {
  /** Unique per point. */
  key: string;
  /** Label under the column (e.g. "Sat"). */
  label: string;
  /** Smaller second line under the label (e.g. "Nov 14"). */
  sublabel: string;
  /** Column height, relative to the tallest column. */
  value: number;
  /** Short value (e.g. "59m"), shown above the highlighted point and in the table. */
  valueText: string;
  /** Tooltip first line and accessible value. */
  detail: string;
}

/** Share of the plot height the tallest column reaches (room above for its label). */
const HEADROOM = 0.82;

/**
 * Vertical columns with a line joining their tops: one series, so the line
 * traces the same values as the columns (no second axis). Columns grow up one
 * after another, then the line draws across them (skipped under
 * prefers-reduced-motion). Hover or focus a column for a tooltip; the
 * `highlight` point gets its value labeled. "View as table" shows the numbers.
 */
export function ColumnLineChart({
  points,
  label,
  columns,
  highlight,
}: {
  points: ColumnLinePoint[];
  /** Accessible chart name (the page title names it visually). */
  label: string;
  /** Table headers: [label column, value column]. */
  columns: [string, string];
  /** Key of the point whose value is labeled above it (e.g. the busiest day). */
  highlight?: string;
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(...points.map((p) => p.value), Number.MIN_VALUE);
  const n = points.length;
  const height = (value: number) => (value / max) * HEADROOM;

  // The line in a 0–100 box stretched over the plot; x is each column's center.
  const line = points.map((p, i) => `${((i + 0.5) / n) * 100},${100 - height(p.value) * 100}`).join(' ');

  return (
    <figure className={classes.chart} aria-labelledby={`${id}-label`} style={{ '--n': n } as CSSProperties}>
      <figcaption id={`${id}-label`} className={classes.visuallyHidden}>
        {label}
      </figcaption>

      <div className={classes.plot}>
        <ol className={classes.columns}>
          {points.map((p, i) => (
            <li
              key={p.key}
              className={classes.column}
              style={{ '--i': i, '--h': height(p.value) } as CSSProperties}
              tabIndex={0}
              aria-label={`${p.label} ${p.sublabel}: ${p.detail}`}
              data-active={active === i || undefined}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive((cur) => (cur === i ? null : cur))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((cur) => (cur === i ? null : cur))}
            >
              <span className={classes.bar} aria-hidden="true" />
            </li>
          ))}
        </ol>

        <svg className={classes.line} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={line} vectorEffect="non-scaling-stroke" />
        </svg>

        {points.map((p, i) => (
          <span
            key={p.key}
            className={classes.dot}
            style={{ '--i': i, '--h': height(p.value) } as CSSProperties}
            data-active={active === i || undefined}
            aria-hidden="true"
          >
            {p.key === highlight && active !== i && <span className={classes.peak}>{p.valueText}</span>}
            {active === i && (
              <span className={classes.tooltip} role="presentation">
                <strong>{p.detail}</strong>
                <span>
                  {p.label}, {p.sublabel}
                </span>
              </span>
            )}
          </span>
        ))}
      </div>

      <ol className={classes.axis} aria-hidden="true">
        {points.map((p) => (
          <li key={p.key}>
            <span className={classes.axisLabel}>{p.label}</span>
            <span className={classes.axisSublabel}>{p.sublabel}</span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className={classes.tableToggle}
        aria-expanded={showTable}
        aria-controls={`${id}-table`}
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? snapshotContent.chart.hideTable : snapshotContent.chart.showTable}
      </button>

      {showTable && (
        <table id={`${id}-table`} className={classes.table}>
          <caption className={classes.visuallyHidden}>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{columns[0]}</th>
              <th scope="col">{columns[1]}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <td>
                  {p.label}, {p.sublabel}
                </td>
                <td>{p.valueText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
