import type { ClassId } from "../sim/data";
import { drawCharacter } from "./characters";

export const WEAPON_LABELS: Record<ClassId, string> = {
  rifleman: "Service rifle",
  bazooka: "Rocket launcher",
  lobber: "Grenades",
  torch: "Flamethrower",
  sapper: "Dynamite",
};
// Large menu illustrations are drawn directly at display resolution, rather
// than enlarged from the battlefield's small textures. Keep the same uniforms.
export function drawShowcase(
  c: CanvasRenderingContext2D,
  id: ClassId,
  side: number,
) {
  drawCharacter(c, id, side, true);
  const ink = "#27362f";
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    r = 2,
  ) => {
    c.fillStyle = color;
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fill();
    c.stroke();
  };
  const line = (points: [number, number][], color: string, width: number) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  };
  const hand = (x: number, y: number, color = "#d8b187") =>
    box(x, y, 12, 9, color, 4);
  if (id === "rifleman") {
    // Wood stock, exposed barrel, front sight and curved magazine.
    line(
      [
        [23, 48],
        [27, 57],
        [39, 57],
      ],
      ink,
      11,
    );
    line(
      [
        [23, 48],
        [27, 57],
        [39, 57],
      ],
      "#d8b187",
      7,
    );
    box(24, 50, 24, 10, "#9c673d", 2);
    box(45, 48, 23, 9, "#54665d");
    box(67, 49, 24, 5, "#334940", 1);
    box(86, 44, 3, 5, "#334940", 0.5);
    box(53, 57, 8, 13, "#354c41", 2);
    box(42, 57, 6, 9, "#9c673d", 1);
    line(
      [
        [49, 51],
        [64, 51],
      ],
      "#b3c4b2",
      1.5,
    );
    hand(29, 54);
    hand(61, 53);
  } else if (id === "bazooka") {
    // Wide shoulder tube, rear exhaust, flared dark muzzle and sight.
    line(
      [
        [16, 48],
        [19, 61],
        [31, 57],
      ],
      ink,
      13,
    );
    line(
      [
        [16, 48],
        [19, 61],
        [31, 57],
      ],
      "#b78058",
      9,
    );
    box(17, 34, 63, 19, "#72834e", 4);
    box(13, 32, 10, 23, "#3b5440", 2);
    box(40, 33, 7, 21, "#e2cb84", 1);
    box(79, 31, 13, 25, "#405b40", 4);
    box(83, 35, 8, 17, "#1c332c", 3);
    box(55, 26, 12, 8, "#334b3b", 1);
    box(58, 28, 6, 3, "#b8d4bd", 0.5);
    box(46, 53, 8, 12, "#4c5c3b", 1);
    hand(25, 51, "#b78058");
    hand(62, 51, "#b78058");
  } else if (id === "lobber") {
    // Large segmented grenade, visible safety lever and metal pull ring.
    line(
      [
        [57, 45],
        [66, 40],
        [70, 30],
      ],
      ink,
      12,
    );
    line(
      [
        [57, 45],
        [66, 40],
        [70, 30],
      ],
      "#edc69c",
      8,
    );
    c.fillStyle = "#7faa40";
    c.strokeStyle = ink;
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(74, 27, 13, 17, -0.12, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    for (const y of [20, 28, 36])
      line(
        [
          [64, y],
          [84, y],
        ],
        "#42632c",
        2,
      );
    line(
      [
        [73, 13],
        [72, 41],
      ],
      "#42632c",
      2,
    );
    box(70, 7, 8, 7, "#627b42", 1);
    line(
      [
        [79, 9],
        [86, 13],
        [88, 28],
      ],
      "#bfc6ae",
      3,
    );
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(83, 6, 4, 0, Math.PI * 2);
    c.stroke();
    hand(62, 38, "#edc69c");
    hand(17, 53, "#edc69c");
  } else if (id === "torch") {
    // Fuel hose, long metal nozzle, heat shield and unmistakable pilot flame.
    line(
      [
        [12, 64],
        [22, 78],
        [42, 75],
        [51, 59],
      ],
      ink,
      6,
    );
    line(
      [
        [12, 64],
        [22, 78],
        [42, 75],
        [51, 59],
      ],
      "#b99753",
      2,
    );
    box(31, 51, 32, 11, "#aa8950", 3);
    box(61, 49, 23, 9, "#708071", 2);
    box(77, 45, 8, 17, "#3a5044", 1);
    for (const x of [64, 69, 74])
      line(
        [
          [x, 51],
          [x, 56],
        ],
        "#263b31",
        2,
      );
    c.fillStyle = "#ed7940";
    c.strokeStyle = ink;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(85, 49);
    c.quadraticCurveTo(94, 50, 98, 43);
    c.quadraticCurveTo(99, 59, 85, 58);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#ffe39a";
    c.beginPath();
    c.moveTo(85, 52);
    c.lineTo(93, 50);
    c.lineTo(87, 56);
    c.fill();
    hand(25, 56, "#776744");
    hand(54, 58, "#776744");
  } else {
    // Three broad red sticks, paper ends, dark binding and a sparking fuse.
    line(
      [
        [57, 47],
        [64, 50],
      ],
      ink,
      12,
    );
    line(
      [
        [57, 47],
        [64, 50],
      ],
      "#d7a072",
      8,
    );
    for (let i = 0; i < 3; i++) {
      const x = 57 + i * 10,
        y = 31 + (i % 2) * 3;
      box(x, y, 10, 32, "#e05c45", 3);
      box(x + 1, y + 1, 8, 4, "#f3cf9b", 1);
      line(
        [
          [x + 3, y + 8],
          [x + 3, y + 27],
        ],
        "#f29a68",
        1,
      );
    }
    box(55, 44, 33, 7, "#4d5140", 1);
    line(
      [
        [73, 32],
        [73, 21],
        [86, 17],
      ],
      ink,
      4,
    );
    line(
      [
        [73, 32],
        [73, 21],
        [86, 17],
      ],
      "#eac777",
      2,
    );
    for (const [x, y] of [
      [91, 15],
      [87, 10],
      [94, 21],
    ] as [number, number][])
      line(
        [
          [87, 17],
          [x, y],
        ],
        "#e98b3c",
        2,
      );
    hand(49, 56, "#d7a072");
    hand(16, 56, "#d7a072");
  }
}
