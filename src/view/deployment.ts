import type { Side } from "../sim/battle";
export const START_EDGES = {
  north: { name: "NORTH / TOP", arrow: "↓", x: 606, y: 105, angle: 0, strip: { x: 0, y: 0, w: 1100, h: 24 } },
  south: { name: "SOUTH / BOTTOM", arrow: "↑", x: 674, y: 512, angle: 0, strip: { x: 0, y: 536, w: 1100, h: 24 } },
  west: { name: "WEST / LEFT", arrow: "→", x: 44, y: 331, angle: -90, strip: { x: 0, y: 0, w: 24, h: 560 } },
  east: { name: "EAST / RIGHT", arrow: "←", x: 1236, y: 331, angle: 90, strip: { x: 1076, y: 0, w: 24, h: 560 } },
} as const;
export function startingEdge(vertical: boolean, side: Side) {
  return START_EDGES[vertical ? side === 0 ? "north" : "south" : side === 0 ? "west" : "east"];
}
