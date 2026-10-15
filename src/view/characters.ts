import { CLASSES, type ClassId } from "../sim/data";
// Shared team armbands and insignia leave each specialist's uniform intact.
export const CLASS_POSES: Record<
  ClassId,
  { bob: number; sway: number; pace: number; lean: number }
> = {
  rifleman: { bob: 0.35, sway: 0.25, pace: 3, lean: 0 },
  bazooka: { bob: 0.4, sway: 0.6, pace: 2, lean: -2 },
  lobber: { bob: 1.1, sway: 1.2, pace: 4, lean: 3 },
  torch: { bob: 0.55, sway: 0.2, pace: 2.2, lean: 0 },
  sapper: { bob: 0.8, sway: 0.9, pace: 5, lean: -3 },
};
export function drawCharacter(
  c: CanvasRenderingContext2D,
  id: ClassId,
  side: number,
  unarmed = false,
  lifting = false,
  gait = 0,
  crouched = false,
) {
  c.save();
  c.lineJoin = "round";
  if (crouched) {
    c.translate(0, 16);
    c.scale(1, 0.82);
  }
  const shade = (hex: string, n: number) => {
    const v = parseInt(hex.slice(1), 16);
    return `rgb(${[16, 8, 0].map((k) => Math.max(0, Math.min(255, ((v >> k) & 255) + n))).join(",")})`;
  };
  const ink = "#27362f",
    team = side === 0 ? "#477963" : "#c45e48",
    light = side === 0 ? "#8cba97" : "#f0aa82",
    accent = `#${CLASSES[id].color.toString(16).padStart(6, "0")}`;
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    r = 3,
  ) => {
    const paint = c.createLinearGradient(x, y, x + w, y + h);
    paint.addColorStop(0, shade(color, 22));
    paint.addColorStop(0.48, color);
    paint.addColorStop(1, shade(color, -18));
    c.fillStyle = paint;
    c.strokeStyle = ink;
    c.lineWidth = 2.5;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fill();
    c.stroke();
    if (w >= 10 && h >= 8) {
      c.save();
      c.strokeStyle = "rgba(255,246,210,.3)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x + 3, y + 3);
      c.lineTo(x + w - 4, y + 3);
      c.stroke();
      c.restore();
    }
  };
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
  ) => {
    const paint = c.createRadialGradient(
      x - rx * 0.3,
      y - ry * 0.35,
      0,
      x,
      y,
      Math.max(rx, ry),
    );
    paint.addColorStop(0, shade(color, 20));
    paint.addColorStop(0.7, color);
    paint.addColorStop(1, shade(color, -12));
    c.fillStyle = paint;
    c.strokeStyle = ink;
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  };
  const line = (points: [number, number][], color = ink, width = 2) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  };
  const patch = (x: number, y: number) => {
    box(x, y, 11, 8, team, 2);
    line(
      [
        [x + 3, y + 2],
        [x + 5, y + 5],
        [x + 8, y + 2],
      ],
      "#f4e8bd",
      1.5,
    );
  };
  const boots = (left: number, right: number, color: string, wide = false) => {
    const leg = (x: number, phase: number) => {
      const lift = Math.max(0, phase) * 4,
        stride = phase * 2;
      box(x + stride, 65, wide ? 15 : 11, 19 - lift, color);
      line(
        [
          [x + stride + 2, 72 - lift * 0.3],
          [x + stride + (wide ? 12 : 8), 73 - lift * 0.3],
        ],
        shade(color, -25),
        1,
      );
      box(x - 3 + stride, 80 - lift, wide ? 21 : 17, 8, "#35443a");
      line(
        [
          [x + stride, 85 - lift],
          [x + stride + (wide ? 14 : 10), 85 - lift],
        ],
        "#70806a",
        1,
      );
    };
    leg(left, gait);
    if (!lifting) leg(right, -gait);
  };
  if (id === "rifleman") {
    // Straight-backed veteran: tidy khaki tunic, patrol cap, moustache and chevrons.
    boots(25, 43, "#647759");
    box(25, 38, 28, 34, "#c9bd83", 4);
    box(17, 40, 11, unarmed ? 12 : 24, "#758161", 4);
    box(51, 40, 10, unarmed ? 12 : 22, "#758161", 4);
    line(
      [
        [39, 41],
        [39, 68],
      ],
      "#776e46",
    );
    box(27, 61, 27, 6, "#726444", 1);
    box(27, 48, 9, 8, "#a89a64", 1);
    box(42, 48, 9, 8, "#a89a64", 1);
    patch(17, 45);
    box(25, 15, 29, 25, "#d8b187", 8);
    box(23, 8, 34, 15, "#738263", 4);
    box(17, 20, 42, 5, "#738263", 2);
    patch(29, 10);
    line(
      [
        [33, 27],
        [38, 28],
      ],
      ink,
      2.5,
    );
    line(
      [
        [45, 28],
        [50, 27],
      ],
      ink,
      2.5,
    );
    c.fillStyle = ink;
    c.fillRect(35, 30, 2, 3);
    c.fillRect(47, 30, 2, 3);
    line(
      [
        [40, 35],
        [45, 33],
        [51, 35],
      ],
      "#684b34",
      4,
    );
    line(
      [
        [42, 39],
        [49, 39],
      ],
      ink,
    );
    for (let i = 0; i < 4; i++) box(28 + i * 5, 54, 4, 10, "#dbb757", 1);
    if (!unarmed) {
      box(37, 49, 40, 7, "#465348", 2);
      box(49, 56, 6, 9, "#725b39", 1);
      box(20, 53, 12, 9, "#d8b187", 4);
    }
    line(
      [
        [22, 41],
        [25, 43],
        [28, 41],
      ],
      "#ecdeb1",
      1.5,
    );
  }
  if (id === "bazooka") {
    // Broad bruiser: sleeveless purple armor, bare arms, square jaw and heavy boots.
    boots(19, 44, "#645f77", true);
    box(18, 37, 42, 35, "#8b77a4", 7);
    box(24, 41, 29, 22, accent, 4);
    box(25, 63, 32, 7, "#665746", 1);
    box(8, 38, 15, unarmed ? 14 : 26, "#b78058", 6);
    box(57, 37, 14, unarmed ? 14 : 25, "#b78058", 6);
    patch(9, 40);
    box(23, 11, 34, 30, "#b78058", 7);
    box(21, 4, 37, 15, "#5d6463", 6);
    box(16, 16, 46, 6, team, 3);
    line(
      [
        [29, 25],
        [37, 24],
      ],
      ink,
      3,
    );
    line(
      [
        [45, 24],
        [54, 26],
      ],
      ink,
      3,
    );
    c.fillStyle = "#f4dfb2";
    c.fillRect(37, 32, 14, 5);
    line(
      [
        [36, 32],
        [51, 32],
      ],
      ink,
    );
    for (let i = 0; i < 5; i++)
      line(
        [
          [29 + i * 5, 37],
          [30 + i * 5, 39],
        ],
        "#735337",
        1,
      );
    if (!unarmed) {
      box(4, 49, 14, 19, "#d8a76b", 3);
      box(31, 36, 47, 19, "#536449", 5);
      box(49, 34, 8, 23, "#c7b57a", 1);
      box(28, 34, 9, 23, "#374c3b", 2);
      ellipse(74, 45, 4, 6, "#253a2f");
      box(23, 48, 15, 10, "#b78058", 4);
      line(
        [
          [26, 57],
          [26, 65],
        ],
        "#e3c897",
        2,
      );
    }
  }
  if (id === "lobber") {
    // Gleeful grenadier: flared long coat, neckerchief, tilted beret and toothy grin.
    boots(27, 44, "#4f6244");
    c.fillStyle = "#789c50";
    c.strokeStyle = ink;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(26, 39);
    c.lineTo(54, 37);
    c.lineTo(61, 76);
    c.lineTo(19, 76);
    c.closePath();
    c.fill();
    c.stroke();
    box(14, 42, 13, unarmed ? 12 : 25, "#8dac60", 5);
    box(54, unarmed ? 40 : 32, 12, unarmed ? 12 : 25, "#8dac60", 5);
    patch(14, 46);
    line(
      [
        [38, 45],
        [40, 74],
      ],
      "#3e5d39",
    );
    box(25, 59, 31, 6, "#5a6040", 1);
    box(23, 14, 31, 28, "#edc69c", 10);
    ellipse(37, 14, 20, 8, "#567d42");
    box(24, 19, 30, 4, team, 1);
    box(47, 3, 6, 8, "#567d42", 2);
    line(
      [
        [30, 27],
        [36, 25],
      ],
      ink,
    );
    line(
      [
        [43, 25],
        [49, 27],
      ],
      ink,
    );
    ellipse(33, 29, 1.5, 2, ink);
    ellipse(46, 29, 1.5, 2, ink);
    box(32, 33, 18, 9, "#fff0cf", 4);
    line(
      [
        [38, 34],
        [38, 40],
      ],
      ink,
      1,
    );
    c.fillStyle = "#c28356";
    c.fillRect(27, 31, 2, 2);
    c.fillRect(29, 33, 2, 2);
    c.fillStyle = "#e6cf6c";
    c.beginPath();
    c.moveTo(27, 40);
    c.lineTo(55, 40);
    c.lineTo(45, 51);
    c.lineTo(36, 44);
    c.fill();
    c.strokeStyle = ink;
    c.stroke();
    for (let i = 0; i < 3; i++) box(25 + i * 9, 51, 8, 12, "#355d36", 4);
    if (!unarmed) {
      ellipse(65, 35, 10, 12, "#6fa343");
      box(62, 20, 5, 7, "#374e32", 1);
      box(54, 41, 13, 9, "#edc69c", 4);
    }
  }
  if (id === "torch") {
    // Industrial fire specialist: padded orange coveralls, mask, gauntlets, reflective stripes.
    box(3, 30, 13, 42, "#a94436", 6);
    box(14, 27, 14, 45, "#dd7546", 6);
    box(5, 33, 18, 7, "#e5c37b", 1);
    boots(24, 44, "#ab623f", true);
    box(20, 37, 40, 36, "#d78b43", 7);
    box(22, 46, 36, 6, "#f2d796", 1);
    box(22, 65, 36, 6, "#f2d796", 1);
    box(12, 39, 13, unarmed ? 14 : 27, "#c0793d", 5);
    box(55, 39, 13, unarmed ? 14 : 24, "#c0793d", 5);
    patch(12, 42);
    box(20, 57, 14, 12, "#655d48", 3);
    box(23, 12, 33, 31, "#544b3b", 8);
    box(21, 5, 37, 17, "#d28a42", 10);
    box(17, 20, 45, 6, "#d28a42", 2);
    patch(34, 7);
    box(26, 26, 31, 12, "#2b3935", 5);
    box(29, 28, 10, 6, "#eecb73", 2);
    box(44, 28, 10, 6, "#eecb73", 2);
    ellipse(41, 41, 10, 7, "#627067");
    line(
      [
        [35, 39],
        [47, 39],
      ],
      "#273b32",
    );
    line(
      [
        [35, 43],
        [47, 43],
      ],
      "#273b32",
    );
    if (!unarmed) {
      line(
        [
          [13, 67],
          [26, 78],
          [45, 70],
          [53, 57],
        ],
        "#344638",
        5,
      );
      box(38, 53, 30, 9, "#796947", 3);
      box(65, 48, 13, 17, "#444d40", 2);
      box(55, 56, 14, 11, "#6b604c", 3);
    }
    line(
      [
        [23, 74],
        [34, 74],
      ],
      "#efd99c",
      3,
    );
    line(
      [
        [44, 74],
        [57, 74],
      ],
      "#efd99c",
      3,
    );
  }
  if (id === "sapper") {
    // Reckless mechanic: blue overalls, rolled sleeves, bandana, unruly hair and tool belt.
    boots(27, 43, "#5786a0");
    box(24, 37, 30, 33, "#e4dcc0", 4);
    box(14, 40, 12, 16, "#e4dcc0", 4);
    box(54, 37, 11, 17, "#e4dcc0", 4);
    box(13, 51, 13, 8, "#b6c0b3", 2);
    box(53, 49, 13, 7, "#b6c0b3", 2);
    if (!unarmed) box(14, 58, 12, 12, "#d7a072", 4);
    patch(14, 43);
    box(25, 46, 29, 25, "#5b91b1", 3);
    box(27, 39, 5, 20, accent, 1);
    box(47, 38, 5, 20, accent, 1);
    box(33, 53, 13, 10, "#487c97", 1);
    ellipse(30, 49, 2, 2, "#e4c269");
    ellipse(49, 49, 2, 2, "#e4c269");
    box(23, 65, 33, 7, "#77553c", 1);
    box(26, 68, 13, 12, "#bd8c51", 2);
    line(
      [
        [46, 64],
        [46, 77],
      ],
      "#c6cbb6",
      4,
    );
    line(
      [
        [42, 64],
        [46, 68],
        [50, 64],
      ],
      "#c6cbb6",
      3,
    );
    box(23, 14, 29, 27, "#d7a072", 7);
    c.fillStyle = "#a96c36";
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(23, 18);
    c.lineTo(21, 8);
    c.lineTo(29, 12);
    c.lineTo(33, 4);
    c.lineTo(39, 11);
    c.lineTo(48, 6);
    c.lineTo(52, 18);
    c.closePath();
    c.fill();
    c.stroke();
    box(21, 15, 34, 7, "#d85e48", 2);
    c.fillStyle = "#d85e48";
    c.beginPath();
    c.moveTo(23, 19);
    c.lineTo(10, 28);
    c.lineTo(22, 28);
    c.fill();
    line(
      [
        [29, 25],
        [36, 27],
      ],
      ink,
      2.5,
    );
    line(
      [
        [42, 26],
        [48, 24],
      ],
      ink,
      2.5,
    );
    c.fillStyle = ink;
    c.fillRect(33, 29, 2, 3);
    c.fillRect(44, 28, 2, 3);
    box(33, 34, 17, 7, "#f4dfb6", 3);
    line(
      [
        [39, 34],
        [39, 39],
      ],
      ink,
      1,
    );
    if (!unarmed) {
      box(54, 42, 8, 25, "#db5245", 2);
      box(63, 39, 8, 25, "#db5245", 2);
      box(51, 51, 23, 5, "#564a36", 1);
      line(
        [
          [65, 39],
          [65, 29],
          [74, 28],
        ],
        "#eac777",
        2,
      );
      ellipse(74, 28, 2, 2, "#f9d375");
      box(45, 55, 13, 10, "#d7a072", 4);
    }
  }
  if (id === "rifleman") {
    line(
      [
        [27, 40],
        [33, 47],
        [39, 41],
        [46, 47],
        [52, 40],
      ],
      "#e7d9a0",
      1.5,
    );
    for (const y of [47, 53, 59]) ellipse(39, y, 1.2, 1.2, "#e4bd60");
    line(
      [
        [26, 12],
        [52, 12],
      ],
      "#a3b090",
      1,
    );
    line(
      [
        [25, 17],
        [52, 17],
      ],
      "#4c6252",
      1,
    );
    box(36, 62, 6, 5, "#e4bd60", 1);
    if (!unarmed) {
      box(37, 51, 13, 5, "#98734c", 1);
      line(
        [
          [53, 50],
          [73, 50],
        ],
        "#93a394",
        1,
      );
      box(65, 45, 5, 3, "#394e46", 1);
      line(
        [
          [34, 60],
          [45, 67],
          [63, 59],
        ],
        "#6d6345",
        1.5,
      );
    }
  } else if (id === "bazooka") {
    box(22, 39, 10, 8, "#a28bb7", 2);
    box(48, 39, 10, 8, "#a28bb7", 2);
    for (const x of [25, 54])
      for (const y of [42, 61]) ellipse(x, y, 1.2, 1.2, "#d5d0bf");
    line(
      [
        [33, 56],
        [46, 56],
        [46, 61],
        [33, 61],
        [33, 56],
      ],
      "#665b7b",
      1.2,
    );
    line(
      [
        [27, 7],
        [50, 7],
        [54, 11],
      ],
      "#a1aaa4",
      1.4,
    );
    line(
      [
        [51, 28],
        [53, 31],
      ],
      "#e0b18b",
      1,
    );
    if (!unarmed) {
      line(
        [
          [38, 39],
          [69, 39],
        ],
        "#829675",
        1.5,
      );
      ellipse(74, 45, 4, 6, "#1c302b");
      line(
        [
          [60, 36],
          [63, 30],
          [68, 30],
        ],
        "#344d40",
        2,
      );
      box(60, 33, 6, 4, "#d4c388", 1);
    }
  } else if (id === "lobber") {
    ellipse(30, 13, 3, 3, "#d9bf68");
    line(
      [
        [28, 43],
        [36, 47],
        [39, 44],
      ],
      "#fff0ad",
      1.2,
    );
    line(
      [
        [23, 70],
        [33, 68],
      ],
      "#b0be7b",
      1,
    );
    line(
      [
        [45, 67],
        [57, 70],
      ],
      "#47633d",
      1,
    );
    for (const x of [29, 48]) ellipse(x, 60, 1.2, 1.2, "#d8c06d");
    if (!unarmed) {
      for (const y of [29, 35, 41])
        line(
          [
            [59, y],
            [71, y],
          ],
          "#42652e",
          1,
        );
      line(
        [
          [65, 25],
          [65, 43],
        ],
        "#97bd5b",
        1.3,
      );
      ellipse(65, 22, 3.4, 2.4, "#aeb8a0");
      line(
        [
          [67, 25],
          [71, 34],
        ],
        "#e0ce83",
        1.5,
      );
    }
  } else if (id === "torch") {
    ellipse(20, 31, 4, 4, "#e7dab3");
    line(
      [
        [20, 31],
        [22, 29],
      ],
      "#b9513e",
      1.2,
    );
    line(
      [
        [8, 42],
        [8, 65],
      ],
      "#ecaa69",
      1,
    );
    line(
      [
        [22, 39],
        [27, 43],
      ],
      "#704d38",
      1.5,
    );
    for (let i = 0; i < 3; i++)
      line(
        [
          [26 + i * 8, 47],
          [30 + i * 8, 50],
        ],
        "#5c5340",
        1.6,
      );
    line(
      [
        [30, 29],
        [36, 29],
      ],
      "#fff2ba",
      1.2,
    );
    line(
      [
        [45, 29],
        [50, 29],
      ],
      "#fff2ba",
      1.2,
    );
    if (!unarmed) {
      for (const y of [51, 56, 61])
        line(
          [
            [70, y],
            [75, y],
          ],
          "#a5a38a",
          1,
        );
      ellipse(76, 57, 2, 3, "#f1a34c");
      ellipse(77, 56, 1, 1.5, "#fff0a2");
    }
  } else {
    line(
      [
        [26, 19],
        [47, 18],
      ],
      "#f1a187",
      1,
    );
    line(
      [
        [16, 54],
        [23, 54],
      ],
      "#ede8d6",
      1,
    );
    line(
      [
        [35, 55],
        [43, 55],
      ],
      "#9ac4d2",
      1,
    );
    line(
      [
        [28, 62],
        [49, 62],
      ],
      "#365f78",
      1,
    );
    line(
      [
        [28, 28],
        [31, 30],
      ],
      "#9d634a",
      1.4,
    );
    box(46, 30, 7, 3, "#efcc9b", 1);
    if (!unarmed) {
      line(
        [
          [56, 44],
          [56, 62],
        ],
        "#ff9b78",
        1,
      );
      line(
        [
          [65, 42],
          [65, 60],
        ],
        "#ff9b78",
        1,
      );
      line(
        [
          [52, 53],
          [72, 53],
        ],
        "#c5b27b",
        1.4,
      );
      ellipse(74, 28, 2.2, 2.2, "#ffc467");
    }
  }
  // This visible shoulder tab is common across all five distinct uniforms.
  c.fillStyle = light;
  c.fillRect(18, 46, 4, 2);
  c.restore();
}
