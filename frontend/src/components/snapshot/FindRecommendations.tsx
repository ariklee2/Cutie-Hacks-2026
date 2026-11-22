'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { snapshotContent } from '@/content/snapshot';

import classes from './Recommendations.module.css';

const copy = snapshotContent.recommendations;

/**
 * Shown when data/<name>_recommendations.json doesn't exist yet. Runs the
 * recommender on click (it spends Apify credit, so never automatically), then
 * reloads the page to show the results.
 */
export function FindRecommendations({ name }: { name: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ status: 'idle' | 'running' } | { status: 'error'; message: string }>({
    status: 'idle',
  });

  const find = async () => {
    setState({ status: 'running' });
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Something went wrong.');
      router.refresh();
    } catch (error) {
      setState({ status: 'error', message: (error as Error).message });
    }
  };

  return (
    <div className={classes.find}>
      <p>{copy.missing}</p>
      <button type="button" className={classes.findButton} onClick={find} disabled={state.status === 'running'}>
        {state.status === 'running' ? copy.finding : copy.find}
      </button>
      <p className={classes.note}>{copy.cost}</p>
      {state.status === 'error' && (
        <p className={classes.note} role="alert">
          {copy.failed(state.message)}
        </p>
      )}
    </div>
  );
}
