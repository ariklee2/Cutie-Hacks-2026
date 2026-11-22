'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Left / right arrow keys move to the previous / next snapshot page. The
 * sequence stops at both ends (no wrap from the share card back to the
 * start). Ignored while typing in a field or with a modifier key held, so
 * browser shortcuts and text editing keep working.
 */
export function ArrowKeyNav({ previous, next }: { previous?: string; next?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (previous) router.prefetch(previous);
    if (next) router.prefetch(next);

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      const href = event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : undefined;
      if (!href) return;
      event.preventDefault();
      router.push(href);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, previous, next]);

  return null;
}
