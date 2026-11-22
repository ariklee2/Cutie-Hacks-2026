/** The week's highlights, one per earlier scene, for the credits roll and the share card. */
import { clubLabel } from '@/content/snapshot';
import { isSectionError, type SnapshotData } from '@/lib/snapshotData';
import { formatHours, formatMinutes } from '@/lib/snapshotFormat';

export type HighlightKey = 'topCreator' | 'topHashtag' | 'watchTime' | 'busiestDay' | 'binge' | 'loyalty' | 'club';

/** Value per highlight, or null when that section failed or is empty. */
export function snapshotHighlights(s: SnapshotData): { key: HighlightKey; value: string | null }[] {
  const watch = isSectionError(s.watch_time) ? null : s.watch_time;
  const binge = isSectionError(s.binge_sessions) ? null : s.binge_sessions.longest[0];
  const loyalty = isSectionError(s.loyal_or_variety) ? null : s.loyal_or_variety;
  const creator = isSectionError(s.top_creators) ? null : s.top_creators[0];
  const hashtag = isSectionError(s.top_hashtags) ? null : s.top_hashtags[0];

  return [
    { key: 'topCreator', value: creator ? `@${creator.creator}` : null },
    { key: 'topHashtag', value: hashtag ? `#${hashtag.hashtag}` : null },
    { key: 'watchTime', value: watch && watch.total_hours > 0 ? formatHours(watch.total_hours) : null },
    { key: 'busiestDay', value: watch?.busiest_day?.weekday ?? null },
    { key: 'binge', value: binge ? formatMinutes(binge.minutes) : null },
    { key: 'loyalty', value: loyalty && loyalty.label !== 'Unknown' ? loyalty.label : null },
    { key: 'club', value: isSectionError(s.club) ? null : clubLabel(s.club.club) },
  ];
}
