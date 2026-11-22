/**
 * Landing page copy. Each section renders as a full-width band below the film:
 * a heading on the left, its content on the right. `content` is a paragraph
 * (string), a list of named items, or `null` for a clearly marked placeholder.
 * Every line must describe something the app really does.
 */
export interface LandingListItem {
  name: string;
  detail: string;
}

export interface LandingSection {
  label: string;
  content: string | LandingListItem[] | null;
}

export const landingContent: {
  title: string;
  sections: LandingSection[];
} = {
  title: 'Insta Snapshot',
  sections: [
    {
      label: 'Description',
      content:
        'You scrolled. Instagram kept count. Insta Snapshot plays your last week of reels back like a short film about you: who you couldn’t stop watching, how long you really scrolled, and what your feed says about you.',
    },
    {
      label: "What's in your snapshot",
      content: [
        { name: 'Top creators', detail: 'the accounts you kept coming back to.' },
        { name: 'Top hashtags', detail: 'what your feed was really about.' },
        { name: 'Time on reels', detail: 'your hours, your busiest day, and how far your thumb traveled.' },
        { name: 'Longest binge', detail: 'your most non-stop scroll of the week.' },
        { name: 'Loyal or variety', detail: 'creature of habit, or always on to the next creator?' },
        { name: 'Your club', detail: 'Sporty, Gamer, Brainrot, Nerd… or Hufflepuff, the all-rounder.' },
        { name: 'For you', detail: 'new reels and accounts picked to match your taste.' },
        { name: 'The credits', detail: 'your week’s highlights, rolled like the end of a movie, then on one card to share.' },
      ],
    },
  ],
};
