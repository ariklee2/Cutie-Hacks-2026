import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HeroStat } from '@/components/snapshot/HeroStat';
import { ScoreMeter } from '@/components/snapshot/ScoreMeter';
import { SnapshotMessage, SnapshotPage } from '@/components/snapshot/SnapshotPage';
import { StatList } from '@/components/snapshot/StatList';
import { SuspenseReveal } from '@/components/snapshot/SuspenseReveal';
import { snapshotContent } from '@/content/snapshot';
import { readSnapshot } from '@/lib/server/snapshotStore';
import { isSectionError } from '@/lib/snapshotData';
import { formatPercent } from '@/lib/snapshotFormat';

export const dynamic = 'force-dynamic';

const copy = snapshotContent.loyalty;
/** features/loyal_or_variety.py LOYAL_THRESHOLD. */
const LOYAL_THRESHOLD = 50;

export const metadata: Metadata = { title: `${copy.title} · Insta Snapshot` };

/** Loyal vs variety: the verdict, the 0–100 score on a meter, and what drove it. */
export default async function LoyaltyPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const snapshot = await readSnapshot(name);
  if (!snapshot) notFound();

  const loyalty = snapshot.loyal_or_variety;

  if (isSectionError(loyalty)) {
    return (
      <SnapshotPage name={name} step="loyalty" title={copy.title} subtitle={copy.subtitle}>
        <SnapshotMessage>{copy.failed}</SnapshotMessage>
      </SnapshotPage>
    );
  }

  const stats = [
    loyalty.creators != null && { value: loyalty.creators.toLocaleString(), label: copy.stats.creators },
    loyalty.one_time_creators != null && {
      value: loyalty.one_time_creators.toLocaleString(),
      label: copy.stats.oneTime,
    },
    loyalty.top5_share != null && { value: formatPercent(loyalty.top5_share), label: copy.stats.top5 },
    loyalty.repeat_share != null && { value: formatPercent(loyalty.repeat_share), label: copy.stats.repeat },
  ].filter((s): s is { value: string; label: string } => Boolean(s));

  return (
    <SnapshotPage name={name} step="loyalty" title={copy.title} subtitle={copy.subtitle} backdrop="?">
      <SuspenseReveal prompt={copy.prompt} revealLabel={copy.revealLabel}>
        <HeroStat value={copy.verdict[loyalty.label]}>
          <p>{copy.explain[loyalty.label]}</p>
          {loyalty.score != null && <p>{copy.score(loyalty.score)}</p>}
        </HeroStat>

        {loyalty.score != null && (
          <ScoreMeter
            score={loyalty.score}
            threshold={LOYAL_THRESHOLD}
            label={copy.meterLabel}
            valueText={copy.score(loyalty.score)}
            thresholdText={copy.threshold}
            ends={copy.meterEnds}
          />
        )}

        {stats.length > 0 && <StatList stats={stats} />}
        <p>{copy.method}</p>
      </SuspenseReveal>
    </SnapshotPage>
  );
}
