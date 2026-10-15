import { FIELD, TUNING } from "./data";
import type { Point } from "./geometry";
export type AirstrikeAccuracy = "near" | "off" | "wild";
export const AIRSTRIKE_ACCURACY = {
  near: "CLOSE TO TARGET",
  off: "OFF TARGET",
  wild: "WAY OFF TARGET",
} as const;
// One seeded roll per call determines the whole bomber run, before its warning appears.
export function scatterAirstrike(requested: Point, random: () => number) {
  const roll = random();
  const accuracy: AirstrikeAccuracy = roll < 0.25 ? "near" : roll < 0.7 ? "off" : "wild";
  const [min, max] = accuracy === "near" ? [0, 35] : accuracy === "off" ? [80, 180] : [220, TUNING.airstrikeMaxScatter];
  const radius = min + random() * (max - min);
  const angle = random() * Math.PI * 2;
  return {
    requested: { x: requested.x, y: requested.y },
    accuracy,
    point: {
      x: Math.max(0, Math.min(FIELD.width, requested.x + Math.cos(angle) * radius)),
      y: Math.max(0, Math.min(FIELD.height, requested.y + Math.sin(angle) * radius)),
    },
  };
}
