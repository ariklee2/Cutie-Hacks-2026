/** Copy for the snapshot sequence pages (/snapshot/<name>/...). */
import type { SnapshotStep } from '@/lib/snapshotSequence';

/** An emoji per club (features/clubs.py CLUBS, plus Hufflepuff), shown after the club's name. */
export const clubEmoji: Record<string, string> = {
  Brainrot: '🤪',
  Nerd: '🤓',
  'Gym Bro': '💪',
  Sporty: '🏀',
  Looksmaxxer: '💅',
  Gamer: '🎮',
  News: '📰',
  Foodie: '🍔',
  Music: '🎵',
  Drama: '🎭',
  Travel: '✈️',
  Hufflepuff: '🦡',
};

/** "Sporty 🏀" — a club's name with its emoji (just the name for an unknown club). */
export const clubLabel = (club: string) => (clubEmoji[club] ? `${club} ${clubEmoji[club]}` : club);

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
    credits: 'The credits',
    share: 'Share card',
  } satisfies Record<SnapshotStep, string>,
  sequence: {
    label: 'Snapshot pages',
    previous: 'Back',
    next: 'Next',
    /** Shown on the last page, back to the start. */
    restart: 'Start over',
    /** Between the Back and Next links; the arrow keys do the same. */
    keysHint: 'Tap the sides or use ← →',
    /** Progress bar, for screen readers. */
    progress: (current: number, total: number) => `Scene ${current} of ${total}`,
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
    /** Average film length used for the comparison, in hours. */
    movieHours: 2,
    movies: (n: string) => `That’s about ${n} movies back to back.`,
    busiestDay: (weekday: string, time: string) => `${weekday} was your busiest day, with ${time} of reels.`,
    chartLabel: 'Time watching reels per day',
    columnDay: 'Day',
    columnTime: 'Time watched',
    detail: (time: string, reelCount?: number) =>
      reelCount == null ? `${time} watching reels` : `${time} watching ${reels(reelCount)}`,
    stats: {
      inches: (reelCount: number, perReel: number) =>
        `inches scrolled (${reels(reelCount)}, about ${perReel} in of screen each)`,
      miles: (fields: string | null) =>
        fields ? `miles your thumb traveled (about ${fields} football fields)` : 'miles your thumb traveled',
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
    prompt: 'So… which one are you?',
    revealLabel: 'Reveal the answer',
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
    prompt: 'And your club is…',
    revealLabel: 'Reveal your club',
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

  credits: {
    title: 'The credits',
    subtitle: 'Your week on reels, the movie.',
    /** Credit-roll role for each card row (same order as share.rows). */
    roles: {
      topCreator: 'Starring',
      topHashtag: 'Featuring',
      watchTime: 'Running time',
      busiestDay: 'Biggest screening',
      binge: 'Longest take',
      loyalty: 'Casting',
      club: 'Produced by the club',
    },
    directedBy: 'Directed by',
    theEnd: 'The End',
  },

  share: {
    title: 'Your snapshot',
    subtitle: 'Everything from your week, on one card.',
    cardTitle: 'Insta Snapshot',
    labels: {
      topCreators: 'Top Creators',
      topHashtags: 'Top Hashtags',
      reels: 'Reels Watched',
      club: 'Club',
    },
    /** Footer, right: the app's name. */
    footer: 'INSTA SNAPSHOT',
    /** Card color schemes, in carousel order (colors in theme/tokens.ts shareSchemes). */
    schemes: {
      classic: 'Classic',
      midnight: 'Midnight',
      cherry: 'Cherry',
      gold: 'Gold',
      mono: 'Mono',
    },
    schemesLabel: 'Card colors',
    previousScheme: 'Previous color',
    nextScheme: 'Next color',
    schemeOf: (name: string, i: number, n: number) => `${name}, ${i} of ${n}`,
    unavailable: '—',
    shareButton: 'Share',
    /** Webcam photo for the card's picture spot. It stays in the browser. */
    camera: {
      take: 'Take a photo',
      retake: 'Retake photo',
      snap: 'Snap',
      cancel: 'Cancel',
      remove: 'Remove photo',
      starting: 'Starting camera…',
      privacy: 'Your photo stays in this browser. It’s only on the card you save.',
      denied: 'Camera access was blocked. Allow it in your browser’s site settings, then try again.',
      unavailable: 'No camera was found, or this browser can’t use it here.',
      alt: (name: string) => `Photo of @${name}`,
    },
    saveButton: 'Save image',
    saving: 'Saving…',
    saveFailed: 'Couldn’t save the image. Try a screenshot instead.',
    copyButton: 'Copy text',
    copied: 'Copied',
    copyFailed: 'Couldn’t copy. Select the card text instead.',
    /** Plain-text version for sharing / the clipboard. */
    text: (title: string, year: number, range: string | null, sections: [string, string][]) =>
      [`My ${title} ${year}${range ? ` (${range})` : ''}`, ...sections.map(([k, v]) => `${k}: ${v}`)].join('\n'),
  },
};
