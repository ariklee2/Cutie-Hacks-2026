'use client';

import type { MouseEvent, ReactNode } from 'react';

import { useSceneNav } from './SceneTransition';

/** Clicks on these (and inside them) keep their own meaning. */
const INTERACTIVE = 'a, button, input, select, textarea, label, figure, [tabindex], [role="button"]';

/**
 * Story-style taps: a click on the left 30% of the scene goes back, anywhere
 * else goes forward — unless it lands on a link, button, chart or other
 * control, or ends a text selection.
 */
export function SceneTapArea({
  previous,
  next,
  className,
  children,
  ...rest
}: {
  previous?: string;
  next?: string;
  className?: string;
  children: ReactNode;
  'data-scene'?: string;
}) {
  const go = useSceneNav();

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    if (window.getSelection()?.toString()) return;
    const box = event.currentTarget.getBoundingClientRect();
    const href = event.clientX - box.left < box.width * 0.3 ? previous : next;
    if (href) go(href);
  }

  return (
    <div className={className} onClick={onClick} {...rest}>
      {children}
    </div>
  );
}
