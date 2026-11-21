/**
 * Landing page copy. Each section renders as a labeled block below the film.
 * `content: null` renders a clearly marked placeholder; a string renders as text.
 */
export interface LandingSection {
  label: string;
  content: string | null;
}

export const landingContent: {
  title: string;
  sections: LandingSection[];
} = {
  title: 'Insta Snapshot',
  sections: [
    {
      label: 'Description',
      content: "A snapshot into your last week's reels",
    },
    {
      label: "What's in your snapshot",
      content:
        "Top Creators, Top Hashtags, Scrolling Length, Longest Binge, Loyal or Variety Watcher, Your Club",
    },
  ],
};
