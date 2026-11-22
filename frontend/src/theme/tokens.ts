/**
 * Insta Snapshot design tokens — the single source of truth for the visual
 * system. Components never hard-code colors, sizes or radii; they read these
 * through the Mantine theme (theme.ts) or the CSS variables it emits
 * (--snapshot-*). See CLAUDE.md before adding anything here.
 */
import type { MantineColorsTuple } from '@mantine/core';

/* ---------------------------------------------------------------- Color --
 * A cinema palette:
 *   theatre — deep red: the solid page background, and red text on white
 *   paper   — pure white: all text on the page, the film's frames
 *   ink     — deep black: the film's edges and the clapperboard
 * Lines on red are white at an alpha, never new hues.
 * Shade index 0 is lightest, 9 darkest (Mantine convention).
 */
export const palette = {
  theatre: '#5C0A14',
  paper: '#FFFFFF',
  added: '#4ADE80', // status green: an upload file that's been added (only use)
  gold: '#F5C542', // the peak of a chart (busiest day): 12.2:1 on ink, 8.6:1 on theatre.8
  ink: '#0B0A09',
} as const;

export const theatre: MantineColorsTuple = [
  '#FBE9EB',
  '#F2C9CD',
  '#E39BA2',
  '#D16B76',
  '#BF4352',
  '#A82535',
  '#8A1626',
  '#6E0F1C',
  '#5C0A14',
  '#3F060D',
];

export const ink: MantineColorsTuple = [
  '#F2F1EF',
  '#DAD8D5',
  '#BDBAB5',
  '#9B9791',
  '#77736D',
  '#56534E',
  '#3A3835',
  '#24221F',
  '#161513',
  '#0B0A09',
];

/** Semantic roles. Prefer these names in components over raw values. */
export const color = {
  background: palette.theatre, // solid deep red page background (Mantine `white`)
  text: palette.paper, // white: 13.9:1 on the deep red
  // Secondary text is white too; use size/weight for hierarchy.
  textMuted: palette.paper,
  border: 'rgb(255 255 255 / 0.4)', // hairlines and dividers (decorative)
  borderStrong: palette.paper, // placeholder outlines — UI boundaries, full white
  filmEdge: palette.ink, // film edges, gaps between frames, clapperboard
  filmFrame: palette.paper, // film frame windows, sprocket holes
  textOnFilm: palette.theatre, // copy set on the film's white frames; 13.9:1
  // "Light" pages (the upload page): white background, black text, dark red
  // for the dashed drop-zone border and button outline. Ink on white 19.8:1;
  // theatre red on white 13.9:1.
  lightBackground: palette.paper,
  lightText: palette.ink,
  lightAccent: palette.theatre,
  // Error messages on light pages: a clearly red shade of the theatre scale,
  // 7.0:1 on white. Only for problems the user must fix.
  lightError: theatre[5],
  // Landing page sections below the film, each one step lighter than the
  // last (shades of the theatre scale, never new hues). White text:
  // 12.0:1 on band 1, 9.4:1 on band 2.
  band1: theatre[7], // #6E0F1C — Description
  band2: theatre[6], // #8A1626 — What's in your snapshot
  // A file name on the upload page once that file is in: green fill, ink text.
  // 8.0:1 against the deep red; ink on it 11.4:1. Status only — never decoration.
  added: palette.added,
  // The one standout data point in a chart (the busiest day's column). Highlight only.
  peak: palette.gold,
  // Giant faint word behind each snapshot scene ("#f1", "Sporty"). Decorative.
  watermark: 'rgb(255 255 255 / 0.07)',
} as const;

/*
 * Snapshot scenes: each page of /snapshot/<name>/… has its own solid
 * background, so moving between them feels like a new scene. All from the
 * theatre and ink scales; white text on each (contrast): theatre.8 13.9:1,
 * theatre.6 9.4:1, ink 19.8:1, theatre.9 16.9:1, theatre.7 12.0:1,
 * theatre.5 7.0:1. Don't go lighter than theatre.5 behind white text.
 */
