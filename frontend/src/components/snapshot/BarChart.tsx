'use client';

import { useId, useState, type CSSProperties } from 'react';

import { ChartTable } from './ChartTable';
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
 * as a table. `ranked` numbers the rows 01, 02, … in poster type.
 */
export function BarChart({
  rows,
  label,
  columns,
  table = true,
  ranked = false,
}: {
  rows: BarChartRow[];
  /** Accessible chart name (the page title names it visually). */
  label: string;
  /** Table headers: [label column, value column]. */
  columns: [string, string];
  /** Show the "View as table" toggle (default on). */
  table?: boolean;
  /** Number the rows 01, 02, … in poster type (a top-N list). */
  ranked?: boolean;
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.value), Number.MIN_VALUE);

  return (
    <figure className={classes.chart} data-ranked={ranked || undefined} aria-labelledby={`${id}-label`}>
      <figcaption id={`${id}-label`} className="visually-hidden">
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
            {ranked && (
              <span className={classes.rank} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
            )}
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
        <ChartTable
          label={label}
          columns={columns}
          rows={rows.map((r) => ({ key: r.key, label: r.label, value: r.valueText }))}
        />
      )}
    </figure>
  );
}
