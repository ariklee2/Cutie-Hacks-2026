/**
 * The snapshot pages in order: /snapshot/<name>/<slug>. Each page links to
 * the one before and after it. Labels live in content/snapshot.ts.
 */
export const snapshotSequence = [
  'top-creators',
  'top-hashtags',
  'watch-time',
  'binge',
  'loyalty',
  'club',
  'credits',
  'share',
] as const;

export type SnapshotStep = (typeof snapshotSequence)[number];

export const snapshotHref = (name: string, step: SnapshotStep) => `/snapshot/${name}/${step}`;
