import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShareCard } from '@/components/snapshot/ShareCard';
import { SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { weekRange } from '@/lib/snapshotFormat';
import { snapshotHighlights } from '@/lib/snapshotHighlights';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.share;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** Last page: the highlights of every earlier page on one shareable card. */
export default async function SharePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  return (
    <SnapshotPage name={name} step="share" title={copy.title} subtitle={copy.subtitle}>
      <ShareCard
        name={name}
        range={weekRange(snapshot)}
        rows={snapshotHighlights(snapshot).map((h) => [copy.rows[h.key], h.value ?? copy.unavailable])}
      />
    </SnapshotPage>
  );
}
