import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShareCard, type ShareCardData } from '@/components/snapshot/ShareCard';
import { SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { clubLabel, snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError, type SnapshotData } from '@/lib/snapshotData';
import { weekRange } from '@/lib/snapshotFormat';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.share;
const TOP = 5;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** The snapshot's year: from its last day of watching, else when it was built. */
function snapshotYear(s: SnapshotData): number {
  const days = isSectionError(s.watch_time) ? [] : s.watch_time.per_day;
  const date = days.length > 0 ? days[days.length - 1].date : s.generated_at;
  return Number(date.slice(0, 4)) || new Date().getFullYear();
}

function cardData(name: string, s: SnapshotData): ShareCardData {
  const watch = isSectionError(s.watch_time) ? null : s.watch_time;
  return {
    name,
    year: snapshotYear(s),
    range: weekRange(s),
    topCreators: isSectionError(s.top_creators) ? [] : s.top_creators.slice(0, TOP).map((c) => `@${c.creator}`),
    topHashtags: isSectionError(s.top_hashtags) ? [] : s.top_hashtags.slice(0, TOP).map((h) => `#${h.hashtag}`),
    reels: watch?.total_reels != null ? watch.total_reels.toLocaleString('en-US') : null,
    club: isSectionError(s.club) ? null : clubLabel(s.club.club),
  };
}

/** Last scene: the week on one story-shaped card to save or share. */
export default async function SharePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  return (
    <SnapshotPage name={name} step="share" title={copy.title} subtitle={copy.subtitle}>
      <ShareCard data={cardData(name, snapshot)} />
    </SnapshotPage>
  );
}