export const scene = {
  'top-creators': theatre[8],
  'top-hashtags': theatre[6],
  'watch-time': palette.ink,
  binge: theatre[9],
  loyalty: theatre[7],
  club: theatre[5],
  recommendations: theatre[6],
  credits: palette.ink,
  share: theatre[8],
} as const;

/* ----------------------------------------------------------- Typography --
 * One family: Instrument Sans (loaded in app/fonts.ts). Hierarchy comes from
 * size and weight, never from a second typeface.
 */
export const fontFamily = 'var(--font-instrument-sans), system-ui, sans-serif';

export const fontSize = {
  xs: '0.75rem', // 12 — fine print
  sm: '0.875rem', // 14 — labels, meta
  md: '1rem', // 16 — body
  lg: '1.25rem', // 20 — lead text
  xl: '1.5rem', // 24 — section headings
  display: 'clamp(3.5rem, 12vw, 9.5rem)', // hero title only
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

export const lineHeight = {
  display: '0.92',
  heading: '1.2',
  body: '1.55',
} as const;

export const letterSpacing = {
  display: '-0.045em',
  heading: '-0.015em',
  body: '0',
} as const;

/* -------------------------------------------------------------- Spacing --
 * 4px base. Component spacing uses xs–xl; page rhythm uses the layout steps.
 */
export const spacing = {
  xs: '0.25rem', // 4
  sm: '0.5rem', // 8
  md: '1rem', // 16
  lg: '1.5rem', // 24
  xl: '2.5rem', // 40
} as const;

export const layout = {
  section: '4rem', // 64 — between sections
  page: '6rem', // 96 — top/bottom of major page areas
  containerWidth: '72rem', // 1152 — max content width
  headerHeight: '4rem', // 64
} as const;

/* --------------------------------------------------------------- Radius --
 * One radius for everything that has corners: 4px. Full-bleed layout
 * regions and dividers are square (0). No pills, no large rounded cards.
 */
export const radius = {
  base: '4px',
  none: '0',
} as const;

/* ---------------------------------------------------------------- Lines --
 * Structure comes from 1px rules, not shadows. Shadows are disabled.
 */
export const border = {
  hairline: `1px solid ${color.border}`,
  placeholder: `1px dashed ${color.borderStrong}`,
} as const;

/* --------------------------------------------------------------- Motion --
 * Motion is reserved for the film motif (intro clapperboard + film strip).
 * Everything else stays still. All of it is disabled under
 * prefers-reduced-motion.
 */
export const motion = {
  easeOut: 'cubic-bezier(0.2, 0.8, 0.2, 1)', // entrances
  easeIn: 'cubic-bezier(0.6, 0, 0.9, 0.3)', // the clapper stick snapping shut
  easeInOut: 'cubic-bezier(0.7, 0, 0.2, 1)', // the clapperboard lifting away
  filmFrameDuration: '3s', // time for the film to advance one frame
  hoverDuration: '0.15s', // square buttons lighting up on hover
  hoverScale: '1.06', // ...and growing slightly
  sceneWipe: '0.55s', // film sweeping over the screen between snapshot scenes (each half)
  sceneFade: '0.6s', // a scene's background color easing into the next
  sceneStagger: '0.12s', // gap between a scene's title, subtitle, content, links appearing
} as const;

/* ----------------------------------------------------------------- Film --
 * The film running behind the hero: ink edges with paper sprocket holes,
 * paper frames separated by ink gaps. Fixed pixel geometry; the film is as
 * tall as the hero, so frames stretch vertically (like a reel's portrait
 * frames). framePeriod must be a multiple of sprocketPeriod so the loop is
 * seamless.
 */
export const film = {
  edge: '44px', // height of each sprocket edge
  framePeriod: '200px', // one frame + one gap; the loop shifts by this much
  frameGap: '16px', // ink gap between frames
  frameInset: '8px', // ink margin between a frame and the sprocket edges
  sprocketPeriod: 40, // px between sprocket holes (5 per frame)
  sprocketHole: { width: 20, height: 24 }, // px, square corners
} as const;
