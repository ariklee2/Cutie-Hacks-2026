'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSceneNav } from './SceneTransition';

/**
 * Left / right arrow keys move to the previous / next snapshot scene (with
 * the film wipe). The sequence stops at both ends (no wrap from the share
 * card back to the start). Ignored while typing in a field or with a
 * modifier key held, so browser shortcuts and text editing keep working.
 */
export function ArrowKeyNav({ previous, next }: { previous?: string; next?: string }) {
  const router = useRouter();
  const go = useSceneNav();

  useEffect(() => {
    if (previous) router.prefetch(previous);
    if (next) router.prefetch(next);

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;

      const href = event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : undefined;
      if (!href) return;
      event.preventDefault();
      go(href);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, go, previous, next]);

  return null;
}
