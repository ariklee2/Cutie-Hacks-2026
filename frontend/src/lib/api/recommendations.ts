/**
 * Client call for POST /api/recommendations
 * (src/app/api/recommendations/route.ts): runs features/recommender.py for
 * a name that already has a snapshot, writing
 * data/<name>_recommendations.json. Same origin as the app.
 */
import { ApiError } from './client';

export async function findRecommendations(name: string): Promise<{ reels: number; profiles: number }> {
  const response = await fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body ? String(body.error) : 'Something went wrong.';
    throw new ApiError(message, response.status, body);
  }
  return body as { reels: number; profiles: number };
}
