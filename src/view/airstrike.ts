import type Phaser from "phaser";
import { TUNING } from "../sim/data";
import type { Side } from "../sim/battle";
import type { Point } from "../sim/geometry";
export function airstrikePhase(remaining: number) {
  return remaining > 1.8
    ? "approach"
    : remaining > 0
      ? "bombs"
      : remaining > -TUNING.airstrikeAftermath
        ? "impact"
        : "finished";
}
// All animation uses simulation time, so pausing freezes aircraft, bombs and smoke.
export function drawAirstrike(
  g: Phaser.GameObjects.Graphics,
  p: Point,
  remaining: number,
  side: Side,
) {
  const phase = airstrikePhase(remaining);
  if (phase === "finished") return;
  const elapsed = TUNING.airstrikeWarning - remaining,
    direction = side === 0 ? 1 : -1;
  const radius = TUNING.airstrikeRadius,
    color = side === 0 ? 0xffcd55 : 0xff6347;
  if (remaining > 0) {
    g.fillStyle(color, 0.13 + 0.05 * Math.sin(elapsed * 9));
    g.fillEllipse(p.x, p.y, radius * 2, radius * 1.48);
    g.lineStyle(4, color, 0.95);
    g.strokeEllipse(p.x, p.y, radius * 2, radius * 1.48);
    g.lineStyle(2, 0xfff0c3, 0.9);
    g.strokeEllipse(p.x, p.y, radius * 1.7, radius * 1.26);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.lineBetween(
        p.x + Math.cos(a) * radius * 0.87,
        p.y + Math.sin(a) * radius * 0.64,
        p.x + Math.cos(a) * radius * 1.07,
        p.y + Math.sin(a) * radius * 0.79,
      );
    }
    g.lineBetween(p.x - 19, p.y, p.x + 19, p.y);
    g.lineBetween(p.x, p.y - 14, p.x, p.y + 14);
  }
  const planeX = p.x + direction * (elapsed - 2.7) * 300,
    planeY = Math.max(165, Math.min(345, p.y - 180));
  if (remaining > -0.7) {
    // Four engine bomber with swept wings, canopy, tail and team markings.
    g.lineStyle(5, 0xf7edce, 0.25);
    for (const off of [-29, 29])
      g.lineBetween(
        planeX - direction * 140,
        planeY + off,
        planeX - direction * 58,
        planeY + off,
      );
    const points = [
      [-74, -7],
      [-38, -14],
      [-20, -61],
      [5, -61],
      [1, -13],
      [55, -8],
      [73, 0],
      [55, 8],
      [1, 13],
      [5, 61],
      [-20, 61],
      [-38, 14],
      [-74, 7],
      [-88, 29],
      [-98, 29],
      [-94, 0],
      [-98, -29],
      [-88, -29],
    ].map(([x, y]) => ({ x: planeX + x * direction, y: planeY + y }));
    g.fillStyle(0x1d302d);
    g.fillPoints(points, true);
    g.lineStyle(3, 0xf3e4b2);
    g.strokePoints(points, true);
    g.fillStyle(side === 0 ? 0x6e9c78 : 0xb46c55);
    g.fillRoundedRect(planeX - 30, planeY - 7, 79, 14, 5);
    g.fillStyle(0xbfe7e1);
    g.fillEllipse(planeX + direction * 45, planeY, 19, 10);
    g.fillStyle(0xe7ca77);
    g.fillCircle(planeX - 15, planeY - 34, 6);
    g.fillCircle(planeX - 15, planeY + 34, 6);
    g.fillStyle(0x253b34);
    for (const off of [-42, -24, 24, 42]) {
      g.fillRoundedRect(planeX - 15, planeY + off - 4, 30, 8, 3);
      g.lineStyle(2, 0xf8edc8, 0.8);
      g.lineBetween(
        planeX + direction * 18,
        planeY + off - 10,
        planeX + direction * 18,
        planeY + off + 10,
      );
    }
  }
  if (remaining > 0) {
    for (let i = 0; i < 5; i++) {
      const release = 1.8 - i * 0.12;
      if (remaining > release) continue;
      const t = 1 - remaining / release,
        ground = { x: p.x + (i - 2) * 32, y: p.y + ((i % 2) * 2 - 1) * 19 };
      const launchX = p.x + direction * i * 36;
      const x = launchX + (ground.x - launchX) * t,
        y = planeY + (ground.y - planeY) * t * t;
      g.fillStyle(0x263c32, 0.2 + t * 0.2);
      g.fillEllipse(ground.x, ground.y, 20 + 12 * t, 9 + 5 * t);
      g.lineStyle(3, 0xffedbf, 0.6);
      g.lineBetween(x, y - 42, x, y - 16);
      g.fillStyle(0x1d2c2c);
      g.fillEllipse(x, y, 15, 29);
      g.lineStyle(2, 0xffe395);
      g.strokeEllipse(x, y, 15, 29);
      g.fillStyle(0xe6b44e);
      g.fillRect(x - 6, y - 3, 12, 6);
      g.fillTriangle(x - 11, y - 19, x + 11, y - 19, x, y - 9);
    }
  } else {
    const age = -remaining,
      fade = Math.max(0, 1 - age / TUNING.airstrikeAftermath);
    g.lineStyle(6, 0xffd771, Math.max(0, 1 - age));
    g.strokeEllipse(p.x, p.y, radius * (1 + age), radius * 0.74 * (1 + age));
    g.fillStyle(0x3a382d, 0.45 * fade);
    g.fillEllipse(p.x, p.y, 185, 125);
    for (let i = 0; i < 5; i++) {
      const x = p.x + (i - 2) * 32,
        y = p.y + ((i % 2) * 2 - 1) * 19;
      const size = (26 + Math.sin(i * 2 + age * 14) * 7) * (1 + age * 0.3);
      if (age < 0.9) {
        g.fillStyle(0xef6732, fade);
        g.fillCircle(x, y - 13 - age * 15, size);
        g.fillStyle(0xffd676, fade);
        g.fillCircle(x, y - 18 - age * 15, size * 0.62);
      }
      g.fillStyle(0x37443b, 0.65 * fade);
      g.fillCircle(
        x + Math.sin(i + age) * 12,
        y - 45 - age * 38,
        19 + age * 13,
      );
    }
    if (age < 0.16) {
      g.fillStyle(0xfff0b8, 0.65 * (1 - age / 0.16));
      g.fillEllipse(p.x, p.y, 230, 170);
    }
  }
}
