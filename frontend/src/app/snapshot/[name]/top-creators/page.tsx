import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BarChart } from '@/components/snapshot/BarChart';
import { SnapshotMessage, SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError } from '@/lib/snapshotData';
import { weekRange } from '@/lib/snapshotFormat';

export const dynamic = 'force-dynamic'; // reads data/<name>_snapshot.json per request

const copy = snapshotContent.topCreators;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** First page of the snapshot sequence: top creators as a horizontal bar chart. */
export default async function TopCreatorsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const creators = snapshot.top_creators;

  return (
    <SnapshotPage
      name={name}
      step="top-creators"
      title={copy.title}
      subtitle={copy.subtitle(weekRange(snapshot))}
      backdrop={!isSectionError(creators) && creators[0] ? `@${creators[0].creator}` : undefined}
    >
      {isSectionError(creators) ? (
        <SnapshotMessage>{copy.failed}</SnapshotMessage>
      ) : creators.length === 0 ? (
        <SnapshotMessage>{copy.empty}</SnapshotMessage>
      ) : (
        <BarChart
          table={false}
          label={copy.chartLabel}
          columns={[copy.columnAccount, copy.columnReels]}
          rows={creators.map((c) => ({
            key: c.creator,
            label: `@${c.creator}`,
            value: c.reels,
            valueText: c.reels.toLocaleString(),
            detail: copy.reels(c.reels),
          }))}
        />
      )}
    </SnapshotPage>
  );
}
