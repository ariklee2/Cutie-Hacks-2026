import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BarChart } from '@/components/snapshot/BarChart';
import { HeroStat } from '@/components/snapshot/HeroStat';
import { SnapshotMessage, SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { StatList } from '@/components/snapshot/StatList';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError } from '@/lib/snapshotData';
import { formatMinutes, formatMoment, snapshotTimezone } from '@/lib/snapshotFormat';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.binge;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** The longest non-stop scrolling session, then the runners-up as bars. */
export default async function BingePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const binge = snapshot.binge_sessions;
  const tz = snapshotTimezone(snapshot);

  if (isSectionError(binge) || binge.longest.length === 0) {
    return (
      <SnapshotPage name={name} step="binge" title={copy.title} subtitle={copy.subtitle}>
        <SnapshotMessage>{isSectionError(binge) ? copy.failed : copy.empty}</SnapshotMessage>
      </SnapshotPage>
    );
  }

  const [top] = binge.longest;
  const start = formatMoment(top.start, tz);
  const end = formatMoment(top.end, tz);

  return (
    <SnapshotPage
      name={name}
      step="binge"
      title={copy.title}
      subtitle={copy.subtitle}
      backdrop={formatMinutes(top.minutes)}
    >
      <HeroStat value={formatMinutes(top.minutes)}>
        <p>{copy.longestLabel(start.day, start.time, end.time)}</p>
        <p>{copy.longestReels(top.reels)}</p>
      </HeroStat>

      <StatList
        stats={[
          { value: binge.count.toLocaleString(), label: copy.stats.sessions },
          ...(binge.median_minutes != null
            ? [{ value: formatMinutes(binge.median_minutes), label: copy.stats.median }]
            : []),
        ]}
      />

      {binge.longest.length > 1 && (
        <BarChart
          label={copy.chartLabel}
          columns={[copy.columnSession, copy.columnLength]}
          rows={binge.longest.map((s) => {
            const m = formatMoment(s.start, tz);
            return {
              key: s.start,
              label: `${m.day}, ${m.time}`,
              value: s.minutes,
              valueText: formatMinutes(s.minutes),
              detail: copy.detail(formatMinutes(s.minutes), s.reels),
            };
          })}
        />
      )}
    </SnapshotPage>
  );
}
