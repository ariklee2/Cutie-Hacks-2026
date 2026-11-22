import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CreditsRoll } from '@/components/snapshot/CreditsRoll';
import { SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { snapshotHighlights } from '@/lib/snapshotHighlights';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.credits;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** The finale before the share card: the week's highlights as rolling end credits. */
export default async function CreditsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const credits = snapshotHighlights(snapshot)
    .filter((h): h is { key: typeof h.key; value: string } => h.value != null)
    .map((h) => ({ role: copy.roles[h.key], name: h.value }));

  return (
    <SnapshotPage name={name} step="credits" title={copy.title} subtitle={copy.subtitle}>
      <CreditsRoll credits={[...credits, { role: copy.directedBy, name: `@${name}` }]} closing={copy.theEnd} />
    </SnapshotPage>
  );
}
