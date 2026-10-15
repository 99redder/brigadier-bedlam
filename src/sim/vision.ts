import type { Point } from "./geometry";
export const VIEW_ARC = (Math.PI * 2) / 3;
export type Oriented = Point & { facing: number; heading?: number };
export const headingOf = (unit: Oriented) => unit.heading ?? (unit.facing < 0 ? Math.PI : 0);
export function inView(unit: Oriented, point: Point) {
  const dx = point.x - unit.x, dy = point.y - unit.y;
  const d = Math.hypot(dx, dy);
  return d < 1e-8 || (dx * Math.cos(headingOf(unit)) + dy * Math.sin(headingOf(unit))) / d >= Math.cos(VIEW_ARC / 2) - 1e-9;
}
