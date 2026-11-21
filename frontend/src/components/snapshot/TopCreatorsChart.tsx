'use client';

import { useId, useState, type CSSProperties } from 'react';

import { snapshotContent } from '@/content/snapshot';

import classes from './TopCreatorsChart.module.css';

interface Creator {
  creator: string;
  reels: number;
}

const copy = snapshotContent.topCreators;

/**
 * Horizontal bar chart: one bar per account, longest first, each labeled at
 * its tip with how many of its reels were watched. Bars grow in on load,
 * one after another (skipped under prefers-reduced-motion). Hover or focus a
 * row for a tooltip; "View as table" shows the same numbers as a table.
 */
export function TopCreatorsChart({ creators }: { creators: Creator[] }) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(...creators.map((c) => c.reels), 1);

  return (
    <figure className={classes.chart} aria-labelledby={`${id}-label`}>
      <figcaption id={`${id}-label`} className={classes.visuallyHidden}>
        {copy.chartLabel}
      </figcaption>

      <ol className={classes.rows}>
        {creators.map((c, i) => (
          <li
            key={c.creator}
            className={classes.row}
            style={{ '--i': i, '--ratio': c.reels / max } as CSSProperties}
            tabIndex={0}
            aria-label={`@${c.creator}: ${copy.reels(c.reels)}`}
            data-active={active === i || undefined}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive((cur) => (cur === i ? null : cur))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((cur) => (cur === i ? null : cur))}
          >
            <span className={classes.account} aria-hidden="true">
              @{c.creator}
            </span>
            <span className={classes.track} aria-hidden="true">
              <span className={classes.bar} />
              <span className={classes.value}>{c.reels.toLocaleString()}</span>
              {active === i && (
                <span className={classes.tooltip} role="presentation">
                  <strong>{copy.reels(c.reels)}</strong>
                  <span>@{c.creator}</span>
                </span>
              )}
            </span>
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
        {showTable ? 'Hide table' : 'View as table'}
      </button>

      {showTable && (
        <table id={`${id}-table`} className={classes.table}>
          <caption className={classes.visuallyHidden}>{copy.chartLabel}</caption>
          <thead>
            <tr>
              <th scope="col">{copy.columnAccount}</th>
              <th scope="col">{copy.columnReels}</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c) => (
              <tr key={c.creator}>
                <td>@{c.creator}</td>
                <td>{c.reels.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
