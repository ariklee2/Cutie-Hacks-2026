/**
 * SVG art for the film motif, built from design tokens so no colors are
 * hard-coded in CSS.
 */
import { color, film } from '@/theme/tokens';

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/**
 * One sprocket hole, centered in a tile one sprocket period wide and one film
 * edge tall. Transparent around the hole so the ink film edge shows through.
 */
export function sprocketTile(): string {
  const w = film.sprocketPeriod;
  const h = parseFloat(film.edge);
  const { width, height } = film.sprocketHole;
  return svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
      `<rect x='${(w - width) / 2}' y='${(h - height) / 2}' width='${width}' height='${height}' ` +
      `fill='${color.filmFrame}'/></svg>`,
  );
}
