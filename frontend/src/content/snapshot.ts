/** Copy for the snapshot sequence pages (/snapshot/<name>/...). */
export const snapshotContent = {
  topCreators: {
    title: 'Your top creators',
    /** `range` like "Nov 14 – Nov 20", or null when the dates are unknown. */
    subtitle: (range: string | null) =>
      `Reels you watched for 3 seconds or more, ${range ?? 'this past week'}.`,
    chartLabel: 'Reels watched per account',
    columnAccount: 'Account',
    columnReels: 'Reels watched',
    /** Tooltip / accessible value. */
    reels: (n: number) => `${n.toLocaleString()} ${n === 1 ? 'reel' : 'reels'} watched`,
    empty: "No reels were watched long enough this week to rank creators.",
    failed: "Your top creators couldn't be worked out from your files.",
  },
};
