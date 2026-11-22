import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ColumnLineChart } from '@/components/snapshot/ColumnLineChart';
import { HeroStat } from '@/components/snapshot/HeroStat';
import { SnapshotMessage, SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { StatList } from '@/components/snapshot/StatList';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError } from '@/lib/snapshotData';
import { formatDate, formatHours, weekRange } from '@/lib/snapshotFormat';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.watchTime;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** Total time on reels this week, the busiest day, and a bar per day. */
export default async function WatchTimePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const watch = snapshot.watch_time;
  const days = isSectionError(watch) ? 1 : Math.max(watch.per_day.length, 1);

  return (
    <SnapshotPage name={name} step="watch-time" title={copy.title} subtitle={copy.subtitle(weekRange(snapshot))}>
      {isSectionError(watch) ? (
        <SnapshotMessage>{copy.failed}</SnapshotMessage>
      ) : watch.total_hours <= 0 ? (
        <SnapshotMessage>{copy.empty}</SnapshotMessage>
      ) : (
        <>
          <HeroStat value={formatHours(watch.total_hours)}>
            <p>{copy.totalLabel}</p>
            {watch.busiest_day && (
              <p>{copy.busiestDay(watch.busiest_day.weekday, formatHours(watch.busiest_day.hours))}</p>
            )}
          </HeroStat>
          <StatList
            stats={[
              ...(watch.total_reels != null && watch.scroll
                ? [
                    {
                      value: watch.scroll.inches.toLocaleString(),
                      label: copy.stats.inches(watch.total_reels, watch.scroll.inches_per_reel),
                    },
                    {
                      value: watch.scroll.miles.toLocaleString('en-US', { maximumFractionDigits: 2 }),
                      label: copy.stats.miles,
                    },
                  ]
                : []),
              ...(watch.total_reels != null
                ? [
                    { value: Math.round(watch.total_reels / days).toLocaleString(), label: copy.stats.reelsPerDay },
                  ]
                : []),
              { value: formatHours(watch.total_hours / days), label: copy.stats.timePerDay },
            ]}
          />
          <ColumnLineChart
            label={copy.chartLabel}
            columns={[copy.columnDay, copy.columnTime]}
            highlight={watch.busiest_day?.date}
            points={watch.per_day.map((d) => ({
              key: d.date,
              label: d.weekday.slice(0, 3),
              sublabel: formatDate(d.date),
              value: d.hours,
              valueText: formatHours(d.hours),
              detail: copy.detail(formatHours(d.hours), d.reels),
            }))}
          />
          <p>{copy.note}</p>
        </>
      )}
    </SnapshotPage>
  );
}
