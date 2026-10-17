import type { Soldier } from "../sim/battle";
import type { ClassId } from "../sim/data";
import { drawRunner } from "./runner";
import { drawCharacter } from "./characters";

export const VICTORY_SECONDS = 3.5;
export const EMOTES: Record<ClassId, string> = {
  rifleman: "SALUTE!",
  bazooka: "GUN SHOW!",
  lobber: "VICTORY JIG!",
  torch: "FIRED UP!",
  sapper: "JUMP FOR JOY!",
};
export const victoryKey = (id: ClassId, side: number, frame: number, light=false) =>
  `victory-${id}-${side}-${frame}${light?"-light":""}`;
export function isCelebrating(
  s: Pick<Soldier, "life" | "side">,
  winner: number | null,
) {
  return winner !== null && s.life === "alive" && s.side === winner;
}
// Presentation time is separate from the frozen, deterministic battle clock.
export class VictoryClock {
  elapsed = 0;
  reset() {
    this.elapsed = 0;
  }
  advance(seconds: number, winner: number | null, paused: boolean) {
    if (winner !== null && !paused)
      this.elapsed = Math.min(
        VICTORY_SECONDS,
        this.elapsed + Math.max(0, seconds),
      );
  }
  get complete() {
    return this.elapsed >= VICTORY_SECONDS;
  }
}
export function victoryMotion(id: ClassId, time: number, slot: number) {
  const phase = time * 7 + slot * 0.7;
  return {
    frame: Math.floor((time * 8 + slot) % 8),
    hop:
      id === "sapper"
        ? -Math.abs(Math.sin(phase)) * 17
        : id === "lobber"
          ? -Math.abs(Math.sin(phase)) * 7
          : 0,
    angle:
      id === "lobber"
        ? Math.sin(phase) * 10
        : id === "torch"
          ? Math.sin(phase) * 3
          : 0,
  };
}
export function drawVictory(
  c: CanvasRenderingContext2D,
  id: ClassId,
  side: number,
  frame: number,
  light=false,
) {
  if(light)drawRunner(c,id,side);else drawCharacter(c, id, side, true, id === "lobber" && frame % 4 < 2);
  const wave = Math.sin((frame / 8) * Math.PI * 2);
  const skin =
    id === "torch"
      ? "#776744"
      : id === "bazooka"
        ? "#b78058"
        : id === "lobber"
          ? "#edc69c"
          : "#d8b187";
  const arm = (points: [number, number][], width = 8) => {
    c.lineCap = "round";
    c.lineJoin = "round";
    for (const [color, w] of [
      ["#27362f", width + 4],
      [skin, width],
    ] as const) {
      c.strokeStyle = color;
      c.lineWidth = w;
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    }
    const [x, y] = points[points.length - 1];
    c.fillStyle = skin;
    c.strokeStyle = "#27362f";
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(x - 5, y - 5, 10, 10, 3);
    c.fill();
    c.stroke();
  };
  if (id === "rifleman") {
    arm([
      [23, 46],
      [19, 59],
      [22, 67],
    ]);
    arm([
      [54, 45],
      [68, 34],
      [54, 20 + wave],
    ]);
    c.strokeStyle = skin;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(53, 20 + wave);
    c.lineTo(44, 18 + wave);
    c.stroke();
  } else if (id === "bazooka") {
    arm(
      [
        [23, 45],
        [9, 32],
        [18, 20 - wave * 3],
      ],
      11,
    );
    arm(
      [
        [54, 45],
        [70, 32],
        [61, 20 - wave * 3],
      ],
      11,
    );
  } else if (id === "lobber") {
    arm([
      [23, 46],
      [9, 43 + wave * 10],
      [3, 32 + wave * 10],
    ]);
    arm([
      [54, 46],
      [68, 43 - wave * 10],
      [77, 32 - wave * 10],
    ]);
  } else if (id === "torch") {
    arm([
      [23, 46],
      [17, 57],
      [26, 62],
    ]);
    arm(
      [
        [54, 45],
        [65, 30 - wave * 5],
        [62, 12 - wave * 7],
      ],
      10,
    );
  } else {
    arm([
      [23, 45],
      [12, 29],
      [9, 11 + wave * 4],
    ]);
    arm([
      [54, 45],
      [66, 29],
      [70, 11 + wave * 4],
    ]);
  }
}
