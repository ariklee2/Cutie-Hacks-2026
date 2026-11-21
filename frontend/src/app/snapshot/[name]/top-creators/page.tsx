import { Container } from '@mantine/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TopCreatorsChart } from '@/components/snapshot/TopCreatorsChart';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError, type SnapshotData } from '@/lib/snapshotData';

import classes from './page.module.css';

export const dynamic = 'force-dynamic'; // reads data/<name>_snapshot.json per request

const copy = snapshotContent.topCreators;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** "Nov 14 – Nov 20" from the snapshot's per-day watch time, if available. */
function weekRange(snapshot: SnapshotData): string | null {
  const watch = snapshot.watch_time;
  if (isSectionError(watch) || watch.per_day.length === 0) return null;
  const fmt = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(watch.per_day[0].date)} – ${fmt(watch.per_day[watch.per_day.length - 1].date)}`;
}

/** First page of the snapshot sequence: top creators as a horizontal bar chart. */
export default async function TopCreatorsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const creators = snapshot.top_creators;

  return (
    <Container component="section" className={classes.page}>
      <h1 className={classes.title}>{copy.title}</h1>
      <p className={classes.subtitle}>{copy.subtitle(weekRange(snapshot))}</p>

      {isSectionError(creators) ? (
        <p className={classes.message}>{copy.failed}</p>
      ) : creators.length === 0 ? (
        <p className={classes.message}>{copy.empty}</p>
      ) : (
        <TopCreatorsChart creators={creators} />
      )}
    </Container>
  );
}
