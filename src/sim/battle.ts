import {
  CLASSES,
  COVER,
  TRAINING_COVER,
  WATER,
  BRIDGES,
  FIELD,
  SQUADS,
  TUNING,
  TERRAIN,
  type Cover,
  type ClassId,
  type Rect,
} from "./data";
import {
  distance,
  firstCoverHit,
  distanceToRect,
  inside,
  blocked,
  legal,
  pathfind,
  safePoint,
  type Point,
} from "./geometry";
export type Side = 0 | 1;
export type Life = "alive" | "down" | "dead";
export interface Soldier extends Point {
  id: number;
  side: Side;
  slot: number;
  classId: ClassId;
  hp: number;
  life: Life;
  death: "skeleton" | "ash" | "drowned" | null;
  target: number | null;
  terrainTarget: Point | null;
  goal: Point | null;
  path: Point[];
  hold: boolean;
  cooldown: number;
  jam: number;
  flash: number;
  brawl: number | null;
  brawlCd: number;
  fightMove: "punch" | "kick" | null;
  fightMoveTime: number;
  recoilTime: number;
  recoilBlocked: boolean;
  knockdownTime: number;
  brawlKnockdown: boolean;
  fightAnchor: Point | null;
  fightFacing: number;
  autoGuardTime: number;
  blocking: boolean;
  facing: number;
  think: number;
  repath: number;
  moving: boolean;
  wasInWater: boolean;
  drowningTime: number;
  safeRoute: boolean;
  retreatUntil: number;
  retreatReady: number;
}
export interface Medic extends Point {
  side: Side;
  target: number;
  phase: "in" | "out";
  timer: number;
  path: Point[];
}
export interface Shot {
  id: number;
  from: Point;
  to: Point;
  owner: number;
  classId: ClassId;
  target: number;
  time: number;
  duration: number;
  hitCover?: boolean;
}
export interface Effect extends Point {
  classId?: ClassId;
  impactFacing?: number;
  kind:
    | "splash"
    | "debris"
    | "hit"
    | "boom"
    | "brawl"
    | "revive"
    | "jam"
    | "punch"
    | "kick"
    | "block";
  time: number;
  size: number;
}
export type Command =
  | { type: "fire-all" }
  | { type: "move"; id: number; point: Point }
  | { type: "bridge"; id: number; point: Point }
  | { type: "attack"; id: number; target: number }
  | { type: "demolish"; id: number; point: Point }
  | { type: "hold"; id: number }
  | { type: "medic"; target: number; side: Side }
  | { type: "punch" | "kick"; id: number }
  | { type: "block"; id: number; held: boolean }
  | { type: "select"; id: number | null };
