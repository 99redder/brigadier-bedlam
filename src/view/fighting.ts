import type { ClassId } from "../sim/data";
import { TUNING } from "../sim/data";
import type { Soldier } from "../sim/battle";
import { drawCharacter } from "./characters";
export type FightPose = "guard" | "punch" | "kick" | "block" | "hurt";
export const FIGHT_FRAMES: Record<FightPose, number> = {
  guard: 2,
  punch: 5,
  kick: 5,
  block: 2,
  hurt: 3,
};
export const fighterKey = (
  id: ClassId,
  side: number,
  pose: FightPose,
  frame: number,
) => `fighter-${id}-${side}-${pose}-${frame}`;
export function fightFrame(
  s: Soldier,
  time: number,
): { pose: FightPose; frame: number } {
  if (s.life === "down" || (s.recoilTime > 0 && !s.recoilBlocked))
    return {
      pose: "hurt",
      frame:
        s.life === "down"
          ? 2
          : Math.min(
              2,
              Math.floor((1 - s.recoilTime / TUNING.recoilAnimation) * 3),
            ),
    };
  if (s.blocking || (s.recoilTime > 0 && s.recoilBlocked))
    return { pose: "block", frame: Math.floor(time * 8) % 2 };
  if (s.fightMoveTime > 0 && s.fightMove) {
    const duration =
      s.fightMove === "kick" ? TUNING.kickAnimation : TUNING.punchAnimation;
    return {
      pose: s.fightMove,
      frame: Math.min(4, Math.floor((1 - s.fightMoveTime / duration) * 5)),
    };
  }
  return { pose: "guard", frame: Math.floor(time * 4) % 2 };
}
export function drawFighter(
  c: CanvasRenderingContext2D,
  id: ClassId,
  side: number,
  pose: FightPose,
  frame: number,
) {
  const stretch = [1, 0.9, 0.55, 0.15, 0][frame] ?? 0,
    kicking = pose === "kick" && frame < 4,
    ink = "#27362f";
  drawCharacter(c, id, side, true, kicking);
  const skin =
    id === "torch"
      ? "#776744"
      : id === "bazooka"
        ? "#b78058"
        : id === "lobber"
          ? "#edc69c"
          : "#d8b187";
  const limb = (points: [number, number][], width: number, color: string) => {
    c.lineCap = "round";
    c.lineJoin = "round";
    for (const [w, col] of [
      [width + 4, ink],
      [width, color],
    ] as [number, string][]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    }
  };
  const fist = (x: number, y: number) => {
    c.fillStyle = skin;
    c.strokeStyle = ink;
    c.lineWidth = 2.5;
    c.beginPath();
    c.roundRect(x - 6, y - 5, 13, 12, 4);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(x + 2, y - 4);
    c.lineTo(x + 2, y + 2);
    c.stroke();
  };
  if (pose === "block") {
    limb(
      [
        [23, 47],
        [29, 31],
        [39, 24],
      ],
      9,
      skin,
    );
    limb(
      [
        [53, 47],
        [55, 30],
        [49, 24],
      ],
      9,
      skin,
    );
    fist(39, 24);
    fist(49, 24);
    c.strokeStyle = "#dbe5bd";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(49, 28, 21, -1.0, 0.8);
    c.stroke();
  } else if (pose === "punch") {
    limb(
      [
        [24, 47],
        [31, 43],
        [43, 35],
      ],
      8,
      skin,
    );
    fist(43, 35);
    const x = 57 + stretch * 34,
      y = 43 - stretch * 10;
    limb(
      [
        [51, 45],
        [61 + stretch * 13, 46 - stretch * 9],
        [x, y],
      ],
      9,
      skin,
    );
    fist(x, y);
    if (stretch > 0.5) {
      c.strokeStyle = "#efe3be";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(68, 22);
      c.lineTo(83, 19);
      c.moveTo(70, 27);
      c.lineTo(89, 24);
      c.stroke();
    }
  } else if (pose === "kick") {
    limb(
      [
        [23, 47],
        [31, 40],
        [42, 32],
      ],
      8,
      skin,
    );
    fist(42, 32);
    limb(
      [
        [54, 45],
        [61, 41],
        [67, 33],
      ],
      8,
      skin,
    );
    fist(67, 33);
    if (kicking) {
      const x = 51 + stretch * 41,
        y = 75 - stretch * 23;
      limb(
        [
          [45, 67],
          [60 + stretch * 12, 69 - stretch * 18],
          [x, y],
        ],
        11,
        id === "torch" ? "#ab623f" : id === "sapper" ? "#5786a0" : "#68765b",
      );
      c.fillStyle = "#35443a";
      c.strokeStyle = ink;
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(x - 7, y - 6, 17, 12, 3);
      c.fill();
      c.stroke();
      c.strokeStyle = "#eee3bb";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(53, 57, 38, -0.6, 0.3);
      c.stroke();
    }
  } else if (pose === "hurt") {
    limb(
      [
        [23, 45],
        [18 - frame * 2, 49],
        [12, 38],
      ],
      8,
      skin,
    );
    fist(12, 38);
    limb(
      [
        [54, 45],
        [64, 49],
        [67, 38],
      ],
      8,
      skin,
    );
    fist(67, 38);
    c.fillStyle = "#f3d57b";
    for (let i = 0; i < 3; i++) {
      const x = 23 + i * 13,
        y = 5 + (i % 2) * 3;
      c.fillRect(x, y, 4, 4);
    }
  } else {
    const bob = frame * 2;
    limb(
      [
        [23, 47],
        [30, 43],
        [41, 33 + bob],
      ],
      8,
      skin,
    );
    fist(41, 33 + bob);
    limb(
      [
        [53, 45],
        [62, 43],
        [67, 32 - bob],
      ],
      8,
      skin,
    );
    fist(67, 32 - bob);
  }
}
