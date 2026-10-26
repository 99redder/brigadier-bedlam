import { COVER, FIELD, type Rect } from "./data";
export interface Point {
  x: number;
  y: number;
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const inside = (p: Point, r: Rect, pad = 0) =>
  p.x >= r.x - pad &&
  p.x <= r.x + r.w + pad &&
  p.y >= r.y - pad &&
  p.y <= r.y + r.h + pad;
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function blocked(a: Point, b: Point, cover: Rect[] = COVER, pad = 0) {
  return cover.some((r) => {
    let lo = 0,
      hi = 1;
    for (const [p, d, min, max] of [
      [a.x, b.x - a.x, r.x - pad, r.x + r.w + pad],
      [a.y, b.y - a.y, r.y - pad, r.y + r.h + pad],
    ]) {
      if (Math.abs(d) < 1e-8) {
        if (p < min || p > max) return false;
      } else {
        let t1 = (min - p) / d,
          t2 = (max - p) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        lo = Math.max(lo, t1);
        hi = Math.min(hi, t2);
        if (lo > hi) return false;
      }
    }
    return true;
  });
}
// Earliest surface contact; the impact sits just outside the obstacle so a
// blast reaches its near side while the intact obstacle shields the far side.
export function firstCoverHit<T extends Rect>(a: Point, b: Point, cover: T[]) {
  let result: { cover: T; point: Point; fraction: number } | null = null;
  for (const r of cover) {
    let lo = 0,
      hi = 1;
    let misses = false;
    for (const [p, d, min, max] of [
      [a.x, b.x - a.x, r.x, r.x + r.w],
      [a.y, b.y - a.y, r.y, r.y + r.h],
    ]) {
      if (Math.abs(d) < 1e-8) {
        if (p < min || p > max) misses = true;
      } else {
        const u = (min - p) / d,
          v = (max - p) / d;
        lo = Math.max(lo, Math.min(u, v));
        hi = Math.min(hi, Math.max(u, v));
      }
    }
    if (misses || lo > hi || (result && lo >= result.fraction)) continue;
    const f = Math.max(0, lo - 0.01 / (distance(a, b) || 1));
    result = {
      cover: r,
      fraction: lo,
      point: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f },
    };
  }
  return result;
}
export function distanceToRect(p: Point, r: Rect) {
  return Math.hypot(
    p.x - clamp(p.x, r.x, r.x + r.w),
    p.y - clamp(p.y, r.y, r.y + r.h),
  );
}
export function legal(p: Point, cover: Rect[] = COVER) {
  return (
    p.x >= 16 &&
    p.y >= 16 &&
    p.x <= FIELD.width - 16 &&
    p.y <= FIELD.height - 16 &&
    !cover.some((r) => inside(p, r, 16))
  );
}
export function safePoint(p: Point, cover: Rect[] = COVER): Point {
  const q = {
    x: clamp(p.x, 18, FIELD.width - 18),
    y: clamp(p.y, 18, FIELD.height - 18),
  };
  if (legal(q, cover)) return q;
  for (let radius = 20; radius < 220; radius += 20)
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        c = { x: q.x + Math.cos(a) * radius, y: q.y + Math.sin(a) * radius };
      if (legal(c, cover)) return c;
    }
  return { x: 40, y: 280 };
}
// Small deterministic A* grid; inflated cover prevents soldiers clipping corners.
export function pathfind(
  start: Point,
  end: Point,
  cover: Rect[] = COVER,
): Point[] {
  const goal = safePoint(end, cover);
  if (!blocked(start, goal, cover, 17)) return [goal];
  const cell = FIELD.cell,
    cols = Math.ceil(FIELD.width / cell),
    rows = Math.ceil(FIELD.height / cell),
    key = (x: number, y: number) => y * cols + x;
  const point = (id: number) => ({
    x: ((id % cols) + 0.5) * cell,
    y: (Math.floor(id / cols) + 0.5) * cell,
  });
  const sx = clamp(Math.floor(start.x / cell), 0, cols - 1),
    sy = clamp(Math.floor(start.y / cell), 0, rows - 1),
    gx = clamp(Math.floor(goal.x / cell), 0, cols - 1),
    gy = clamp(Math.floor(goal.y / cell), 0, rows - 1);
  let last = key(gx, gy);
  if (!legal(point(last), cover) || blocked(point(last), goal, cover, 17)) {
    let best = Infinity;
    for (let y = Math.max(0, gy - 4); y < Math.min(rows, gy + 5); y++)
      for (let x = Math.max(0, gx - 4); x < Math.min(cols, gx + 5); x++) {
        const id = key(x, y),
          p = point(id),
          d = distance(p, goal);
        if (d < best && legal(p, cover) && !blocked(p, goal, cover, 17)) {
          last = id;
          best = d;
        }
      }
    if (best === Infinity) return [];
  }
  const root = key(sx, sy),
    open = [root],
    cost = new Map([[root, 0]]),
    parent = new Map<number, number>(),
    closed = new Set<number>();
  while (open.length) {
    open.sort(
      (a, b) =>
        cost.get(a)! +
          distance(point(a), goal) -
          (cost.get(b)! + distance(point(b), goal)) || a - b,
    );
    const id = open.shift()!;
    if (id === last) {
      const route: Point[] = [goal];
      let n = id;
      while (n !== root) {
        route.unshift(point(n));
        n = parent.get(n)!;
      }
      return route;
    }
    closed.add(id);
    const x = id % cols,
      y = Math.floor(id / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const next = key(nx, ny),
        p = point(next);
      if (
        closed.has(next) ||
        !legal(p, cover) ||
        blocked(id === root ? start : point(id), p, cover, 17)
      )
        continue;
      const c = cost.get(id)! + cell * Math.hypot(dx, dy);
      if (c < (cost.get(next) ?? Infinity)) {
        cost.set(next, c);
        parent.set(next, id);
        if (!open.includes(next)) open.push(next);
      }
    }
  }
  return [];
}

// Contiguous horizontal bands share a single bank outline, with no internal seams.
// The outline uses the exact rectangles used by water hazards and pathfinding.
export function waterOutlines(water: Rect[], rowsOnly=false): Point[][] {
  // North–south fronts have columns instead of rows; trace in row space,
  // then transpose back so the shoreline has no internal rectangular seams.
  if(!rowsOnly && water.length>1 && water.every(r=>r.w===water[0].w) && new Set(water.map(r=>r.x)).size===water.length) {
    return waterOutlines(water.map(r=>({x:r.y,y:r.x,w:r.h,h:r.w})),true)
      .map(outline=>outline.map(p=>({x:p.y,y:p.x})));
  }
  const groups: Rect[][] = [];
  for (const r of [...water].sort((a, b) => a.y - b.y)) {
    const group = groups.at(-1),
      previous = group?.at(-1);
    if (
      previous &&
      Math.abs(previous.y + previous.h - r.y)<1e-6 &&
      previous.x < r.x + r.w &&
      r.x < previous.x + previous.w
    )
      group!.push(r);
    else groups.push([r]);
  }
  return groups.map((group) => [
    ...group.flatMap((r) => [
      { x: r.x, y: r.y },
      { x: r.x, y: r.y + r.h },
    ]),
    ...[...group].reverse().flatMap((r) => [
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x + r.w, y: r.y },
    ]),
  ]);
}
