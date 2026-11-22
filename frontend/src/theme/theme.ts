/**
 * Mantine theme built entirely from tokens.ts. Also exposes the tokens Mantine
 * has no slot for (display type, layout spacing, lines, semantic colors) as
 * --snapshot-* CSS variables so CSS modules can use them.
 */
import { createTheme, type CSSVariablesResolver } from '@mantine/core';
import {
  border,
  color,
  film,
  motion,
  fontFamily,
  fontSize,
  fontWeight,
  ink,
  layout,
  letterSpacing,
  lineHeight,
  radius,
  spacing,
  theatre,
} from './tokens';

const allSizes = <T extends string>(value: T) =>
  ({ xs: value, sm: value, md: value, lg: value, xl: value }) as const;

export const theme = createTheme({
  colors: { ink, theatre },
  primaryColor: 'theatre',
  primaryShade: 8,
  // Mantine's light scheme paints the body with `white` and text with `black`;
  // here that means velvet red background and paper text.
  white: color.background,
  black: color.text,

  fontFamily,
  fontFamilyMonospace: fontFamily,
  fontSizes: {
    xs: fontSize.xs,
    sm: fontSize.sm,
    md: fontSize.md,
    lg: fontSize.lg,
    xl: fontSize.xl,
  },
  lineHeights: allSizes(lineHeight.body),
  headings: {
    fontFamily,
    fontWeight: fontWeight.semibold,
    textWrap: 'balance',
    sizes: {
      h1: { fontSize: fontSize.display, lineHeight: lineHeight.display },
      h2: { fontSize: fontSize.xl, lineHeight: lineHeight.heading },
      h3: { fontSize: fontSize.lg, lineHeight: lineHeight.heading },
      h4: { fontSize: fontSize.md, lineHeight: lineHeight.heading },
      h5: { fontSize: fontSize.sm, lineHeight: lineHeight.heading },
      h6: { fontSize: fontSize.xs, lineHeight: lineHeight.heading },
    },
  },

  spacing,
  radius: allSizes(radius.base),
  defaultRadius: 'md',
  shadows: allSizes('none'),

  focusRing: 'auto',
  cursorType: 'pointer',

  // Text color comes from `black` above via the body; don't set `c` defaults on
  // Text/Title — Mantine applies them inline and they'd override CSS modules.
  components: {
    Container: { defaultProps: { size: layout.containerWidth, px: 'lg' } },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--snapshot-color-background': color.background,
    '--snapshot-color-text': color.text,
    '--snapshot-color-text-muted': color.textMuted,
    '--snapshot-color-border': color.border,
    '--snapshot-color-film-edge': color.filmEdge,
    '--snapshot-color-film-frame': color.filmFrame,
    '--snapshot-color-text-on-film': color.textOnFilm,
    '--snapshot-color-light-background': color.lightBackground,
    '--snapshot-color-light-text': color.lightText,
    '--snapshot-color-light-accent': color.lightAccent,
    '--snapshot-color-band-1': color.band1,
    '--snapshot-color-band-2': color.band2,
    '--snapshot-color-added': color.added,
    '--snapshot-font-size-display': fontSize.display,
    '--snapshot-line-height-display': lineHeight.display,
    '--snapshot-letter-spacing-display': letterSpacing.display,
    '--snapshot-letter-spacing-heading': letterSpacing.heading,
    '--snapshot-font-weight-medium': fontWeight.medium,
    '--snapshot-font-weight-semibold': fontWeight.semibold,
    '--snapshot-space-section': layout.section,
    '--snapshot-space-page': layout.page,
    '--snapshot-header-height': layout.headerHeight,
    '--snapshot-border-hairline': border.hairline,
    '--snapshot-border-placeholder': border.placeholder,
    '--snapshot-radius': radius.base,
    '--snapshot-ease-out': motion.easeOut,
    '--snapshot-ease-in': motion.easeIn,
    '--snapshot-ease-in-out': motion.easeInOut,
    '--snapshot-film-frame-duration': motion.filmFrameDuration,
    '--snapshot-hover-duration': motion.hoverDuration,
    '--snapshot-hover-scale': motion.hoverScale,
    '--snapshot-film-edge': film.edge,
    '--snapshot-film-frame-period': film.framePeriod,
    '--snapshot-film-frame-gap': film.frameGap,
    '--snapshot-film-frame-inset': film.frameInset,
  },
  light: {},
  dark: {},
});
