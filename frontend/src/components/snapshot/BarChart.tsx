'use client';

import { useId, useState, type CSSProperties } from 'react';

import { snapshotContent } from '@/content/snapshot';

import classes from './BarChart.module.css';

export interface BarChartRow {
  /** Unique per row. */
  key: string;
  /** Label to the left of the bar (e.g. "@f1", "#formula1", "Fri, Nov 20"). */
  label: string;
  /** Bar length, relative to the longest bar. */
  value: number;
  /** Short value shown at the bar's tip and in the table (e.g. "81", "1h 22m"). */
  valueText: string;
  /** Tooltip first line and accessible value (e.g. "81 reels watched"). */
  detail: string;
}

/**
 * Horizontal bar chart used on every snapshot page: one bar per row, in the
 * order given, each labeled at its tip; the top bar (largest value, ties
 * included) is gold. Bars grow in on load, one after
 * another (skipped under prefers-reduced-motion). Hover or focus a row for a
 * tooltip; "View as table" (unless `table` is off) shows the same numbers
 * as a table.
 */
export function BarChart({
  rows,
  label,
  columns,
  table = true,
}: {
  rows: BarChartRow[];
  /** Accessible chart name (the page title names it visually). */
  label: string;
  /** Table headers: [label column, value column]. */
  columns: [string, string];
  /** Show the "View as table" toggle (default on). */
  table?: boolean;
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(...rows.map((r) => r.value), Number.MIN_VALUE);

  return (
    <figure className={classes.chart} aria-labelledby={`${id}-label`}>
      <figcaption id={`${id}-label`} className={classes.visuallyHidden}>
        {label}
      </figcaption>

      <ol className={classes.rows}>
        {rows.map((r, i) => (
          <li
            key={r.key}
            className={classes.row}
            style={{ '--i': i, '--ratio': r.value / max } as CSSProperties}
            tabIndex={0}
            aria-label={`${r.label}: ${r.detail}`}
            data-active={active === i || undefined}
            data-peak={r.value === max || undefined}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive((cur) => (cur === i ? null : cur))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((cur) => (cur === i ? null : cur))}
          >
            <span className={classes.account} aria-hidden="true">
              {r.label}
            </span>
            <span className={classes.track} aria-hidden="true">
              <span className={classes.bar} />
              <span className={classes.value}>{r.valueText}</span>
              {active === i && (
                <span className={classes.tooltip} role="presentation">
                  <strong>{r.detail}</strong>
                  <span>{r.label}</span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {table && (
        <button
          type="button"
          className={classes.tableToggle}
          aria-expanded={showTable}
          aria-controls={`${id}-table`}
          onClick={() => setShowTable((v) => !v)}
        >
          {showTable ? snapshotContent.chart.hideTable : snapshotContent.chart.showTable}
        </button>
      )}

      {table && showTable && (
        <table id={`${id}-table`} className={classes.table}>
          <caption className={classes.visuallyHidden}>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{columns[0]}</th>
              <th scope="col">{columns[1]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>{r.valueText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
