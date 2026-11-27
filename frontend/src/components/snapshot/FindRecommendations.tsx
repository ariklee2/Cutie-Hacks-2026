'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { snapshotContent } from '@/content/snapshot';
import { findRecommendations } from '@/lib/api/recommendations';
import { ApiError } from '@/lib/api/client';

import classes from './Recommendations.module.css';

const copy = snapshotContent.recommendations;

/** While another request for this name is already running, check back this often. */
const WAIT_POLL_MS = 5000;

/**
 * Shown when data/<name>_recommendations.json doesn't exist yet. Starts the
 * recommender as soon as the scene opens (once per visit), then refreshes
 * the page to show the results. If a search for this name is already running
 * (409, e.g. another tab), it waits and refreshes until the results exist.
 * A failure shows the reason and a Try again button.
 */
export function FindRecommendations({ name }: { name: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<{ status: 'running' } | { status: 'error'; message: string }>({
    status: 'running',
  });

  const find = useCallback(async () => {
    setState({ status: 'running' });
    try {
      await findRecommendations(name);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) return; // already running: the poll below picks it up
      setState({ status: 'error', message: (error as Error).message });
    }
  }, [name, router]);

  // Start once per visit (the ref also stops React's dev double-run from paying twice).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void find();
  }, [find]);

  // While running, refresh now and then: picks up results finished by another request.
  useEffect(() => {
    if (state.status !== 'running') return;
    const timer = setInterval(() => router.refresh(), WAIT_POLL_MS);
    return () => clearInterval(timer);
  }, [state.status, router]);

  return (
    <div className={classes.find} aria-live="polite">
      {state.status === 'running' ? (
        <>
          <p>{copy.finding}</p>
          <p className={classes.note}>{copy.cost}</p>
        </>
      ) : (
        <>
          <p role="alert">{copy.failed(state.message)}</p>
          <button type="button" className={classes.findButton} onClick={() => void find()}>
            {copy.retry}
          </button>
        </>
      )}
    </div>
  );
}
