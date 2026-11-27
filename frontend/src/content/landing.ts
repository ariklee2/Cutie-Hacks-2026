import type { SnapshotStep } from '@/lib/snapshotSequence';

/**
 * Landing page copy. Every line must describe something the app really does.
 *
 * Below the film the page runs like a night at the movies: the plot (what it
 * is), how to export your data from Meta (numbered steps), what's showing
 * (one poster card per snapshot scene), how to get in (three ticket steps),
 * then a lit marquee with the way in.
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

  /**
   * Getting the data: Meta's export, step by step, ending at the upload box.
   * Meta renames these menus now and then; keep the wording close to theirs.
   */
  exportGuide: {
    eyebrow: 'Before the show',
    heading: 'Export your data from Meta',
    intro: 'Insta Snapshot works from the data Instagram keeps about you. Here’s how to get it:',
    steps: [
      { name: 'Open Accounts Center', detail: 'In Instagram, go to your profile, tap the menu (☰), then Accounts Center.' },
      {
        name: 'Export your information',
        detail: 'Choose Your information and permissions, then Export your information (or Download your information), and create an export for your Instagram account.',
      },
      {
        name: 'Pick what to include',
        detail: 'Choose Export to device, customize the information and select Likes, Saved and Ads information.',
      },
      { name: 'Choose JSON', detail: 'Set the date range to Last week (or longer) and the format to JSON, then start the export.' },
      {
        name: 'Download the .zip',
        detail: 'Meta lets you know when it’s ready, which can take a while. Download the .zip; there’s no need to unzip it.',
      },
      { name: 'Drop it in the box', detail: 'Open Get Snapshot and drop the .zip onto the upload box.' },
    ] satisfies LandingItem[],
    link: { label: 'Open Accounts Center', href: 'https://accountscenter.instagram.com/info_and_permissions/', newTab: 'opens in a new tab' },
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
      { name: 'Export your data', detail: 'Export your Instagram information from Meta as JSON (steps above).' },
      { name: 'Drop in the .zip', detail: 'Drop the whole download on the upload box; it finds the files it needs.' },
      { name: 'Roll the film', detail: 'Watch your snapshot scene by scene, then save your share card.' },
    ] satisfies LandingItem[],
  },

  finale: {
    marquee: 'Your week, on the big screen',
    text: 'One download in, one short film out.',
  },
};
