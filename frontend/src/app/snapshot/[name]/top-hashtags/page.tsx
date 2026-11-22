import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BarChart } from '@/components/snapshot/BarChart';
import { SnapshotMessage, SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError } from '@/lib/snapshotData';
import { weekRange } from '@/lib/snapshotFormat';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.topHashtags;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** Top hashtags on the reels watched this week, as a horizontal bar chart. */
export default async function TopHashtagsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const hashtags = snapshot.top_hashtags;

  return (
    <SnapshotPage name={name} step="top-hashtags" title={copy.title} subtitle={copy.subtitle(weekRange(snapshot))}>
      {isSectionError(hashtags) ? (
        <SnapshotMessage>{copy.failed}</SnapshotMessage>
      ) : hashtags.length === 0 ? (
        <SnapshotMessage>{copy.empty}</SnapshotMessage>
      ) : (
        <BarChart
          table={false}
          label={copy.chartLabel}
          columns={[copy.columnHashtag, copy.columnReels]}
          rows={hashtags.map((h) => ({
            key: h.hashtag,
            label: `#${h.hashtag}`,
            value: h.reels,
            valueText: h.reels.toLocaleString(),
            detail: copy.reels(h.reels),
          }))}
        />
      )}
    </SnapshotPage>
  );
}