export interface Replay {
  version: 1;
  seed: number;
  squad: number;
  training?: boolean;
  aiSides?: Side[];
  commands: { tick: number; command: Command }[];
}
export interface CombatEvent {
  id: number;
  classId: ClassId;
  kind: "fire" | "impact";
}
export class Battle {
  aiSides: Side[] = [1];
  combatEvents: CombatEvent[] = [];
  combatEventId = 0;
  meleeEvents: { id: number; kind: "punch" | "kick"; blocked: boolean }[] = [];
  meleeEventId = 0;
  emitWeapon(classId: ClassId, kind: CombatEvent["kind"]) {
    this.combatEvents.push({ id: this.combatEventId++, classId, kind });
    if (this.combatEvents.length > 64) this.combatEvents.shift();
  }
  seed: number;
  rngState: number;
  squad: number;
  tick = 0;
  time = 0;
  soldiers: Soldier[] = [];
  medics: Medic[] = [];
  calls = [TUNING.medicCalls, TUNING.medicCalls];
  shots: Shot[] = [];
  effects: Effect[] = [];
  cover: Cover[] = COVER.map((r) => ({ ...r, hp: TERRAIN.hp }));
  rubble: Cover[] = [];
  terrainRevision = 0;
  water: Rect[] = WATER.map((r) => ({ ...r }));
  bridges: Rect[] = BRIDGES.map((r) => ({ ...r }));
  winner: Side | null = null;
  selected: number | null = null;
  log: string[] = [];
  commands: Replay["commands"] = [];
  shotId = 0;
  nextMedic = 5;
  stats = { shots: 0, revives: 0, brawls: 0, instantKills: 0, drownings: 0 };
  constructor(
    seed: number,
    squad = 0,
    readonly training = false,
  ) {
    if (training)
      this.cover = TRAINING_COVER.map((r) => ({ ...r, hp: TERRAIN.hp }));
    this.seed = seed >>> 0;
    this.rngState = this.seed;
    this.squad = squad;
    const enemy = Math.floor(this.random() * SQUADS.length);
    for (const side of (training ? [0] : [0, 1]) as Side[])
      (side === 0 ? SQUADS[squad] : SQUADS[enemy]).classes.forEach(
        (classId, slot) => {
          this.soldiers.push({
            id: side * 5 + slot,
            side,
            slot,
            classId,
            x: side === 0 ? 105 : 995,
            y: training ? 160 + slot * 70 : 75 + slot * 99,
            hp: CLASSES[classId].hp,
            life: "alive",
            death: null,
            target: null,
            terrainTarget: null,
            goal: null,
            path: [],
            hold: false,
            cooldown: this.random() * 0.6,
            jam: 0,
            flash: 0,
            brawl: null,
            brawlCd: 0,
            fightMove: null,
            fightMoveTime: 0,
            recoilTime: 0,
            recoilBlocked: false,
            knockdownTime: 0,
            brawlKnockdown: false,
            fightAnchor: null,
            fightFacing: 1,
            autoGuardTime: 0,
            blocking: false,
            facing: side === 0 ? 1 : -1,
            think: this.random(),
            repath: 0,
            moving: false,
            wasInWater: false,
            drowningTime: 0,
            safeRoute: false,
            retreatUntil: 0,
            retreatReady: 0,
          });
        },
      );
    this.note("Operation: questionable decisions.");
  }
  random() {
    let t = (this.rngState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  note(message: string) {
    this.log.unshift(message);
    this.log = this.log.slice(0, 5);
  }
  get(id: number) {
    return this.soldiers.find((s) => s.id === id);
  }
  command(c: Command, record = true) {
    if (this.winner !== null) return;
    if (record)
      this.commands.push({ tick: this.tick, command: structuredClone(c) });
    if (c.type === "fire-all") {
      this.fireAll();
      return;
    }
    if (c.type === "select") {
      this.selected = c.id;
      for (const s of this.soldiers) s.blocking = false;
      return;
    }
    if (c.type === "medic") {
      this.callMedic(c.target, c.side);
      return;
    }
    const s = this.get(c.id);
    if (!s || s.life !== "alive" || s.drowningTime > 0) return;
    if (c.type === "bridge" && s.brawl === null) {
      const bridge = this.bridges.find((r) => inside(c.point, r));
      if (bridge) {
        const river = this.water.find((r) =>
          inside({ x: bridge.x + bridge.w / 2, y: bridge.y + bridge.h / 2 }, r),
        );
        if (river) {
          const x =
            s.x < river.x + river.w / 2 ? river.x + river.w + 24 : river.x - 24;
          s.target = null;
          s.terrainTarget = null;
          s.hold = false;
          this.setGoal(s, { x, y: bridge.y + bridge.h / 2 }, true);
        }
      }
    }
    if (c.type === "demolish" && s.brawl === null) {
      const r = this.cover.find((r) => inside(c.point, r));
      if (r) {
        s.terrainTarget = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
        s.target = null;
        s.goal = null;
        s.path = [];
        s.hold = false;
      }
    }
    if (c.type === "move" && s.brawl === null) {
      s.terrainTarget = null;
      s.target = null;
      s.hold = false;
      this.setGoal(s, c.point);
    }
    if (c.type === "attack" && s.brawl === null) {
      const t = this.get(c.target);
      if (t && t.side !== s.side && t.life === "alive") {
        s.terrainTarget = null;
        s.target = t.id;
        s.hold = false;
        s.goal = null;
        s.path = [];
        s.repath = 0;
      }
    }
    if (c.type === "hold") {
      s.terrainTarget = null;
      s.hold = true;
      s.target = null;
      s.goal = null;
      s.path = [];
    }
    if (c.type === "block") s.blocking = c.held && s.brawl !== null;
    if (c.type === "punch" || c.type === "kick") this.brawlHit(s, c.type);
  }
  // Treat the river as a movement obstacle, except for the bridge deck.
  dryCover(): Rect[] {
    let water = this.water.map((r) => ({ ...r }));
    for (const bridge of this.bridges) {
      water = water.flatMap((r) => {
        const x = Math.max(r.x, bridge.x),
          y = Math.max(r.y, bridge.y),
          right = Math.min(r.x + r.w, bridge.x + bridge.w),
          bottom = Math.min(r.y + r.h, bridge.y + bridge.h);
        if (x >= right || y >= bottom) return [r];
        return [
          { x: r.x, y: r.y, w: r.w, h: y - r.y },
          { x: r.x, y: bottom, w: r.w, h: r.y + r.h - bottom },
          { x: r.x, y, w: x - r.x, h: bottom - y },
          { x: right, y, w: r.x + r.w - right, h: bottom - y },
        ].filter((piece) => piece.w > 0 && piece.h > 0);
      });
    }
    return [...this.cover, ...water];
  }
  setGoal(s: Soldier, p: Point, bridge = false) {
    const preferBridge =
      bridge ||
      (this.aiSides.includes(s.side) &&
        CLASSES[s.classId].drowningRisk >= TUNING.aiBridgeRisk &&
        !this.inWater(s) &&
        blocked(s, p, this.water));
    const obstacles = preferBridge ? this.dryCover() : this.cover;
    s.safeRoute = preferBridge;
    s.goal = safePoint(
      p,
      this.aiSides.includes(s.side) ? this.dryCover() : obstacles,
    );
    s.path = pathfind(s, s.goal, obstacles);
    s.repath = 0.65;
  }
  inWater(p: Point) {
    return (
      this.water.some((r) => inside(p, r)) &&
      !this.bridges.some((r) => inside(p, r))
    );
  }
  updateWater(s: Soldier) {
    if (s.life !== "alive" || s.drowningTime > 0) return;
    const wet = this.inWater(s);
    if (wet && !s.wasInWater) {
      this.effects.push({ ...s, kind: "splash", time: 0.6, size: 22 });
      // One seeded roll on entry, never a repeated chance on each frame.
      if (!this.training && this.random() < CLASSES[s.classId].drowningRisk) {
        s.drowningTime = TUNING.drowningDuration;
        s.path = [];
        s.goal = null;
        s.target = null;
        s.terrainTarget = null;
        s.flash = 0;
        s.blocking = false;
        s.fightMoveTime = 0;
        s.recoilTime = 0;
        if (s.brawl !== null) {
          const other = this.get(s.brawl);
          if (other) {
            other.brawl = null;
            other.blocking = false;
          }
          s.brawl = null;
        }
        this.note(
          `${s.side === 0 ? "Your" : "Enemy"} ${CLASSES[s.classId].name} is drowning!`,
        );
      }
    }
    s.wasInWater = wet;
  }
  canShoot(s: Soldier, t: Soldier) {
    const w = CLASSES[s.classId];
    return (
      s.life === "alive" &&
      s.drowningTime <= 0 &&
      t.drowningTime <= 0 &&
      t.life === "alive" &&
      s.brawl === null &&
      s.fightMoveTime <= 0 &&
      s.jam <= 0 &&
      distance(s, t) <= w.range &&
      !(s.classId === "torch" && this.inWater(s)) &&
      (w.arc || s.classId === "bazooka" || !blocked(s, t, this.cover))
    );
  }
  safeBlast(s: Soldier, target: Point) {
    const w = CLASSES[s.classId];
    if (!w.radius || s.classId === "torch") return true;
    const impact = firstCoverHit(s, target, this.cover)?.point ?? target;
    return !this.soldiers.some((friend) => {
      const point = friend.id === s.id ? s : friend;
      return (
        friend.side === s.side &&
        friend.life === "alive" &&
        friend.drowningTime <= 0 &&
        distance(point, impact) <= w.radius &&
        !blocked(impact, point, this.cover)
      );
    });
  }
  canAutoShoot(s: Soldier, t: Soldier) {
    return (
      this.canShoot(s, t) &&
      (!this.aiSides.includes(s.side) || this.safeBlast(s, t))
    );
  }
  damage(
    target: Soldier,
    amount: number,
    classId: ClassId | null = null,
    lethal = false,
  ) {
    if (this.training || target.life !== "alive" || target.drowningTime > 0)
      return;
    const instant =
      lethal || (classId !== null && this.random() < CLASSES[classId].instant);
    if (instant) {
      target.hp = 0;
      target.life = "dead";
      target.death = classId === "torch" ? "ash" : "skeleton";
      this.stats.instantKills++;
      this.note(`${CLASSES[target.classId].name}: permanently excused.`);
    } else {
      target.hp = Math.max(0, target.hp - amount);
      if (target.hp === 0) {
        target.life = "down";
        this.note(
          `${target.side === 0 ? "Your" : "Enemy"} ${CLASSES[target.classId].name} needs a medic.`,
        );
      }
    }
    if (target.life !== "alive" && target.brawl !== null) {
      target.brawlKnockdown = true;
      target.knockdownTime = TUNING.knockdownAnimation;
    }
    if (target.life !== "alive") {
      target.path = [];
      target.goal = null;
      target.blocking = false;
      if (target.brawl !== null) {
        const other = this.get(target.brawl);
        if (other) {
          other.brawl = null;
          other.blocking = false;
          other.brawlCd = 0.5;
        }
        target.brawl = null;
      }
    }
    this.effects.push({ ...target, kind: "hit", time: 0.25, size: 10 });
  }
  fireAll() {
    let fired = 0;
    for (const s of this.soldiers) {
      if (s.side !== 0 || s.life !== "alive" || s.moving || s.path.length > 0)
        continue;
      if (s.terrainTarget) {
        if (this.fireAt(s, s.terrainTarget)) fired++;
        continue;
      }
      const ordered = s.target === null ? undefined : this.get(s.target);
      const target =
        ordered && ordered.side !== s.side && this.canShoot(s, ordered)
          ? ordered
          : this.soldiers
              .filter((t) => t.side !== s.side && this.canShoot(s, t))
              .sort(
                (a, b) => distance(s, a) - distance(s, b) || a.id - b.id,
              )[0];
      if (target && this.fire(s, target)) fired++;
    }
    this.note(
      fired
        ? `Fire all: ${fired} stationary soldier${fired === 1 ? "" : "s"} fired.`
        : "Fire all: no stationary soldiers ready with a target in range.",
    );
    return fired;
  }
  fire(s: Soldier, t: Soldier) {
    if (s.cooldown > 0 || !this.canShoot(s, t)) return false;
    return this.fireAt(s, t, t.id);
  }
  fireAt(s: Soldier, point: Point, target = -1) {
    const w = CLASSES[s.classId];
    const hit = firstCoverHit(s, point, this.cover);
    if (
      s.life !== "alive" ||
      s.drowningTime > 0 ||
      s.brawl !== null ||
      s.fightMoveTime > 0 ||
      s.cooldown > 0 ||
      s.jam > 0 ||
      distance(s, hit?.point ?? point) > w.range ||
      (s.classId === "torch" && this.inWater(s))
    )
      return false;
    s.cooldown = w.cooldown;
    s.flash = 0.2;
    s.facing = point.x >= s.x ? 1 : -1;
    this.stats.shots++;
    if (w.jam && this.random() < w.jam) {
      s.jam = TUNING.jamDuration;
      this.effects.push({ ...s, kind: "jam", time: 1, size: 16 });
      this.note("Rifle jammed. Strongly worded memo pending.");
      return false;
    }
    this.emitWeapon(s.classId, "fire");
    const duration = w.arc ? 0.65 : s.classId === "bazooka" ? 0.35 : 0.1;
    this.shots.push({
      id: this.shotId++,
      from: { x: s.x, y: s.y },
      to: hit?.point ?? { ...point },
      hitCover: !!hit,
      owner: s.id,
      classId: s.classId,
      target,
      time: 0,
      duration,
    });
    return true;
  }
  resolveShot(shot: Shot) {
    const owner = this.get(shot.owner);
    if (!owner) return;
    const w = CLASSES[shot.classId];
    // Snapshot cover: even a demolition blast is stopped by the cover it destroys.
    const cover = [...this.cover];
    const hit = firstCoverHit(shot.from, shot.to, cover);
    const impact = hit?.point ?? shot.to;
    const terrainHit = !!hit || !!shot.hitCover;
    this.emitWeapon(shot.classId, "impact");
    if (w.radius) {
      for (const t of this.soldiers) {
        if (t.life !== "alive") continue;
        if (shot.classId === "torch") {
          if (
            t.side === owner.side ||
            distance(shot.from, t) > w.range ||
            blocked(shot.from, t, cover)
          )
            continue;
          const ax = shot.to.x - shot.from.x,
            ay = shot.to.y - shot.from.y,
            bx = t.x - shot.from.x,
            by = t.y - shot.from.y;
          if (
            (ax * bx + ay * by) /
              (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1) <
            0.8
          )
            continue;
        } else if (distance(t, impact) > w.radius || blocked(impact, t, cover))
          continue;
        this.damage(
          t,
          w.damage,
          shot.classId,
          w.lethalRadius > 0 && distance(t, impact) <= w.lethalRadius,
        );
      }
      this.effects.push({
        ...impact,
        kind: "boom",
        classId: shot.classId,
        time: 0.5,
        size: w.radius,
      });
    } else if (!terrainHit) {
      const t = this.get(shot.target);
      if (
        t &&
        distance(t, impact) < 42 &&
        (!this.aiSides.includes(owner.side) ||
          this.random() < TUNING.aiAccuracy)
      )
        this.damage(t, w.damage, shot.classId);
    } else {
      this.effects.push({ ...impact, kind: "hit", time: 0.25, size: 10 });
    }
    const amount = TERRAIN.damage[shot.classId];
    if (!amount) return;
    let demolished = false;
    for (const r of cover) {
      const nearest = {
        x: Math.max(r.x, Math.min(impact.x, r.x + r.w)),
        y: Math.max(r.y, Math.min(impact.y, r.y + r.h)),
      };
      if (
        distanceToRect(impact, r) > w.radius ||
        blocked(
          impact,
          nearest,
          cover.filter((other) => other !== r),
        )
      )
        continue;
      r.hp = Math.max(0, (r.hp ?? TERRAIN.hp) - amount);
      this.terrainRevision++;
      if (r.hp === 0) {
        demolished = true;
        this.cover = this.cover.filter((other) => other !== r);
        this.rubble.push({ ...r });
        this.effects.push({
          x: r.x + r.w / 2,
          y: r.y + r.h / 2,
          kind: "debris",
          time: 0.7,
          size: r.w / 2,
        });
        this.note("Cover demolished. New route, new problems.");
      }
    }
    // Recompute active routes immediately when the obstacle layout changes.
    if (demolished) {
      for (const s of this.soldiers)
        if (s.goal)
          s.path = pathfind(
            s,
            s.goal,
            s.safeRoute ? this.dryCover() : this.cover,
          );
      for (const m of this.medics)
        if (m.phase === "in")
          m.path = pathfind(m, this.get(m.target)!, this.cover);
    }
  }
  callMedic(id: number, side: Side) {
    const t = this.get(id);
    if (
      !t ||
      t.side !== side ||
      t.life !== "down" ||
      this.calls[side] <= 0 ||
      this.medics.some((m) => m.target === id)
    )
      return false;
    this.calls[side]--;
    this.medics.push({
      x: side === 0 ? 10 : FIELD.width - 10,
      y: t.y,
      target: id,
      side,
      phase: "in",
      timer: 0,
      path: pathfind(
        { x: side === 0 ? 18 : FIELD.width - 18, y: t.y },
        t,
        this.cover,
      ),
    });
    this.note(`${side === 0 ? "Your" : "Enemy"} medic is on the way.`);
    return true;
  }
  startBrawl(a: Soldier, b: Soldier) {
    a.brawl = b.id;
    b.brawl = a.id;
    a.blocking = false;
    b.blocking = false;
    a.autoGuardTime = 0;
    b.autoGuardTime = 0;
    a.path = [];
    b.path = [];
    a.goal = null;
    b.goal = null;
    a.facing = a.x < b.x || (a.x === b.x && a.id < b.id) ? 1 : -1;
    b.facing = -a.facing;
    const anchor = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    a.fightAnchor = { ...anchor };
    b.fightAnchor = { ...anchor };
    a.fightFacing = a.facing;
    b.fightFacing = b.facing;
    a.fightMoveTime = 0;
    b.fightMoveTime = 0;
    a.brawlCd = 0.3;
    b.brawlCd = 0.5;
    this.stats.brawls++;
    this.effects.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      kind: "brawl",
      time: 0.65,
      size: 35,
    });
    for (const s of this.soldiers)
      if (s !== a && s !== b && s.life === "alive" && distance(s, a) < 65) {
        const angle = Math.atan2(s.y - a.y, s.x - a.x);
        const p = safePoint(
          {
            x: s.x + Math.cos(angle) * TUNING.knockback,
            y: s.y + Math.sin(angle) * TUNING.knockback,
          },
          this.cover,
        );
        s.x = p.x;
        s.y = p.y;
      }
  }
  brawlHit(s: Soldier, kind: "punch" | "kick") {
    if (s.brawl === null || s.brawlCd > 0 || s.blocking) return;
    const t = this.get(s.brawl);
    if (!t || t.life !== "alive") return;
    s.flash = 0;
    s.fightMove = kind;
    s.fightMoveTime =
      kind === "kick" ? TUNING.kickAnimation : TUNING.punchAnimation;
    t.recoilTime = TUNING.recoilAnimation;
    t.recoilBlocked = t.blocking;
    this.meleeEvents.push({
      id: this.meleeEventId++,
      kind,
      blocked: t.blocking,
    });
    if (this.meleeEvents.length > 32) this.meleeEvents.shift();
    this.effects.push({
      x: (s.x + t.x) / 2,
      y: (s.y + t.y) / 2,
      impactFacing: s.fightFacing,
      kind: t.blocking ? "block" : kind,
      time: 0.28,
      size: 18,
    });
    s.brawlCd = kind === "kick" ? TUNING.kickCooldown : TUNING.brawlCooldown;
    const amount = kind === "kick" ? TUNING.kickDamage : TUNING.brawlDamage;
    this.damage(t, amount * (t.blocking ? TUNING.blockReduction : 1));
  }
  chooseTarget(s: Soldier) {
    const w = CLASSES[s.classId];
    return this.soldiers
      .filter((t) => t.side !== s.side && t.life === "alive")
      .sort((a, b) => {
        const score = (t: Soldier) =>
          distance(s, t) +
          t.hp * 0.4 +
          (this.safeBlast(s, t) ? 0 : TUNING.aiUnsafeBlastPenalty) +
          this.soldiers.filter(
            (o) =>
              o !== s &&
              o.side === s.side &&
              o.life === "alive" &&
              o.target === t.id,
          ).length *
            32 +
          (w.arc ? 0 : blocked(s, t, this.cover) ? 100 : 0) -
          (w.radius
            ? this.soldiers.filter(
                (o) =>
                  o.side !== s.side &&
                  o.life === "alive" &&
                  distance(o, t) < w.radius,
              ).length * 25
            : 0);
        return score(a) - score(b) || a.id - b.id;
      })[0];
  }
  ai(s: Soldier) {
    const t = this.chooseTarget(s);
    if (!t) return;
    const w = CLASSES[s.classId],
      d = distance(s, t);
    s.target = t.id;
    if (s.hp < w.hp * TUNING.aiRetreatHp && this.time >= s.retreatReady) {
      s.retreatUntil = this.time + TUNING.aiRetreatDuration;
      s.retreatReady = this.time + TUNING.aiRetreatCooldown;
    }
    if (this.time < s.retreatUntil && d < w.range + 40) {
      const angle = Math.atan2(s.y - t.y, s.x - t.x);
      this.setGoal(s, {
        x: s.x + Math.cos(angle) * 120,
        y: s.y + Math.sin(angle) * 120,
      });
      return;
    }
    if (this.inWater(s)) {
      // Finish an existing crossing instead of stopping to fire mid-river.
      if (s.path.length && s.goal && !this.inWater(s.goal)) return;
      this.setGoal(s, safePoint(s, this.dryCover()));
      return;
    }
    if (
      d > w.preferred + 35 ||
      (!w.arc && blocked(s, t, this.cover)) ||
      !this.safeBlast(s, t) ||
      d < w.preferred * 0.55
    ) {
      const candidates: Point[] = [];
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8;
        const p = {
          x: t.x + Math.cos(angle) * w.preferred,
          y: t.y + Math.sin(angle) * w.preferred,
        };
        if (
          legal(p, this.cover) &&
          !this.inWater(p) &&
          (w.arc || !blocked(p, t, this.cover))
        )
          candidates.push(p);
      }
      candidates.sort((a, b) => {
        const score = (p: Point) =>
          distance(s, p) +
          (this.safeBlast({ ...s, ...p }, t)
            ? 0
            : TUNING.aiUnsafePositionPenalty) +
          this.soldiers.filter(
            (e) =>
              e.side !== s.side &&
              e.life === "alive" &&
              !blocked(e, p, this.cover),
          ).length *
            24 +
          this.soldiers.filter(
            (o) =>
              o !== s &&
              o.side === s.side &&
              o.life === "alive" &&
              distance(o, p) < 45,
          ).length *
            60;
        return score(a) - score(b);
      });
      if (candidates[0]) this.setGoal(s, candidates[0]);
    } else {
      s.goal = null;
      s.path = [];
    }
  }
  step() {
    if (this.winner !== null) return;
    const dt = TUNING.step;
    this.tick++;
    this.time = this.tick * dt;
    this.effects = this.effects.filter((e) => (e.time -= dt) > 0);
    for (const s of this.soldiers) {
      s.cooldown -= dt;
      s.jam -= dt;
      s.flash -= dt;
      s.brawlCd -= dt;
      s.autoGuardTime = Math.max(0, s.autoGuardTime - dt);
      s.fightMoveTime = Math.max(0, s.fightMoveTime - dt);
      s.recoilTime = Math.max(0, s.recoilTime - dt);
      s.knockdownTime = Math.max(0, s.knockdownTime - dt);
      s.repath -= dt;
      s.think -= dt;
      s.moving = false;
      if (s.life !== "alive") continue;
      if (s.drowningTime > 0) {
        s.drowningTime = Math.max(0, s.drowningTime - dt);
        if (s.drowningTime <= 0) {
          s.hp = 0;
          s.life = "dead";
          s.death = "drowned";
          this.stats.drownings++;
          this.effects.push({ ...s, kind: "splash", time: 0.8, size: 30 });
          this.note(
            `${s.side === 0 ? "Your" : "Enemy"} ${CLASSES[s.classId].name} drowned. No medic rescue.`,
          );
        }
        continue;
      }
      this.updateWater(s);
      if (s.drowningTime > 0) continue;
      if (s.brawl !== null) {
        const t = this.get(s.brawl);
        if (!t || t.life !== "alive") {
          s.brawl = null;
          s.blocking = false;
        } else {
          if (s.id !== this.selected) {
            if (s.autoGuardTime <= 0 && s.brawlCd <= 0 && this.random() < 0.15)
              s.autoGuardTime = TUNING.autoBlockDuration;
            s.blocking = s.autoGuardTime > 0;
            if (!s.blocking && s.brawlCd <= 0)
              this.brawlHit(s, this.random() < 0.4 ? "kick" : "punch");
          }
          continue;
        }
      }
      if (this.aiSides.includes(s.side) && s.think <= 0) {
        s.think = TUNING.aiThink;
        this.ai(s);
      }
      if (s.terrainTarget && s.brawl === null) {
        const r = this.cover.find((r) => inside(s.terrainTarget!, r));
        if (!r) {
          s.terrainTarget = null;
          s.goal = null;
          s.path = [];
        } else {
          const contact =
            firstCoverHit(s, s.terrainTarget, this.cover)?.point ??
            s.terrainTarget;
          if (
            distance(s, contact) > CLASSES[s.classId].range &&
            s.repath <= 0
          ) {
            const angle = Math.atan2(s.y - contact.y, s.x - contact.x);
            this.setGoal(s, {
              x: contact.x + Math.cos(angle) * CLASSES[s.classId].preferred,
              y: contact.y + Math.sin(angle) * CLASSES[s.classId].preferred,
            });
          }
          if (distance(s, contact) <= CLASSES[s.classId].range) {
            s.goal = null;
            s.path = [];
            this.fireAt(s, s.terrainTarget);
          }
        }
      }
      const target = s.target === null ? null : this.get(s.target);
      if (target && target.life !== "alive") s.target = null;
      if (
        !this.aiSides.includes(s.side) &&
        target &&
        target.life === "alive" &&
        !s.hold &&
        !this.canShoot(s, target) &&
        s.repath <= 0
      ) {
        const w = CLASSES[s.classId],
          angle = Math.atan2(s.y - target.y, s.x - target.x);
        this.setGoal(s, {
          x: target.x + Math.cos(angle) * w.preferred,
          y: target.y + Math.sin(angle) * w.preferred,
        });
        if (
          s.path.length === 0 ||
          (!w.arc && blocked(s.goal!, target, this.cover))
        ) {
          const candidates = [];
          for (let i = 0; i < 16; i++) {
            const a = (i * Math.PI) / 8,
              p = {
                x: target.x + Math.cos(a) * w.preferred,
                y: target.y + Math.sin(a) * w.preferred,
              };
            if (
              legal(p, this.cover) &&
              (w.arc || !blocked(p, target, this.cover))
            )
              candidates.push(p);
          }
          candidates.sort((a, b) => distance(s, a) - distance(s, b));
          if (candidates[0]) this.setGoal(s, candidates[0]);
        }
      }
      if (s.path.length) {
        const p = s.path[0],
          d = distance(s, p),
          speed =
            CLASSES[s.classId].speed *
            (this.inWater(s) ? CLASSES[s.classId].waterSpeed : 1) *
            dt;
        if (d <= speed) {
          s.x = p.x;
          s.y = p.y;
          s.path.shift();
          if (!s.path.length) s.goal = null;
        } else {
          const next = {
            x: s.x + ((p.x - s.x) / d) * speed,
            y: s.y + ((p.y - s.y) / d) * speed,
          };
          if (!blocked(s, next, this.cover, 14)) {
            s.facing = next.x >= s.x ? 1 : -1;
            s.x = next.x;
            s.y = next.y;
            s.moving = true;
          } else if (s.goal && s.repath <= 0)
            this.setGoal(s, s.goal, s.safeRoute);
        }
      }
      this.updateWater(s);
      if (s.drowningTime > 0) continue;
      const aim =
        target && target.life === "alive" && this.canAutoShoot(s, target)
          ? target
          : this.soldiers
              .filter((t) => t.side !== s.side && this.canAutoShoot(s, t))
              .sort((a, b) => distance(s, a) - distance(s, b))[0];
      if (aim && !s.terrainTarget) this.fire(s, aim);
    }
    // Soft separation keeps allied silhouettes readable without moving held units far.
    for (let i = 0; i < this.soldiers.length; i++)
      for (let j = i + 1; j < this.soldiers.length; j++) {
        const a = this.soldiers[i],
          b = this.soldiers[j];
        if (
          a.side !== b.side ||
          a.life !== "alive" ||
          b.life !== "alive" ||
          a.brawl !== null ||
          b.brawl !== null ||
          a.drowningTime > 0 ||
          b.drowningTime > 0
        )
          continue;
        const d = distance(a, b);
        if (d < 24) {
          const angle =
              d < 0.01 ? (i + j) * 2.4 : Math.atan2(b.y - a.y, b.x - a.x),
            push = Math.min((24 - d) / 2, dt * 36);
          for (const [s, sign] of [
            [a, -1],
            [b, 1],
          ] as [Soldier, number][]) {
            const next = {
              x: s.x + Math.cos(angle) * push * sign,
              y: s.y + Math.sin(angle) * push * sign,
            };
            const obstacles = s.safeRoute ? this.dryCover() : this.cover;
            if (legal(next, obstacles) && !blocked(s, next, obstacles, 14)) {
              s.x = next.x;
              s.y = next.y;
            }
          }
        }
      }
    for (const s of this.soldiers) this.updateWater(s);
    for (const a of this.soldiers.filter(
      (s) => s.life === "alive" && s.brawl === null && s.drowningTime <= 0,
    ))
      for (const b of this.soldiers) {
        if (
          a.brawl === null &&
          b.life === "alive" &&
          b.drowningTime <= 0 &&
          b.brawl === null &&
          a.side !== b.side &&
          distance(a, b) < TUNING.brawlRange &&
          !blocked(a, b, this.cover)
        )
          this.startBrawl(a, b);
      }
    for (const shot of this.shots) shot.time += dt;
    for (const shot of this.shots.filter((p) => p.time >= p.duration))
      this.resolveShot(shot);
    this.shots = this.shots.filter((p) => p.time < p.duration);
    for (const m of this.medics) {
      const t = this.get(m.target)!;
      const goal =
        m.path[0] ??
        (m.phase === "in"
          ? t
          : { x: m.side === 0 ? -30 : FIELD.width + 30, y: m.y });
      const d = distance(m, goal);
      if (d > 8) {
        m.x += ((goal.x - m.x) / d) * TUNING.medicSpeed * dt;
        m.y += ((goal.y - m.y) / d) * TUNING.medicSpeed * dt;
      } else if (m.path.length) {
        m.path.shift();
      } else if (m.phase === "in") {
        m.timer += dt;
        if (m.timer > 0.8) {
          if (t.life === "down") {
            t.life = "alive";
            t.wasInWater = false;
            t.drowningTime = 0;
            t.hp = CLASSES[t.classId].hp * TUNING.reviveHealth;
            t.cooldown = 1;
            t.target = null;
            t.brawl = null;
            t.fightMove = null;
            t.fightMoveTime = 0;
            t.recoilTime = 0;
            t.brawlKnockdown = false;
            t.knockdownTime = 0;
            t.fightAnchor = null;
            t.blocking = false;
            this.stats.revives++;
            this.effects.push({ ...t, kind: "revive", time: 1, size: 25 });
            this.note("Back on duty. Complaint form denied.");
          }
          m.phase = "out";
          m.path = pathfind(
            m,
            { x: m.side === 0 ? 18 : FIELD.width - 18, y: m.y },
            this.cover,
          );
        }
      }
    }
    this.medics = this.medics.filter(
      (m) => m.x > -25 && m.x < FIELD.width + 25,
    );
    if (this.time >= this.nextMedic) {
      this.nextMedic = this.time + TUNING.aiMedicDelay;
      for (const side of this.aiSides) {
        const t = this.soldiers.find(
          (s) =>
            s.side === side &&
            s.life === "down" &&
            !this.medics.some((m) => m.target === s.id),
        );
        if (t) this.callMedic(t.id, side);
      }
    }
    const alive = (side: Side) =>
      this.soldiers.some((s) => s.side === side && s.life === "alive");
    if (!this.training && (!alive(0) || !alive(1))) {
      this.winner = alive(0) ? 0 : 1;
      this.note(
        this.winner === 0
          ? "Victory. The paperwork begins."
          : "Defeat. Blame the paperwork.",
      );
    }
  }
  replay(): Replay {
    return {
      version: 1,
      seed: this.seed,
      squad: this.squad,
      training: this.training,
      aiSides: [...this.aiSides],
      commands: this.commands,
    };
  }
}
export function replayBattle(replay: Replay, ticks: number) {
  const battle = new Battle(
    replay.seed,
    replay.squad,
    replay.training ?? false,
  );
  battle.aiSides = replay.aiSides ? [...replay.aiSides] : [1];
  let i = 0;
  for (let t = 0; t < ticks; t++) {
    while (
      i < replay.commands.length &&
      replay.commands[i].tick === battle.tick
    )
      battle.command(replay.commands[i++].command, false);
    battle.step();
    if (battle.winner !== null) break;
  }
  return battle;
}
