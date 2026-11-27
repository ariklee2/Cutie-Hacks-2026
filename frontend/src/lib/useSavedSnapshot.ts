'use client';

import { useEffect, useState } from 'react';

import { snapshotExists } from '@/lib/api/snapshot';
import { forgetSnapshot, savedSnapshotName } from '@/lib/savedSnapshot';

/**
 * The snapshot this browser remembers (lib/savedSnapshot.ts), once the
 * server confirms it still exists; a stale name (deleted or renamed data) is
 * forgotten. Null until confirmed, and when `enabled` is false.
 */
export function useSavedSnapshot(enabled = true): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const remembered = savedSnapshotName();
    if (!remembered) return;
    let cancelled = false;
    snapshotExists(remembered)
      .then((exists) => {
        if (cancelled) return;
        if (exists) setName(remembered);
        else forgetSnapshot();
      })
      .catch(() => {}); // Offline or server error: just don't offer it.
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? name : null;
}
