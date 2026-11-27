'use client';

import { useId, useState, type ReactNode } from 'react';

import { snapshotContent } from '@/content/snapshot';

import classes from './ChartTable.module.css';

export interface ChartTableRow {
  key: string;
  /** The row's label cell (e.g. "@f1", "Sat, Nov 14"). */
  label: ReactNode;
  /** The row's value cell (e.g. "36", "1h 22m"). */
  value: ReactNode;
}

/**
 * The "View as table" toggle under a chart and the two-column table it
 * reveals, with the same numbers as the chart (for screen readers and
 * anyone who prefers rows to shapes).
 */
export function ChartTable({ label, columns, rows }: { label: string; columns: [string, string]; rows: ChartTableRow[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={classes.tableToggle}
        aria-expanded={open}
        aria-controls={`${id}-table`}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? snapshotContent.chart.hideTable : snapshotContent.chart.showTable}
      </button>
      {open && (
        <table id={`${id}-table`} className={classes.table}>
          <caption className="visually-hidden">{label}</caption>
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
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
