import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShareCard } from '@/components/snapshot/ShareCard';
import { SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError, type SnapshotData } from '@/lib/snapshotData';
import { formatHours, formatMinutes, weekRange } from '@/lib/snapshotFormat';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.share;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** One line per earlier page; a section that failed or is empty shows a dash. */
function cardRows(s: SnapshotData): [string, string][] {
  const none = copy.unavailable;
  const watch = isSectionError(s.watch_time) ? null : s.watch_time;
  const binge = isSectionError(s.binge_sessions) ? null : s.binge_sessions.longest[0];
  const loyalty = isSectionError(s.loyal_or_variety) ? null : s.loyal_or_variety;
  const creator = isSectionError(s.top_creators) ? null : s.top_creators[0];
  const hashtag = isSectionError(s.top_hashtags) ? null : s.top_hashtags[0];

  return [
    [copy.rows.topCreator, creator ? `@${creator.creator}` : none],
    [copy.rows.topHashtag, hashtag ? `#${hashtag.hashtag}` : none],
    [copy.rows.watchTime, watch && watch.total_hours > 0 ? formatHours(watch.total_hours) : none],
    [copy.rows.busiestDay, watch?.busiest_day?.weekday ?? none],
    [copy.rows.binge, binge ? formatMinutes(binge.minutes) : none],
    [copy.rows.loyalty, loyalty && loyalty.label !== 'Unknown' ? loyalty.label : none],
    [copy.rows.club, isSectionError(s.club) ? none : s.club.club],
  ];
}

/** Last page: the highlights of every earlier page on one shareable card. */
export default async function SharePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  return (
    <SnapshotPage name={name} step="share" title={copy.title} subtitle={copy.subtitle}>
      <ShareCard name={name} range={weekRange(snapshot)} rows={cardRows(snapshot)} />
    </SnapshotPage>
  );
}
