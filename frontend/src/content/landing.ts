import type { SnapshotStep } from '@/lib/snapshotSequence';

/**
 * Landing page copy. Every line must describe something the app really does.
 *
 * Below the film the page runs like a night at the movies: the plot (what it
 * is), what's showing (one poster card per snapshot scene), how to get in
 * (three ticket steps), then a lit marquee with the way in.
 */
export interface LandingItem {
  name: string;
  detail: string;
}

/** A "Now showing" card: the snapshot scene it previews (its link, once you have a snapshot). */
export interface LandingScene extends LandingItem {
  step: SnapshotStep;
}

/** The way into the app: a gold ticket linking to the upload page. */
export const landingCta = { label: 'Get your snapshot', href: '/upload' } as const;

export const landingContent = {
  title: 'Insta Snapshot',
  /**
   * The billing block just under the film's bottom-left corner, like the
   * credits on a movie poster: a small role above each name.
   */
  credits: [
    { role: 'Created by', name: 'Arik Lee & Justin Pun' },
    { role: 'Inspired by', name: 'Spotify Wrapped' },
  ],

  plot: {
    eyebrow: 'The plot',
    heading: 'Your week on reels, as a movie',
    text: 'You scrolled. Instagram kept count. Insta Snapshot plays your last week of reels back like a short film about you: who you couldn’t stop watching, how long you really scrolled, and what your feed says about you.',
  },

  showing: {
    eyebrow: 'Now showing',
    heading: 'Eight scenes, all about you',
    scenes: [
      { step: 'top-creators', name: 'Top creators', detail: 'The accounts you kept coming back to.' },
      { step: 'top-hashtags', name: 'Top hashtags', detail: 'What your feed was really about.' },
      { step: 'watch-time', name: 'Time on reels', detail: 'Your hours, your busiest day, and how far your thumb traveled.' },
      { step: 'binge', name: 'Longest binge', detail: 'Your most non-stop scroll of the week.' },
      { step: 'loyalty', name: 'Loyal or variety', detail: 'Creature of habit, or always on to the next creator?' },
      { step: 'club', name: 'Your club', detail: 'Sporty, Gamer, Brainrot, Nerd… or Hufflepuff, the all-rounder.' },
      { step: 'recommendations', name: 'For you', detail: 'New reels and accounts picked to match your taste.' },
      { step: 'credits', name: 'The credits', detail: 'Your week’s highlights rolled like the end of a movie, then on one card to share.' },
    ] satisfies LandingScene[],
  },

  steps: {
    eyebrow: 'How to get in',
    heading: 'Three steps to opening night',
    items: [
      { name: 'Download your data', detail: 'Request your Instagram information as JSON from your account settings.' },
      {
        name: 'Drop in three files',
        detail: 'liked_posts.json, saved_posts.json and videos_watched.json from that download.',
      },
      { name: 'Roll the film', detail: 'Watch your snapshot scene by scene, then save your share card.' },
    ] satisfies LandingItem[],
  },

  finale: {
    marquee: 'Your week, on the big screen',
    text: 'Three files in, one short film out.',
  },
};
