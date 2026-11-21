import { Instrument_Sans } from 'next/font/google';

/** The one typeface. Exposed as --font-instrument-sans for tokens.fontFamily. */
export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-instrument-sans',
});
