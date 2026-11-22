import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BarChart } from '@/components/snapshot/BarChart';
import { HeroStat } from '@/components/snapshot/HeroStat';
import { SnapshotMessage, SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError } from '@/lib/snapshotData';
import { formatPercent } from '@/lib/snapshotFormat';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.club;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** The user's club, why, and each club's share of their engagement. */
export default async function ClubPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const club = snapshot.club;

  if (isSectionError(club)) {
    return (
      <SnapshotPage name={name} step="club" title={copy.title} subtitle={copy.subtitle}>
        <SnapshotMessage>{copy.failed}</SnapshotMessage>
      </SnapshotPage>
    );
  }

  const shares = club.shares.filter((s) => s.share > 0);
  const lead = club.club === 'Hufflepuff' ? null : club.shares.find((s) => s.club === club.club);

  return (
    <SnapshotPage name={name} step="club" title={copy.title} subtitle={copy.subtitle}>
      <HeroStat value={club.club}>
        <p>{lead ? copy.lead(formatPercent(lead.share), club.club) : copy.hufflepuff}</p>
      </HeroStat>

      {shares.length > 0 && (
        <BarChart
          label={copy.chartLabel}
          columns={[copy.columnClub, copy.columnShare]}
          rows={shares.map((s) => ({
            key: s.club,
            label: s.club,
            value: s.share,
            valueText: formatPercent(s.share),
            detail: copy.detail(formatPercent(s.share)),
          }))}
        />
      )}

      {club.reels_counted != null && club.reels_unclassified != null && (
        <p>{copy.counted(club.reels_counted, club.reels_unclassified)}</p>
      )}
    </SnapshotPage>
  );
}
