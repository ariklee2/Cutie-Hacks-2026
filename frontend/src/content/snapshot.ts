/** Copy for the snapshot sequence pages (/snapshot/<name>/...). */
import type { SnapshotStep } from '@/lib/snapshotSequence';

const reels = (n: number) => `${n.toLocaleString()} ${n === 1 ? 'reel' : 'reels'}`;

export const snapshotContent = {
  /** Short page names for the previous / next links at the bottom of each page. */
  steps: {
    'top-creators': 'Top creators',
    'top-hashtags': 'Top hashtags',
    'watch-time': 'Time on reels',
    binge: 'Longest binge',
    loyalty: 'Loyal or variety',
    club: 'Your club',
    recommendations: 'For you',
    share: 'Share card',
  } satisfies Record<SnapshotStep, string>,
  sequence: {
    label: 'Snapshot pages',
    previous: 'Back',
    next: 'Next',
    /** Shown on the last page, back to the start. */
    restart: 'Start over',
    /** Between the Back and Next links; the arrow keys do the same. */
    keysHint: 'Use ← → to move between pages',
  },

  chart: {
    showTable: 'View as table',
    hideTable: 'Hide table',
  },

  topCreators: {
    title: 'Your top creators',
    /** `range` like "Nov 14 – Nov 20", or null when the dates are unknown. */
    subtitle: (range: string | null) =>
      `Reels you watched for 3 seconds or more, ${range ?? 'this past week'}.`,
    chartLabel: 'Reels watched per account',
    columnAccount: 'Account',
    columnReels: 'Reels watched',
    /** Tooltip / accessible value. */
    reels: (n: number) => `${reels(n)} watched`,
    empty: 'No reels were watched long enough this week to rank creators.',
    failed: "Your top creators couldn't be worked out from your files.",
  },

  topHashtags: {
    title: 'Your top hashtags',
    subtitle: (range: string | null) =>
      `The hashtags on the reels you watched for 3 seconds or more, ${range ?? 'this past week'}.`,
    chartLabel: 'Reels watched per hashtag',
    columnHashtag: 'Hashtag',
    columnReels: 'Reels watched',
    reels: (n: number) => `${reels(n)} watched`,
    empty: 'None of the reels you watched this week had hashtags.',
    failed: "Your top hashtags couldn't be worked out from your files.",
  },

  watchTime: {
    title: 'Your time on reels',
    subtitle: (range: string | null) => `Time spent watching reels, ${range ?? 'this past week'}.`,
    totalLabel: 'in total this week',
    busiestDay: (weekday: string, time: string) => `${weekday} was your busiest day, with ${time} of reels.`,
    chartLabel: 'Time watching reels per day',
    columnDay: 'Day',
    columnTime: 'Time watched',
    detail: (time: string, reelCount?: number) =>
      reelCount == null ? `${time} watching reels` : `${time} watching ${reels(reelCount)}`,
    stats: {
      inches: (reelCount: number, perReel: number) =>
        `inches scrolled (${reels(reelCount)}, about ${perReel} in of screen each)`,
      miles: 'miles your thumb traveled',
      reelsPerDay: 'reels a day on average',
      timePerDay: 'on reels a day on average',
    },
    note: 'Times are estimates and lean slightly low: the last reel before each break has no watch time.',
    empty: 'No watch time was recorded this week.',
    failed: "Your watch time couldn't be worked out from your files.",
  },

  binge: {
    title: 'Your longest binge',
    subtitle: 'A binge is non-stop scrolling: each reel starting within 2 minutes of the last.',
    longestLabel: (day: string, start: string, end: string) => `${day}, ${start} to ${end}`,
    longestReels: (n: number) => `${reels(n)} back to back`,
    chartLabel: 'Your longest binge sessions',
    columnSession: 'Session',
    columnLength: 'Length',
    detail: (time: string, n: number) => `${time}, ${reels(n)}`,
    stats: {
      sessions: 'scrolling sessions this week',
      median: 'a typical session',
    },
    empty: 'No binge sessions this week: you never watched two reels in a row.',
    failed: "Your binge sessions couldn't be worked out from your files.",
  },

  loyalty: {
    title: 'Loyal or variety?',
    subtitle:
      'Do you keep coming back to the same creators, or spread your time across lots of new ones?',
    verdict: {
      Loyal: 'You’re Loyal',
      Variety: 'You’re a Variety watcher',
      Unknown: 'Not enough to tell',
    },
    explain: {
      Loyal: 'You keep coming back to the same creators.',
      Variety: 'You spread your attention across lots of different creators.',
      Unknown: 'You didn’t engage with enough reels this week to tell.',
    },
    meterLabel: 'Loyalty score',
    meterEnds: ['Variety', 'Loyal'] as const,
    score: (n: number) => `Loyalty score: ${n} out of 100`,
    threshold: '50+ is Loyal',
    stats: {
      creators: 'different creators you engaged with',
      oneTime: 'of them you saw only once',
      top5: 'of your engagement went to your top 5',
      repeat: 'of your engagement went to creators you came back to 3+ times',
    },
    method:
      'Engagement points: watching a reel for 3+ seconds is 1, a like is 2, a save is 3.',
    failed: "Whether you're loyal couldn't be worked out from your files.",
  },

  club: {
    title: 'Your club',
    subtitle: 'Based on what the reels you watched, liked and saved were about.',
    hufflepuff: 'No single topic clearly won, so you’re an all-rounder.',
    lead: (pct: string, club: string) => `${pct} of your engagement went to ${club} reels, more than any other club.`,
    chartLabel: 'Share of your engagement per club',
    columnClub: 'Club',
    columnShare: 'Share',
    detail: (pct: string) => `${pct} of your engagement`,
    counted: (counted: number, unclassified: number) =>
      `${reels(counted)} matched a club; ${reels(unclassified)} didn’t fit any.`,
    failed: "Your club couldn't be worked out from your files.",
  },

  recommendations: {
    title: 'Recommended for you',
    subtitle:
      'Reels and accounts you haven’t seen yet, picked to match the reels you liked, saved and watched for a while.',
    basedOn: (tags: string[]) => `Based on what you engage with most: ${tags.map((t) => `#${t}`).join(', ')}.`,
    reelsHeading: 'Reels',
    profilesHeading: 'Accounts',
    openReel: 'Watch on Instagram',
    openProfile: 'View on Instagram',
    by: (creator: string) => `@${creator}`,
    matchingReels: (n: number) => `${reels(n)} matching your taste`,
    noCaption: 'No caption',
    noneFound: 'Nothing new matched your taste closely enough this time.',
    /** Not generated yet for this name. */
    missing: 'Your recommendations haven’t been found yet.',
    find: 'Find recommendations',
    finding: 'Finding recommendations…',
    cost: 'This searches Instagram for new reels (via Apify) and takes up to a minute.',
    failed: (reason: string) => reason,
  },

  share: {
    title: 'Your snapshot',
    subtitle: 'Everything from your week, on one card.',
    cardTitle: 'Insta Snapshot',
    rows: {
      topCreator: 'Top creator',
      topHashtag: 'Top hashtag',
      watchTime: 'Time on reels',
      busiestDay: 'Busiest day',
      binge: 'Longest binge',
      loyalty: 'Loyal or variety',
      club: 'Club',
    },
    unavailable: '—',
    shareButton: 'Share',
    copyButton: 'Copy text',
    copied: 'Copied',
    copyFailed: 'Couldn’t copy. Select the card text instead.',
    /** Plain-text version for sharing / the clipboard. */
    text: (title: string, range: string | null, lines: [string, string][]) =>
      [`My ${title}${range ? ` (${range})` : ''}`, ...lines.map(([k, v]) => `${k}: ${v}`)].join('\n'),
  },
};
