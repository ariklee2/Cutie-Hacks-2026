import { Anton, Instrument_Sans } from 'next/font/google';

/** Body and UI type. Exposed as --font-instrument-sans for tokens.fontFamily. */
export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-instrument-sans',
});

/**
 * Poster type: a tall condensed face for the big moments only (titles, hero
 * numbers, ranks, posters, tickets). Exposed as --font-anton for
 * tokens.fontFamilyDisplay.
 */
export const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-anton',
});
