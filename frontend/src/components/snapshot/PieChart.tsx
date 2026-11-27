'use client';

import { useId, useState, type CSSProperties } from 'react';

import { ChartTable } from './ChartTable';
import classes from './PieChart.module.css';

export interface PieChartSlice {
  /** Unique per slice. */
  key: string;
  /** Name in the legend, tooltip and table (e.g. "Sporty 🏀"). */
  label: string;
  /** Mark drawn inside the slice when it's big enough (e.g. "🏀"); optional. */
  mark?: string;
  /** Slice size, relative to the total. */
  value: number;
  /** Short value in the legend and table (e.g. "14%"). */
  valueText: string;
  /** Tooltip first line and accessible value (e.g. "14% of your engagement"). */
  detail: string;
}

const R = 100; // pie radius in viewBox units
const MARK_MIN_SHARE = 0.06; // slices smaller than this get no mark inside
const EXPLODE = 6; // how far the active slice moves out, in viewBox units
const HALF = R + EXPLODE + 2; // half the viewBox: room for the lifted slice

/** A point on the circle, angle in turns from 12 o'clock, clockwise. */
const point = (turns: number, r = R) => {
  const a = turns * 2 * Math.PI;
  return [r * Math.sin(a), -r * Math.cos(a)] as const;
};

const slicePath = (from: number, to: number) => {
  if (to - from >= 1 - 1e-9) {
    // One slice is the whole pie: two half arcs (an arc can't end where it starts).
    return `M 0 ${-R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 ${-R} Z`;
  }
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M 0 0 L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
};

/**
 * Pie chart for a part-of-a-whole on a snapshot page (the club scene): slices
 * clockwise from 12 o'clock in the order given, all white with a gap of the
 * scene color between them, the largest (ties included) gold. Identity never
 * rests on color: big slices carry their `mark` (an emoji), and the legend
 * beside the pie names every slice with its value. Slices pop in one after
 * another (off under prefers-reduced-motion). Hover or focus a slice or its
 * legend row to lift that slice out and show a tooltip; "View as table"
 * shows the same numbers.
 */
export function PieChart({
  slices,
  label,
  columns,
}: {
  slices: PieChartSlice[];
  /** Accessible chart name (the page title names it visually). */
  label: string;
  /** Table headers: [label column, value column]. */
  columns: [string, string];
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);

  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const max = Math.max(...slices.map((s) => s.value));
  let start = 0;
  const arcs = slices.map((s) => {
    const share = s.value / total;
    const from = start;
    start += share;
    return { ...s, share, from, to: start, mid: from + share / 2 };
  });

  const hover = (i: number) => ({
    onPointerEnter: () => setActive(i),
    onPointerLeave: () => setActive((cur) => (cur === i ? null : cur)),
    onFocus: () => setActive(i),
    onBlur: () => setActive((cur) => (cur === i ? null : cur)),
  });

  const current = active === null ? null : arcs[active];
  // Tooltip just outside the active slice's edge, as a share of the box.
  const tip = current && point(current.mid, R * 0.75);

  return (
    <figure className={classes.chart} aria-labelledby={`${id}-label`}>
      <figcaption id={`${id}-label`} className="visually-hidden">
        {label}
      </figcaption>

      <div className={classes.layout}>
        <div className={classes.pieBox}>
          <svg
            className={classes.pie}
            viewBox={`${-HALF} ${-HALF} ${2 * HALF} ${2 * HALF}`}
            aria-hidden="true"
          >
            {arcs.map((a, i) => {
              const [dx, dy] = point(a.mid, active === i ? EXPLODE : 0);
              const [mx, my] = point(a.mid, R * 0.66);
              return (
                <g
                  key={a.key}
                  className={classes.slice}
                  style={{ '--i': i, '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties}
                  data-peak={a.value === max || undefined}
                  data-active={active === i || undefined}
                  {...hover(i)}
                >
                  <path d={slicePath(a.from, a.to)} />
                  {a.mark && a.share >= MARK_MIN_SHARE && (
                    <text x={mx} y={my} className={classes.mark}>
                      {a.mark}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {current && (
            <div
              className={classes.tooltip}
              role="presentation"
              style={{ left: `${((tip![0] + HALF) / (2 * HALF)) * 100}%`, top: `${((tip![1] + HALF) / (2 * HALF)) * 100}%` }}
            >
              <strong>{current.detail}</strong>
              <span>{current.label}</span>
            </div>
          )}
        </div>

        <ol className={classes.legend}>
          {arcs.map((a, i) => (
            <li
              key={a.key}
              className={classes.legendRow}
              tabIndex={0}
              aria-label={`${a.label}: ${a.detail}`}
              data-active={active === i || undefined}
              data-peak={a.value === max || undefined}
              {...hover(i)}
            >
              <span className={classes.swatch} aria-hidden="true" />
              <span className={classes.legendLabel} aria-hidden="true">
                {a.label}
              </span>
              <span className={classes.legendValue} aria-hidden="true">
                {a.valueText}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <ChartTable
        label={label}
        columns={columns}
        rows={slices.map((s) => ({ key: s.key, label: s.label, value: s.valueText }))}
      />
    </figure>
  );
}
