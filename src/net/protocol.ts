import { Battle, type Command, type Side } from "../sim/battle";
import { FIELD } from "../sim/data";
export const NET_VERSION = 1;
export const NET_FIELDS = [
  "soldiers",
  "medics",
  "cover",
  "rubble",
  "terrainRevision",
  "water",
  "bridges",
  "supplies",
  "gear",
  "chests",
  "chestsSpawned",
  "chestsOpened",
  "nextChestAt",
  "powers",
  "strikes",
  "mortars",
  "shots",
  "effects",
  "calls",
  "winner",
  "stats",
  "time",
  "tick",
  "combatTicks",
  "planningTicks",
  "supplyRevision",
  "combatEvents",
  "airstrikeEvents",
  "mortarEvents",
  "meleeEvents",
] as const;
export type PublicState = Pick<Battle, (typeof NET_FIELDS)[number]>;
export type Phase = "waiting" | "ready" | "playing" | "finished" | "closed";
export interface Ticket {
  room: string;
  code: string;
  side: Side;
  name: string;
  keyHash: string;
}
export interface Peer {
  name: string;
  connected: boolean;
  ready: boolean;
}
export interface NetState {
  type: "state";
  v: 1;
  phase: Phase;
  side: Side;
  room: string;
  code: string;
  mapId: number;
  players: [Peer | null, Peer | null];
  ack: number;
  state: PublicState | null;
  reason: string;
  serverNow: number;
}
export const flipId = (id: number, side: Side) =>
  side === 1 && id >= 0 ? (id + 5) % 10 : id;
export function fromView(c: Command, side: Side): Command {
  const copy = structuredClone(c);
  if ("id" in copy && copy.id !== null) copy.id = flipId(copy.id, side);
  if ("target" in copy) copy.target = flipId(copy.target, side);
  if ("side" in copy) copy.side = side;
  return copy;
}
export function publicState(b: Battle, viewer: Side): PublicState {
  const out = Object.fromEntries(
    NET_FIELDS.map((key) => [key, structuredClone(b[key])]),
  ) as PublicState;
  out.soldiers = out.soldiers.map((s) => {
    const own = s.side === viewer;
    s.id = flipId(s.id, viewer);
    s.side = (s.side ^ viewer) as Side;
    if (s.target !== null) s.target = flipId(s.target, viewer);
    if (s.brawl !== null) s.brawl = flipId(s.brawl, viewer);
    if (!own) {
      s.path = [];
      s.goal = null;
      s.target = null;
      s.terrainTarget = null;
      delete s.watchAngle;
    }
    return s;
  });
  out.effects = out.effects.map(
    ({ x, y, classId, impactFacing, kind, time, size }) => ({
      x,
      y,
      classId,
      impactFacing,
      kind,
      time,
      size,
    }),
  );
  for (const m of out.medics) {
    m.side = (m.side ^ viewer) as Side;
    m.target = flipId(m.target, viewer);
  }
  for (const g of out.gear) {
    g.owner = flipId(g.owner, viewer);
    g.side = (g.side ^ viewer) as Side;
  }
  for (const s of out.shots) {
    s.owner = flipId(s.owner, viewer);
    s.target = flipId(s.target, viewer);
  }
  for (const s of out.supplies)
    if (s.claimedBy !== null) s.claimedBy = (s.claimedBy ^ viewer) as Side;
  for (const s of out.chests)
    if (s.claimedBy !== null) s.claimedBy = (s.claimedBy ^ viewer) as Side;
  for (const s of out.strikes) s.side = (s.side ^ viewer) as Side;
  for (const m of out.mortars) {
    m.side = (m.side ^ viewer) as Side;
    for (const s of m.shells) if (!s.launched) s.point = { ...m.center };
  }
  if (viewer === 1) {
    out.powers = [out.powers[1], out.powers[0]];
    out.calls = [out.calls[1], out.calls[0]];
    if (out.winner !== null) out.winner = (out.winner ^ 1) as Side;
  }
  return out;
}
const SIMPLE = new Set([
  "select",
  "move",
  "bridge",
  "attack",
  "demolish",
  "hold",
  "face",
  "aim",
  "cover",
  "drop-gear",
  "recover-gear",
  "squad-move",
  "fire-all",
  "super",
  "medic",
  "punch",
  "kick",
  "block",
]);
export function validCommand(
  value: unknown,
  b: Battle,
  side: Side,
): value is Command {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, unknown>;
  if (typeof c.type !== "string" || !SIMPLE.has(c.type)) return false;
  const own = (id: unknown) =>
    Number.isInteger(id) && typeof id === "number" && b.get(id)?.side === side;
  if (c.type === "select") return c.id === null || own(c.id);
  if (["super", "medic"].includes(c.type) && c.side !== side) return false;
  if (
    !["squad-move", "fire-all", "super", "medic"].includes(c.type) &&
    !own(c.id)
  )
    return false;
  if (
    [
      "move",
      "bridge",
      "demolish",
      "face",
      "aim",
      "squad-move",
      "super",
    ].includes(c.type)
  ) {
    const p = c.point as { x?: unknown; y?: unknown } | undefined;
    if (
      !p ||
      typeof p.x !== "number" ||
      typeof p.y !== "number" ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      p.x < 0 ||
      p.y < 0 ||
      p.x > FIELD.width ||
      p.y > FIELD.height
    )
      return false;
  }
  if (c.type === "attack")
    return (
      typeof c.target === "number" &&
      Number.isInteger(c.target) &&
      b.getCombatant(c.target)?.side === (side ^ 1)
    );
  if (c.type === "medic") return own(c.target);
  if (c.type === "super")
    return (
      c.weapon === "airstrike" || c.weapon === "mortar" || c.weapon === "sniper"
    );
  if (c.type === "cover" && typeof c.active !== "boolean") return false;
  if (c.type === "block" && typeof c.held !== "boolean") return false;
  return true;
}
