import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FindRecommendations } from '@/components/snapshot/FindRecommendations';
import { RecommendedProfiles, RecommendedReels } from '@/components/snapshot/Recommendations';
import recClasses from '@/components/snapshot/Recommendations.module.css';
import { SnapshotMessage, SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { snapshotContent } from '@/content/snapshot';
import { readRecommendations, readSnapshot } from '@/lib/server/snapshotStore';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.recommendations;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/**
 * Reels and accounts to try next (data/<name>_recommendations.json, from
 * features/recommender.py). Before they exist, offers to find them.
 */
export default async function RecommendationsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const recommendations = await readRecommendations(name);
  const page = (children: React.ReactNode) => (
    <SnapshotPage name={name} step="recommendations" title={copy.title} subtitle={copy.subtitle}>
      {children}
    </SnapshotPage>
  );

  if (!recommendations) return page(<FindRecommendations name={name} />);

  const { reels, profiles, based_on } = recommendations;
  if (reels.length === 0 && profiles.length === 0) return page(<SnapshotMessage>{copy.noneFound}</SnapshotMessage>);

  const tags = based_on.top_hashtags.map((t) => t.hashtag);
  return page(
    <>
      {tags.length > 0 && <p className={recClasses.basedOn}>{copy.basedOn(tags)}</p>}
      <div className={recClasses.groups}>
        {reels.length > 0 && <RecommendedReels reels={reels} />}
        {profiles.length > 0 && <RecommendedProfiles profiles={profiles} />}
      </div>
    </>,
  );
}
