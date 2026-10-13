import type Phaser from "phaser";
import type { Shot } from "../sim/battle";
import { CLASSES } from "../sim/data";
import type { Point } from "../sim/geometry";
export function drawProjectile(
  g: Phaser.GameObjects.Graphics,
  shot: Shot,
  from: Point,
  to: Point,
) {
  const progress = Math.min(1, shot.time / shot.duration),
    w = CLASSES[shot.classId],
    x = from.x + (to.x - from.x) * progress,
    y =
      from.y +
      (to.y - from.y) * progress -
      32 -
      (w.arc ? Math.sin(progress * Math.PI) * 90 : 0),
    angle = w.arc
      ? progress * Math.PI * 2
      : Math.atan2(to.y - from.y, to.x - from.x);
  const at = (dx: number, dy: number) => ({
    x: x + Math.cos(angle) * dx - Math.sin(angle) * dy,
    y: y + Math.sin(angle) * dx + Math.cos(angle) * dy,
  });
  const polygon = (points: [number, number][], color: number) => {
    g.fillStyle(color);
    g.fillPoints(
      points.map(([dx, dy]) => at(dx, dy)),
      true,
    );
  };
  if (shot.classId === "rifleman") {
    g.lineStyle(3, 0xffe698, 0.95);
    const tail = at(-19, 0);
    g.lineBetween(tail.x, tail.y, x, y);
    polygon(
      [
        [-4, -2],
        [4, -2],
        [7, 0],
        [4, 2],
        [-4, 2],
      ],
      0xfff3ce,
    );
    g.fillStyle(0xd29b3d);
    g.fillRect(from.x - 10 + progress * 12, from.y - 24 + progress * 18, 4, 2);
  }
  if (shot.classId === "bazooka") {
    polygon(
      [
        [-14, -4],
        [8, -4],
        [16, 0],
        [8, 4],
        [-14, 4],
      ],
      0x394b37,
    );
    polygon(
      [
        [-5, -4],
        [7, -4],
        [7, 4],
        [-5, 4],
      ],
      0xb6c075,
    );
    polygon(
      [
        [-13, -4],
        [-18, -9],
        [-18, 9],
        [-13, 4],
      ],
      0x697e55,
    );
    polygon(
      [
        [-15, -3],
        [-32 - 8 * Math.sin(progress * 40), 0],
        [-15, 3],
      ],
      0xf09b43,
    );
    polygon(
      [
        [-15, -2],
        [-23, 0],
        [-15, 2],
      ],
      0xffe7a2,
    );
  }
  if (shot.classId === "lobber") {
    g.fillStyle(0x243c2d);
    g.fillCircle(x, y, 8);
    g.fillStyle(0x7baa4f);
    g.fillCircle(x, y, 6);
    g.lineStyle(2, 0xd1d791);
    g.lineBetween(x - 4, y, x + 4, y);
    const pin = at(0, -11);
    g.lineStyle(2, 0x384935);
    g.lineBetween(x, y - 6, pin.x, pin.y);
    g.fillStyle(0x5a633c, 0.2);
    g.fillEllipse(x, from.y + (to.y - from.y) * progress, 13, 6);
  }
  if (shot.classId === "sapper") {
    for (const dy of [-5, 0, 5])
      polygon(
        [
          [-8, dy - 2],
          [8, dy - 2],
          [8, dy + 2],
          [-8, dy + 2],
        ],
        0xe95545,
      );
    polygon(
      [
        [-2, -8],
        [2, -8],
        [2, 8],
        [-2, 8],
      ],
      0x303c36,
    );
    const fuse = at(13, -10);
    g.lineStyle(2, 0xf3d391);
    g.lineBetween(at(8, 0).x, at(8, 0).y, fuse.x, fuse.y);
    g.fillStyle(0xffed99);
    g.fillCircle(fuse.x, fuse.y, 3);
    g.lineStyle(2, 0xfbad5c);
    g.lineBetween(fuse.x - 5, fuse.y - 4, fuse.x + 5, fuse.y + 4);
    g.fillStyle(0x5a633c, 0.2);
    g.fillEllipse(x, from.y + (to.y - from.y) * progress, 19, 7);
  }
  if (shot.classId === "torch") {
    const dx = to.x - from.x,
      dy = to.y - from.y,
      d = Math.hypot(dx, dy) || 1,
      spread = 14 + progress * 17,
      muzzle = { x: from.x + (dx / d) * 25, y: from.y - 32 + (dy / d) * 25 },
      tip = {
        x: from.x + dx * Math.min(1, progress + 0.45),
        y: from.y - 32 + dy * Math.min(1, progress + 0.45),
      };
    g.fillStyle(0xe85d32, 0.65);
    g.fillTriangle(
      muzzle.x,
      muzzle.y,
      tip.x - (dy / d) * spread,
      tip.y + (dx / d) * spread,
      tip.x + (dy / d) * spread,
      tip.y - (dx / d) * spread,
    );
    for (let i = 0; i < 5; i++) {
      const f = (i + 1) / 5;
      g.fillStyle(i % 2 ? 0xffd064 : 0xf79842, 0.8);
      g.fillCircle(
        muzzle.x + (tip.x - muzzle.x) * f,
        muzzle.y + (tip.y - muzzle.y) * f,
        5 + f * 9 + Math.sin(progress * 30 + i) * 3,
      );
    }
    g.fillStyle(0xffefd2, 0.9);
    g.fillCircle(muzzle.x, muzzle.y, 5);
  }
}
