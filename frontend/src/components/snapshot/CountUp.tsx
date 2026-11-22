'use client';

import { useEffect, useState } from 'react';

/** Every number in a string: "4h 57m" → 4, 57; "6,786" → 6786; "0.11" → 0.11. */
const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

function render(template: string, progress: number): string {
  return template.replace(NUMBER, (match) => {
    const decimals = match.includes('.') ? match.split('.')[1].length : 0;
    const value = parseFloat(match.replace(/,/g, '')) * progress;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: match.includes(','),
    });
  });
}

/**
 * Text whose numbers count up from 0 when it appears ("4h 57m" ticks up as
 * 0h 0m … 4h 57m). Text without numbers is shown as is. The server renders
 * the final value (so it reads right without JavaScript and to screen
 * readers, via aria-label); under prefers-reduced-motion it never animates.
 */
export function CountUp({ text, delay = 300, duration = 1100 }: { text: string; delay?: number; duration?: number }) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (!/\d/.test(text) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(text);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    setShown(render(text, 0));
    const tick = (now: number) => {
      start ??= now + delay;
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setShown(render(text, eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, delay, duration]);

  return (
    <span aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
