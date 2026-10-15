import type { Point } from "../sim/geometry";
// Rendering stays between the last two fixed simulation states. It never mutates them.
export function interpolatePoint(
  current: Point,
  previous: Point | undefined,
  alpha: number,
): Point {
  if (!previous) return { x: current.x, y: current.y };
  const t = Math.max(0, Math.min(1, alpha));
  return {
    x: previous.x + (current.x - previous.x) * t,
    y: previous.y + (current.y - previous.y) * t,
  };
}
