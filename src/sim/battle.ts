import { trafficMove, reserveEnemyGoal, TRAFFIC } from "./traffic";
import { centeredRoll } from "./luck";
import { RUN_LIGHT, COMEBACK, CHEST_LABELS, type ChestReward, type GearDrop, type RewardChest } from "./comeback";
import { RAIN, SNOW_SPEED, weatherAdvice, type Weather } from "./weather";
import { MAPS, difficulty, validMapId, validMode, enemyBrief, type DifficultyMode } from "./maps";
import { scatterAirstrike, AIRSTRIKE_ACCURACY, type AirstrikeAccuracy } from "./airstrike";
import { headingOf, inView } from "./vision";
import {
  CLASSES,
  SUPPLY_POINTS,
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
  unarmed?: boolean;
  recoveringGear?: boolean;
  traffic?: number;
  takingCover?: boolean;
  steadyTime?: number;
  heat?: number;
  overheated?: boolean;
  formationSpeed?: number;
  side: Side;
  slot: number;
  classId: ClassId;
  hp: number;
  burnRemaining: number;
  life: Life;
  death: "skeleton" | "ash" | "drowned" | null;
  target: number | null;
  terrainTarget: Point | null;
  goal: Point | null;
  path: Point[];
  hold: boolean;
  cooldown: number;
  // Automatic fire waits longer than the physical reload; Fire all bypasses this wait.
  autoFireWait?: number;
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
  heading?: number;
  watchAngle?: number;
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
  id: number;
  hp: number;
  burnRemaining: number;
  life: "alive" | "dead";
  death: "skeleton" | "ash" | null;
  side: Side;
  target: number;
  phase: "in" | "out";
  timer: number;
  path: Point[];
}
export type Combatant = Soldier | Medic;
export interface Shot {
  damageScale?: number;
  critical?: boolean;
  id: number;
  from: Point;
  to: Point;
  owner: number;
  classId: ClassId;
  target: number;
  time: number;
  duration: number;
  aim?: Point;
  manual?: boolean;
  hitCover?: boolean;
  miss?: boolean;
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
export const SUPPLY_WEAPONS = ["airstrike", "sniper"] as const;
export type SuperWeapon = (typeof SUPPLY_WEAPONS)[number];
export const SUPER_LABELS: Record<SuperWeapon, string> = {
  airstrike: "Airstrike",
  sniper: "Sniper shot",
};
export type Command =
  | { type: "drop-gear" | "recover-gear"; id: number }
  | { type: "face"; id: number; point: Point }
  | { type: "cover"; id: number; active: boolean }
  | { type: "squad-move"; point: Point }
  | { type: "super"; side: Side; weapon: SuperWeapon; point: Point }
  | { type: "fire-all" }
  | { type: "aim"; id: number; point: Point }
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
  deploymentSeconds?: number;
  aiSides?: Side[];
  operation?: {mapId:number;level:number;mode?:DifficultyMode};
  commands: { tick: number; command: Command }[];
}
export interface CombatEvent {
  id: number;
  classId: ClassId;
  kind: "fire" | "impact" | "hit";
}
export class Battle {
  supplies = SUPPLY_POINTS.map((p, id) => ({
    ...p,
    id,
    claimedBy: null as Side | null,
  }));
  gear: GearDrop[]=[];
  chests: RewardChest[]=[];
  chestsSpawned=0;
  chestsOpened=0;
  nextChestAt: number=COMEBACK.first;
  get chestStatus() {
    const live=this.chests.find(c=>c.claimedBy===null);
    if(live)return `CHEST LIVE · ${Math.max(0,Math.ceil(live.expiresAt-this.time))}s left`;
    return this.chestsSpawned<COMEBACK.limit ? `NEXT CHEST IN ${Math.max(0,Math.ceil(this.nextChestAt-this.time))}s` : "NO MORE CHESTS THIS MAP";
  }
  powers: [SuperWeapon[], SuperWeapon[]] = [[], []];
  strikes: {
    id: number;
    side: Side;
    point: Point;
    requested: Point;
    accuracy: AirstrikeAccuracy;
    remaining: number;
    impacted: boolean;
    dropped: boolean;
  }[] = [];
  airstrikeEvents: { id: number; kind: "warning" | "drop" | "impact" }[] = [];
  private airstrikeId = 0;
  private airstrikeEventId = 0;
  emitAirstrike(kind: "warning" | "drop" | "impact") {
    this.airstrikeEvents.push({ id: this.airstrikeEventId++, kind });
    if (this.airstrikeEvents.length > 32) this.airstrikeEvents.shift();
  }
  supplyRevision = 0;
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
  combatTicks = 0;
  planningTicks = 0;
  get planning() {
    return this.planningTicks > 0;
  }
  get countdown() {
    return Math.ceil(this.planningTicks * TUNING.step);
  }
  time = 0;
  soldiers: Soldier[] = [];
  medics: Medic[] = [];
  // -1 is reserved for projectiles aimed at terrain rather than a unit.
  nextMedicId = -2;
  calls = [TUNING.medicCalls, TUNING.medicCalls];
  shots: Shot[] = [];
  effects: Effect[] = [];
  cover: Cover[] = COVER.map((r) => ({ ...r, hp: TERRAIN.hp }));
  rubble: Cover[] = [];
  terrainRevision = 0;
  trafficNoticeAt = -10;
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
    readonly deploymentSeconds = 0,
    readonly operation?: {mapId:number;level:number;mode?:DifficultyMode},
  ) {
    this.planningTicks = training
      ? 0
      : Math.round(deploymentSeconds / TUNING.step);
    if (training) this.supplies = [];
    if (training)
      this.cover = TRAINING_COVER.map((r) => ({ ...r, hp: TERRAIN.hp }));
    if (!training && operation) {
      if((operation.mode!==undefined&&!validMode(operation.mode))||!validMapId(operation.mapId)||!Number.isInteger(operation.level)||operation.level<1||operation.level>10)throw new Error("Invalid campaign operation");
      const map=MAPS[operation.mapId];
      this.cover=map.cover.map(r=>({...r,hp:TERRAIN.hp}));
      this.water=map.water.map(r=>({...r}));this.bridges=map.bridges.map(r=>({...r}));
      this.supplies=map.supplies.map((p,id)=>({...p,id,claimedBy:null}));
    }
    this.seed = seed >>> 0;
    this.rngState = this.seed;
    this.squad = squad;
    const enemy = Math.floor(this.random() * SQUADS.length);
    for (const side of (training ? [0] : [0, 1]) as Side[])
      (side === 0 ? SQUADS[squad].classes : operation?.level===1 ? ["rifleman","rifleman","lobber"] as ClassId[] : SQUADS[enemy].classes).forEach(
        (classId, slot) => {
          this.soldiers.push({
            id: side * 5 + slot,
            side,
            slot,
            classId,
            x: side === 0 ? 105 : 995,
            y: training ? 160 + slot * 70 : 75 + slot * 99,
            hp: CLASSES[classId].hp,
            burnRemaining: 0,
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
    if(!training && operation) {
      const d=difficulty(operation.level,operation.mode);
      this.soldiers=this.soldiers.filter(s=>s.side===0||s.slot<d.enemyCount);
      this.soldiers.filter(s=>s.side===1).forEach(s=>{s.hp=Math.round(CLASSES[s.classId].hp*d.enemyHealth);});
      if(d.tactics>=3) {
        const roster:ClassId[]=operation.mode==="hard"&&operation.level>=5 ? ["bazooka","bazooka","lobber","bazooka","lobber"] : ["rifleman","bazooka","lobber","bazooka",this.weather==="rain"?"rifleman":"torch"];
        this.soldiers.filter(s=>s.side===1).forEach(s=>{s.classId=roster[s.slot];s.hp=this.maxHp(s);});
      }
      this.note(`Enemy briefing: ${enemyBrief(operation.level,operation.mode)}.`);
      this.note(`Stage ${operation.level}/10: ${MAPS[operation.mapId].name}.`);
      if(this.weather!=="clear")this.note(this.weather==="rain" ? "Rain: Torch weakened. Favor rifles and explosives." : "Deep snow: heavy troops slowed. Light troops lead.");
    } else this.note("Operation: questionable decisions.");
  }
  maxHp(s:Soldier) {return Math.round((s.unarmed ? RUN_LIGHT.hp : CLASSES[s.classId].hp)*(s.side===1 ? this.challenge?.enemyHealth ?? 1 : 1));}
  get challenge() { return this.operation ? difficulty(this.operation.level,this.operation.mode) : null; }
  get weather(): Weather { return !this.training && this.operation ? MAPS[this.operation.mapId].environment.weather ?? "clear" : "clear"; }
  get weatherAdvice() {return weatherAdvice(this.weather);}
  weaponRange(s:Soldier) {return CLASSES[s.classId].range * (s.classId==="torch" && this.weather==="rain" ? RAIN.flameRange : 1);}
  preferredRange(s:Soldier) {return s.classId==="torch" && this.weather==="rain" ? Math.min(CLASSES[s.classId].preferred,this.weaponRange(s)*.8) : CLASSES[s.classId].preferred;}
  movementMultiplier(s:Soldier) {
    return this.weather==="snow" && !this.inWater(s) && !this.bridges.some(r=>inside(s,r)) ? (s.unarmed ? .95 : SNOW_SPEED[s.classId]) : 1;
  }

  landSpeed(s:Soldier) {return s.unarmed ? RUN_LIGHT.speed : CLASSES[s.classId].speed;}
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
  combatants(): Combatant[] {
    return [...this.soldiers, ...this.medics];
  }
  getCombatant(id: number) {
    return this.get(id) ?? this.medics.find((m) => m.id === id);
  }
  command(c: Command, record = true) {
    if (this.winner !== null) return;
    if (record)
      this.commands.push({ tick: this.tick, command: structuredClone(c) });
    if (
      this.planning &&
      !["select", "move", "squad-move", "bridge", "hold", "cover", "face", "drop-gear", "recover-gear"].includes(
        c.type,
      )
    ) {
      this.note("Deployment: queue movement orders. Weapons unlock at GO.");
      return;
    }
    if (c.type === "squad-move") {
      this.moveSquad(c.point);
      return;
    }
    if (c.type === "super") {
      this.useSuper(c.side, c.weapon, c.point);
      return;
    }
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
    if (!s || s.life !== "alive" || s.drowningTime > 0)
      return;
    if(c.type==="drop-gear") {this.dropGear(s);return;}
    if(c.type==="recover-gear") {this.recoverGear(s);return;}
    if(s.unarmed && (c.type==="attack"||c.type==="demolish"||c.type==="aim")) {this.note("Unarmed: recover your gear before shooting. Move away or collect a chest.");return;}
    if(["move","bridge","hold","cover"].includes(c.type))s.recoveringGear=false;
    if (
      ["move", "bridge", "attack", "demolish", "hold", "aim"].includes(c.type)
    )
      s.formationSpeed = undefined;
    if (c.type === "cover") {
      if (c.active && (s.brawl !== null || this.inWater(s))) {
        this.note("Take cover on dry ground, outside a brawl.");
        return;
      }
      if (c.active && !s.takingCover) {
        s.cooldown = Math.max(0, s.cooldown) * TUNING.coverReloadMultiplier;
        s.autoFireWait = (s.autoFireWait ?? 0) * TUNING.coverReloadMultiplier;
        s.steadyTime = 0;
      }
      s.takingCover = c.active;
      s.hold = true;
      s.path = [];
      s.goal = null;
      s.target = null;
      s.terrainTarget = null;
      s.formationSpeed = undefined;
      s.moving = false;
      this.note(
        `${CLASSES[s.classId].name}: ${c.active ? "taking cover. Harder to hit; fires half as often. Leave cover before moving." : "left cover. Ready for movement orders."}`,
      );
      return;
    }
    if (s.takingCover && (c.type === "move" || c.type === "bridge")) {
      this.note("Leave cover before moving this soldier.");
      return;
    }
    if (c.type === "face") {
      if (s.brawl !== null || distance(s.goal ?? s, c.point) < 1) return;
      s.watchAngle = Math.atan2(c.point.y - (s.goal?.y ?? s.y), c.point.x - (s.goal?.x ?? s.x));
      s.target = null;
      s.terrainTarget = null;
      if (!s.path.length) {
        this.setHeading(s, s.watchAngle);
        s.hold = true;
      }
      this.note(`${CLASSES[s.classId].name}: ${s.path.length ? "will face that direction on arrival." : "watching that firing lane."}`);
      return;
    }
    if (c.type === "aim") {
      this.aimTorch(s, c.point);
      return;
    }
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
      if (r?.indestructible) {this.note("Permanent cover: explosives cannot destroy it. Flank around it.");return;}
      if (r) {
        this.facePoint(s, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
        s.watchAngle = undefined;
        s.terrainTarget = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
        s.target = null;
        s.goal = null;
        s.path = [];
        s.hold = !!s.takingCover;
      }
    }
    if ((c.type === "move" || c.type === "bridge") && s.brawl === null && !s.takingCover) s.watchAngle = undefined;
    if (c.type === "move" && s.brawl === null) {
      s.terrainTarget = null;
      s.target = null;
      s.hold = false;
      this.setGoal(s, c.point);
    }
    if (c.type === "attack" && s.brawl === null) {
      const t = this.getCombatant(c.target);
      if (t && t.side !== s.side && t.life === "alive") {
        if (this.isManualTorch(s)) {
          this.aimTorch(s, t);
          return;
        }
        s.terrainTarget = null;
        this.facePoint(s, t);
        s.watchAngle = undefined;
        s.target = t.id;
        s.hold = !!s.takingCover;
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
  moveSquad(point: Point) {
    const units = this.soldiers
      .filter(
        (s) =>
          s.side === 0 &&

          !s.takingCover &&
          s.life === "alive" &&
          s.drowningTime <= 0 &&
          s.brawl === null,
      )
      .sort((a, b) => a.slot - b.slot);
    const routes = units.map((s, i) => {
      s.target = null;
      s.terrainTarget = null;
      s.hold = false;
      s.recoveringGear=false;
      s.watchAngle = undefined;
      this.setGoal(s, {
        x: point.x + (i % 2) * 22,
        y: point.y + (i - (units.length - 1) / 2) * 48,
      });
      let length = 0,
        prev: Point = s;
      for (const p of s.path) {
        length += distance(prev, p);
        prev = p;
      }
      return { s, length };
    });
    const duration = Math.max(
      0,
      ...routes.map((r) => r.length / (this.landSpeed(r.s)*this.movementMultiplier(r.s))),
    );
    for (const { s, length } of routes)
      s.formationSpeed =
        duration > 0
          ? Math.min(this.landSpeed(s), length / duration / this.movementMultiplier(s))
          : undefined;
    this.note(
      `Squad movement: ${units.length} troops to spaced positions. Moving troops hold fire.`,
    );
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
    if (s.takingCover) return;
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
    if(s.side===1)s.goal=reserveEnemyGoal(s,s.goal,this.soldiers,obstacles);
    s.path = pathfind(s, s.goal, obstacles);
    if (s.path.length) s.steadyTime = 0;
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
      if (!this.training && this.random() < (s.unarmed ? RUN_LIGHT.drowningRisk : CLASSES[s.classId].drowningRisk)*(1-.75*this.fortune(s.side))) {
        s.takingCover = false;
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
  setHeading(s: Soldier, angle: number) {
    const delta = Math.atan2(Math.sin(angle - headingOf(s)), Math.cos(angle - headingOf(s)));
    if (Math.abs(delta) > 0.01) s.steadyTime = 0;
    s.heading = angle;
    s.facing = Math.cos(angle) < -1e-8 ? -1 : 1;
  }
  facePoint(s: Soldier, point: Point) {
    if (distance(s, point) > 1e-8) this.setHeading(s, Math.atan2(point.y - s.y, point.x - s.x));
  }
  canShoot(s: Soldier, t: Combatant) {
    const w = CLASSES[s.classId];
    return (
      !this.planning &&
      !s.unarmed &&
      s.life === "alive" &&
      s.drowningTime <= 0 &&
      (!("classId" in t) || t.drowningTime <= 0) &&
      t.life === "alive" &&
      s.brawl === null &&
      s.fightMoveTime <= 0 &&
      s.jam <= 0 &&
      distance(s, t) <= this.weaponRange(s) &&
      !(s.classId === "torch" && this.inWater(s)) &&
      (w.arc || s.classId === "bazooka" || !blocked(s, t, this.cover))
    );
  }
  safeBlast(s: Soldier, target: Point) {
    const w = CLASSES[s.classId];
    if (!w.radius || s.classId === "torch") return true;
    const impact = firstCoverHit(s, target, this.cover)?.point ?? target;
    return !this.combatants().some((friend) => {
      const point = friend.id === s.id ? s : friend;
      return (
        friend.side === s.side &&
        friend.life === "alive" &&
        (!("classId" in friend) || friend.drowningTime <= 0) &&
        distance(point, impact) <= w.radius &&
        !blocked(impact, point, this.cover)
      );
    });
  }
  canAutoShoot(s: Soldier, t: Combatant) {
    return (
      this.canShoot(s, t) && inView(s, t) &&
      (!this.aiSides.includes(s.side) || this.safeBlast(s, t))
    );
  }
  tickBurn(target: Combatant, dt: number) {
    if (target.life !== "alive" || this.training || this.inWater(target)) {
      target.burnRemaining = 0;
      return;
    }
    if (target.burnRemaining <= 0) return;
    const duration = Math.min(dt, target.burnRemaining);
    target.burnRemaining = Math.max(0, target.burnRemaining - dt);
    const amount = TUNING.burnDamagePerSecond * duration * (this.weather==="rain" ? RAIN.burnDamage : 1);
    this.damage(target, amount, "torch", amount >= target.hp);
  }
  damage(
    target: Combatant,
    amount: number,
    classId: ClassId | null = null,
    lethal = false,
  ) {
    if (this.training || this.planning || target.life !== "alive") return;
    if (!("classId" in target)) {
      const instant =
        lethal ||
        (classId !== null && this.random() < CLASSES[classId].instant);
      target.hp = instant ? 0 : Math.max(0, target.hp - amount);
      this.effects.push({ ...target, kind: "hit", time: 0.25, size: 10 });
      if (target.hp === 0) {
        target.life = "dead";
        target.burnRemaining = 0;
        target.death = classId === "torch" ? "ash" : "skeleton";
        target.path = [];
        target.timer = 0;
        this.note(
          `${target.side === 0 ? "Your" : "Enemy"} medic was killed. The call is spent.`,
        );
      }
      return;
    }
    if (target.drowningTime > 0) return;
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
      target.recoveringGear = false;
      target.takingCover = false;
      target.traffic = 0;
      target.burnRemaining = 0;
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
  aimDelay(s: Soldier) { return s.classId === "bazooka" ? TUNING.rocketAimTime : TUNING.aimSettleTime; }
  isManualTorch(s: Soldier) {
    return (
      s.side === 0 &&
      s.classId === "torch" && !s.unarmed &&
      s.id === this.selected &&
      !this.aiSides.includes(0)
    );
  }
  aimTorch(s: Soldier, point: Point) {
    if (
      !this.isManualTorch(s) ||
      this.planning ||

      s.life !== "alive" ||
      s.brawl !== null ||
      s.drowningTime > 0
    )
      return false;
    if (s.cooldown > 0) {
      this.note(`Torch recovering: ${s.cooldown.toFixed(1)}s.`);
      return false;
    }
    if (s.moving || s.path.length) { this.note("Torch: stop moving before spraying."); return false; }
    if (s.overheated) { this.note("Torch overheated: let the tank cool."); return false; }
    const d = distance(s, point),
      range = this.weaponRange(s);
    if (d < 1e-8) return false;
    const endpoint = { x: s.x + (point.x - s.x) / d * range, y: s.y + (point.y - s.y) / d * range };
    const fired = this.fireAt(s, endpoint, -1, false, true);
    if (fired) {
      s.target = null;
      s.terrainTarget = null;
      s.goal = null;
      s.path = [];
      s.moving = false;
    }
    return fired;
  }
  fireAll() {
    let fired = 0;
    for (const s of this.soldiers) {
      if (
        s.side !== 0 ||

        s.life !== "alive" ||
        s.moving ||
        s.path.length > 0
      )
        continue;
      if (s.terrainTarget) {
        if (this.fireAt(s, s.terrainTarget)) fired++;
        continue;
      }
      const ordered =
        s.target === null ? undefined : this.getCombatant(s.target);
      const target =
        ordered && ordered.side !== s.side && inView(s, ordered) && this.canShoot(s, ordered)
          ? ordered
          : this.combatants()
              .filter((t) => t.side !== s.side && inView(s, t) && this.canShoot(s, t))
              .sort(
                (a, b) => distance(s, a) - distance(s, b) || a.id - b.id,
              )[0];
      if (
        target
          ? this.fire(s, target)
          : this.fireDistant(s, this.nearestEnemy(s, true))
      )
        fired++;
    }
    this.note(
      fired
        ? `Fire all: ${fired} stationary soldier${fired === 1 ? "" : "s"} fired at commanded pace.`
        : "Fire all: no stationary soldiers ready to fire.",
    );
    return fired;
  }
  nearestEnemy(s: Soldier, visibleOnly = false) {
    return this.combatants()
      .filter(
        (t) =>
          t.side !== s.side &&
          (!visibleOnly || inView(s, t)) &&
          t.life === "alive" &&
          (!("classId" in t) || t.drowningTime <= 0),
      )
      .sort((a, b) => distance(s, a) - distance(s, b) || a.id - b.id)[0];
  }
  fireDistant(s: Soldier, target: Combatant | undefined) {
    if (
      this.planning ||
      !target ||
      !inView(s, target) ||
      target.life !== "alive" ||
      target.side === s.side
    )
      return false;
    const d = distance(s, target),
      range = this.weaponRange(s);
    if (d <= range) return false;
    // Aim toward the enemy, but stop the visual projectile at weapon range.
    // These guaranteed misses cannot damage units; intercepted explosives still damage cover.
    return this.fireAt(
      s,
      {
        x: s.x + ((target.x - s.x) / d) * range,
        y: s.y + ((target.y - s.y) / d) * range,
      },
      target.id,
      true,
    );
  }
  fire(s: Soldier, t: Combatant) {
    if (s.cooldown > 0 || !this.canShoot(s, t)) return false;
    return this.fireAt(s, t, t.id);
  }
  fireAt(s: Soldier, point: Point, target = -1, miss = false, manual = false) {
    const w = CLASSES[s.classId];
    if(s.unarmed)return false;
    if (manual && !this.isManualTorch(s)) return false;
    if (!manual && !inView(s, point)) return false;
    const d = distance(s, point);
    // Validate intended range before scattering; cover may be closer than the target.
    const intendedHit = firstCoverHit(s, point, this.cover);
    if (
      this.planning ||
      s.life !== "alive" ||
      s.drowningTime > 0 ||
      s.brawl !== null ||
      s.fightMoveTime > 0 ||
      s.cooldown > 0 ||
      s.jam > 0 ||
      s.moving || s.path.length > 0 ||
      (!manual && (s.steadyTime ?? this.aimDelay(s)) < this.aimDelay(s)) ||
      (s.classId === "torch" && s.overheated) ||
      distance(s, intendedHit?.point ?? point) > this.weaponRange(s) + 1e-8 ||
      (s.classId === "torch" && this.inWater(s))
    )
      return false;
    s.cooldown =
      w.cooldown * (s.side===1 ? this.challenge?.enemyReload ?? 1 : 1) * (this.fortune(s.side)>0?1-this.random()*.35*this.fortune(s.side):1) * (s.takingCover ? TUNING.coverReloadMultiplier : 1);
    if (s.classId === "torch") {
      s.heat = Math.min(TUNING.flameMaxHeat, (s.heat ?? 0) + TUNING.flameBurstHeat);
      if (s.heat >= TUNING.flameMaxHeat) s.overheated = true;
    }
    s.autoFireWait = s.cooldown * TUNING.passiveFireMultiplier * (s.side===1 ? this.challenge?.volley ?? 1 : 1);
    s.flash = 0.2;
    if (manual) { this.facePoint(s, point); s.watchAngle = undefined; }
    this.stats.shots++;
    if (w.jam && this.random() < w.jam*(1-.9*this.fortune(s.side))) {
      s.jam = TUNING.jamDuration;
      this.effects.push({ ...s, kind: "jam", time: 1, size: 16 });
      this.note("Rifle jammed. Strongly worded memo pending.");
      return false;
    }
    let endpoint = { x: point.x, y: point.y };
    const intendedTarget = this.getCombatant(target);
    const coveredTarget =
      s.classId === "rifleman" &&
      intendedTarget &&
      "takingCover" in intendedTarget &&
      intendedTarget.takingCover;
    const spread = manual
      ? 0
      : (w.spread + (coveredTarget ? TUNING.coverRifleSpread : 0)) *
        (s.classId === "bazooka" && s.side === 1
          ? TUNING.enemyRocketScatter
          : 1) * (s.side===1 ? this.challenge?.enemySpread ?? 1 : 1);
    if (spread > 0 && (!miss || s.classId === "bazooka")) {
      const angle =
        Math.atan2(point.y - s.y, point.x - s.x) +
        (centeredRoll(()=>this.random(),this.fortune(s.side)) * spread * Math.PI) / 180;
      const radial =
        s.classId === "bazooka"
          ? 0.06 * (s.side === 1 ? TUNING.enemyRocketScatter : 1)
          : w.arc
            ? 0.015
            : 0;
      const reach = Math.min(
        this.weaponRange(s),
        d * (1 + centeredRoll(()=>this.random(),this.fortune(s.side)) * radial),
      );
      endpoint = {
        x: s.x + Math.cos(angle) * reach,
        y: s.y + Math.sin(angle) * reach,
      };
    }
    const hit = firstCoverHit(s, endpoint, this.cover);
    this.emitWeapon(s.classId, "fire");
    const duration = w.arc ? 0.65 : s.classId === "bazooka" ? 0.55 : 0.1;
    const fortune=this.fortune(s.side),critical=fortune>0&&this.random()<.3*fortune;
    this.shots.push({
      damageScale:fortune>0?(1+.5*fortune)*(critical?1.75:1):1,critical,
      id: this.shotId++,
      from: { x: s.x, y: s.y },
      to: hit?.point ?? endpoint,
      aim: { x: point.x, y: point.y },
      manual,
      hitCover: !!hit,
      miss,
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
    let damagedUnit = false;
    if (shot.miss) {
      this.effects.push({
        ...impact,
        kind: w.radius ? "boom" : "hit",
        classId: shot.classId,
        time: 0.35,
        size: Math.min(w.radius || 10, 18),
      });
      this.emitWeapon(shot.classId, "impact");
      if (!terrainHit) return;
    } else if (w.radius) {
      for (const t of this.combatants()) {
        if (t.life !== "alive") continue;
        if (shot.classId === "torch") {
          if (
            t.side === owner.side ||
            distance(shot.from, t) > this.weaponRange(owner) ||
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
            (shot.manual ? Math.cos(TUNING.manualFlameArc / 2) : 0.8)
          )
            continue;
        } else if (distance(t, impact) > w.radius || blocked(impact, t, cover))
          continue;
        const hpBefore = t.hp;
        this.damage(
          t,
          w.damage * (shot.damageScale??1) * (shot.classId==="torch" && this.weather==="rain" ? RAIN.flameDamage : 1),
          shot.classId,
          w.lethalRadius > 0 && distance(t, impact) <= w.lethalRadius,
        );
        if (t.hp < hpBefore) damagedUnit = true;
        if (
          shot.classId === "torch" &&
          t.life === "alive" &&
          !this.training &&
          !this.inWater(t)
        )
          t.burnRemaining = this.weather==="rain" ? RAIN.burnDuration : TUNING.burnDuration;
      }
      this.effects.push({
        ...impact,
        kind: "boom",
        classId: shot.classId,
        time: 0.5,
        size: w.radius,
      });
    } else if (!terrainHit) {
      const t = this.getCombatant(shot.target);
      if (
        t &&
        distance(t, impact) <
          ("takingCover" in t && t.takingCover ? TUNING.coverHitRadius : 42)
      )
        {const hp=t.hp;this.damage(t, w.damage*(shot.damageScale??1), shot.classId);damagedUnit=t.hp<hp;}
      else this.effects.push({ ...impact, kind: "hit", time: 0.25, size: 8 });
    } else {
      this.effects.push({ ...impact, kind: "hit", time: 0.25, size: 10 });
    }
    if(shot.critical&&damagedUnit)this.note("Enemy lucky hit! Use cover to break their firing lane.");
    if (!shot.miss)
      this.emitWeapon(
        shot.classId,
        shot.classId === "bazooka" && damagedUnit ? "hit" : "impact",
      );
    const amount = TERRAIN.damage[shot.classId];
    if (!amount) return;
    let demolished = false;
    for (const r of cover) {
      if(r.indestructible)continue;
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
        if (m.life === "alive" && m.phase === "in")
          m.path = pathfind(m, this.get(m.target)!, this.cover);
    }
  }
  damageCover(r: Cover, amount: number) {
    if(r.indestructible)return;
    r.hp = Math.max(0, (r.hp ?? TERRAIN.hp) - amount);
    this.terrainRevision++;
    if (r.hp === 0) {
      this.cover = this.cover.filter((o) => o !== r);
      this.rubble.push({ ...r });
      this.effects.push({
        x: r.x + r.w / 2,
        y: r.y + r.h / 2,
        kind: "debris",
        time: 0.7,
        size: r.w / 2,
      });
      for (const s of this.soldiers) {
        if (s.goal)
          s.path = pathfind(
            s,
            s.goal,
            s.safeRoute ? this.dryCover() : this.cover,
          );
      }
      for (const m of this.medics)
        if (m.life === "alive" && m.phase === "in")
          m.path = pathfind(m, this.get(m.target)!, this.cover);
    }
  }
  callMedic(id: number, side: Side) {
    const t = this.get(id);
    if (
      this.planning ||
      !t ||

      t.side !== side ||
      t.life !== "down" ||
      this.calls[side] <= 0 ||
      this.medics.some(
        (m) => m.life === "alive" && m.phase === "in" && m.target === id,
      )
    )
      return false;
    this.calls[side]--;
    this.medics.push({
      id: this.nextMedicId--,
      hp: TUNING.medicHealth,
      burnRemaining: 0,
      life: "alive",
      death: null,
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
    a.takingCover = false;
    b.takingCover = false;
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
    a.heading = a.facing < 0 ? Math.PI : 0;
    b.heading = b.facing < 0 ? Math.PI : 0;
    a.watchAngle = b.watchAngle = undefined;
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
  fortune(side:Side) {return side===1?this.challenge?.fortune??0:0;}
  aimAi(s:Soldier,point:Point) {
    // An AI may fire anywhere inside its held arc, just like a player soldier.
    // Do not restart the settle timer for every small movement of its target.
    if(s.side===1&&this.operation?.mode&&inView(s,point))return;
    this.facePoint(s,point);
  }
  get enemyTactics() {return this.challenge?.tactics??0;}
  threatAt(s:Soldier,p:Point) {
    return this.soldiers.filter(e=>e.side!==s.side&&e.life==="alive"&&!e.unarmed&&distance(e,p)<=this.weaponRange(e)&&inView(e,p)&&!blocked(e,p,this.cover)).length;
  }
  // Decisions run on the normal AI think clock, never frame-perfect reactions.
  assistedOrder(s:Soldier) {
    const tier=s.side===1?this.enemyTactics:0;
    if(!tier)return false;
    if(tier>=3) {
      const strike=this.strikes.find(a=>!a.impacted&&distance(s,a.point)<TUNING.airstrikeRadius+30);
      if(strike) {
        const radius=TUNING.airstrikeRadius+65;
        const candidates=Array.from({length:16},(_,i)=>({x:strike.point.x+Math.cos(i*Math.PI/8)*radius,y:strike.point.y+Math.sin(i*Math.PI/8)*radius}))
          .filter(p=>legal(p,this.dryCover())&&pathfind(s,p,this.dryCover()).length>0)
          .sort((a,b)=>distance(s,a)-distance(s,b));
        if(candidates[0]) {s.takingCover=false;s.hold=false;s.target=null;s.terrainTarget=null;this.setGoal(s,candidates[0],true);return true;}
      }
    }
    const target=this.chooseTarget(s);
    if(!target)return false;
    const range=distance(s,target),canEngage=this.canShoot(s,target)&&range<=this.weaponRange(s);
    const rifleThreat=this.soldiers.some(e=>e.side!==s.side&&e.life==="alive"&&e.classId==="rifleman"&&distance(e,s)>120&&distance(e,s)<this.weaponRange(e)&&inView(e,s)&&!blocked(e,s,this.cover));
    if(s.takingCover) {
      if(tier>=2&&canEngage&&rifleThreat&&s.hp<this.maxHp(s)*.75) {s.target=target.id;this.aimAi(s,target);return true;}
      s.takingCover=false;s.hold=false;
    }
    if(tier>=2&&!s.unarmed&&!this.inWater(s)&&!s.path.length&&canEngage&&rifleThreat&&s.hp<this.maxHp(s)*.65&&["rifleman","lobber"].includes(s.classId)) {
      s.takingCover=true;s.hold=true;s.path=[];s.goal=null;s.terrainTarget=null;s.formationSpeed=undefined;
      s.cooldown=Math.max(0,s.cooldown)*TUNING.coverReloadMultiplier;s.autoFireWait=(s.autoFireWait??0)*TUNING.coverReloadMultiplier;s.steadyTime=0;
      s.target=target.id;this.aimAi(s,target);return true;
    }
    if(tier>=4&&!s.unarmed&&["bazooka","sapper"].includes(s.classId)&&!this.inWater(s)) {
      const hit=firstCoverHit(s,target,this.cover);
      if(hit&&!hit.cover.indestructible&&distance(s,hit.point)<this.weaponRange(s)&&this.safeBlast(s,hit.point)) {
        s.target=null;s.terrainTarget={x:hit.cover.x+hit.cover.w/2,y:hit.cover.y+hit.cover.h/2};
        s.path=[];s.goal=null;s.hold=true;this.aimAi(s,s.terrainTarget);return true;
      }
    }
    return false;
  }
  chooseTarget(s: Soldier) {
    const w = CLASSES[s.classId];
    return this.combatants()
      .filter((t) => t.side !== s.side && t.life === "alive")
      .sort((a, b) => {
        const score = (t: Combatant) =>
          distance(s, t) +
          (s.side===1&&this.operation?.mode&&distance(s,t)<=this.weaponRange(s)&&!blocked(s,t,this.cover)?-180:0) +
          (s.side===1&&this.operation?.mode&&"classId" in t&&["bazooka","lobber"].includes(t.classId)?-60:0) +
          t.hp * (s.side===1&&this.enemyTactics>=1?.8:.4) +
          (this.safeBlast(s, t) ? 0 : TUNING.aiUnsafeBlastPenalty) +
          this.soldiers.filter(
            (o) =>
              o !== s &&
              o.side === s.side &&
              o.life === "alive" &&
              o.target === t.id,
          ).length *
            (s.side===1&&this.enemyTactics>=1?-55:32) +
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
    if(this.assistedOrder(s))return;
    s.terrainTarget=null;
    s.hold=false;
    const readyTarget=this.chooseTarget(s);
    if(s.side===1&&this.operation?.mode&&!this.inWater(s)&&readyTarget&&this.canShoot(s,readyTarget)&&!blocked(s,readyTarget,this.cover)&&this.safeBlast(s,readyTarget)&&distance(s,readyTarget)>=this.preferredRange(s)*.55) {
      s.target=readyTarget.id;s.path=[];s.goal=null;this.aimAi(s,readyTarget);return;
    }
    const chest=this.chests.find(c=>c.claimedBy===null&&c.expiresAt>this.time);
    if(chest&&!this.inWater(s)) {
      const runners=this.soldiers.filter(u=>u.side===s.side&&u.life==="alive"&&u.brawl===null&&u.drowningTime<=0&&!u.takingCover)
        .sort((a,b)=>distance(a,chest)/this.landSpeed(a)-distance(b,chest)/this.landSpeed(b)||a.id-b.id);
      const allies=this.soldiers.filter(u=>u.side===s.side&&u.life==="alive").length;
      const foes=this.soldiers.filter(u=>u.side!==s.side&&u.life==="alive").length;
      if(runners[0]?.id===s.id&&distance(s,chest)<(allies<foes?600:360)&&!this.soldiers.some(t=>t.side!==s.side&&t.life==="alive"&&distance(s,t)<95)){
        s.target=null;s.terrainTarget=null;this.setGoal(s,chest,true);return;
      }
    }

    if (this.powers[s.side].length === 0) {
      const routes = this.soldiers
        .filter(
          (unit) =>
            unit.side === s.side &&

            unit.life === "alive" &&
            unit.drowningTime <= 0 &&
            unit.brawl === null &&
            unit.hp >= this.maxHp(unit) * 0.7,
        )
        .flatMap((unit) =>
          this.supplies
            .filter((drop) => drop.claimedBy === null)
            .map((drop) => ({
              unit,
              drop,
              cost: distance(unit, drop) / (this.landSpeed(unit)*this.movementMultiplier(unit)),
            })),
        )
        .sort(
          (a, b) =>
            a.cost - b.cost || a.unit.id - b.unit.id || a.drop.id - b.drop.id,
        );
      const task = routes[0];
      if (
        task?.unit.id === s.id &&
        !this.soldiers.some(
          (t) =>
            t.side !== s.side && t.life === "alive" && distance(s, t) < 130,
        )
      ) {
        const drop = task.drop;
        s.target = null;
        s.terrainTarget = null;
        if (this.inWater(drop)) {
          s.goal = { x: drop.x, y: drop.y };
          s.path = pathfind(s, drop, this.cover);
          s.safeRoute = false;
          s.repath = 0.65;
        } else this.setGoal(s, drop);
        return;
      }
    }

    const t = this.chooseTarget(s);
    if (!t) return;
    const w = CLASSES[s.classId],
      d = distance(s, t);
    s.target = t.id;
    if (s.hp < this.maxHp(s) * TUNING.aiRetreatHp && this.time >= s.retreatReady) {
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
      d > this.preferredRange(s) + 35 ||
      (!w.arc && blocked(s, t, this.cover)) ||
      !this.safeBlast(s, t) ||
      d < this.preferredRange(s) * 0.55
    ) {
      const candidates: Point[] = [];
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8;
        const p = {
          x: t.x + Math.cos(angle) * this.preferredRange(s),
          y: t.y + Math.sin(angle) * this.preferredRange(s),
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
          (s.side===1&&this.enemyTactics>=2 ? this.threatAt(s,p)*65+("classId" in t&&inView(t,p)?110:0) : 0) +
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
      this.aimAi(s, t);
    }
  }
  collectSupplies() {
    for (const drop of this.supplies) {
      if (drop.claimedBy !== null) continue;
      const unit = this.soldiers
        .filter(
          (s) =>

            !s.takingCover &&
            s.life === "alive" &&
            s.drowningTime <= 0 &&
            s.brawl === null &&
            distance(s, drop) <= 23,
        )
        .sort(
          (a, b) => distance(a, drop) - distance(b, drop) || a.id - b.id,
        )[0];
      if (!unit) continue;
      drop.claimedBy = unit.side;
      const weapon = SUPPLY_WEAPONS[Math.floor(this.random() * SUPPLY_WEAPONS.length)];
      this.powers[unit.side].push(weapon);
      this.supplyRevision++;
      this.note(
        `${unit.side === 0 ? "Your squad" : "Enemy"} captured ${drop.label}: ${SUPER_LABELS[weapon]} ready!`,
      );
      this.effects.push({ ...drop, kind: "revive", time: 1, size: 30 });
    }
  }
  dropGear(s:Soldier) {
    if(this.training||this.winner!==null||s.unarmed||s.life!=="alive"||s.brawl!==null||s.drowningTime>0||this.inWater(s))return false;
    const fraction=s.hp/this.maxHp(s);
    this.gear.push({owner:s.id,side:s.side,classId:s.classId,x:s.x,y:s.y});
    s.unarmed=true;s.recoveringGear=false;s.hp=this.maxHp(s)*fraction;s.formationSpeed=undefined;
    if(s.target!==null||s.terrainTarget){s.goal=null;s.path=[];s.moving=false;}
    s.target=null;s.terrainTarget=null;s.flash=0;
    this.supplyRevision++;this.note(`${CLASSES[s.classId].name} dropped weapon and armor. Run light: no shooting, ${this.maxHp(s)} maximum HP. Gear stays here.`);return true;
  }
  recoverGear(s:Soldier) {
    const gear=this.gear.find(g=>g.owner===s.id);
    if(this.training||this.winner!==null||!gear||!s.unarmed||s.life!=="alive"||s.brawl!==null||s.drowningTime>0||s.takingCover)return false;
    s.recoveringGear=true;s.formationSpeed=undefined;s.target=null;s.terrainTarget=null;s.hold=false;s.watchAngle=undefined;
    const swimming=this.inWater(s);
    this.setGoal(s,gear,!swimming);this.note(`${CLASSES[s.classId].name}: returning to the marked gear bag${swimming ? "; swim out of the river first" : " by a dry route"}.`);return true;
  }
  pickupGear(s:Soldier) {
    const gear=this.gear.find(g=>g.owner===s.id);
    if(this.training||this.winner!==null||!gear||!s.unarmed||!s.recoveringGear||s.life!=="alive"||s.brawl!==null||s.drowningTime>0||s.takingCover||distance(s,gear)>18)return false;
    const fraction=s.hp/this.maxHp(s);s.unarmed=false;s.hp=this.maxHp(s)*fraction;
    s.recoveringGear=false;s.goal=null;s.path=[];s.moving=false;s.hold=true;s.steadyTime=0;s.formationSpeed=undefined;
    s.cooldown=Math.max(s.cooldown,RUN_LIGHT.equipTime);s.autoFireWait=Math.max(s.autoFireWait??0,s.cooldown);
    this.gear=this.gear.filter(g=>g!==gear);this.supplyRevision++;
    this.note(`${CLASSES[s.classId].name}: weapon and armor recovered. Equipping before firing.`);return true;
  }
  spawnChest() {
    if(this.training||this.planning||this.winner!==null||!this.operation||this.chestsSpawned>=COMEBACK.limit||this.time+1e-8<this.nextChestAt)return false;
    const units=this.soldiers.filter(s=>s.life==="alive"&&s.drowningTime<=0);
    const count=(side:Side)=>units.filter(s=>s.side===side).length;
    if(!count(0)||!count(1))return false;
    const strength=(side:Side)=>count(side)/this.soldiers.filter(s=>s.side===side).length;
    const trailing:Side|null=strength(0)<strength(1)?0:strength(1)<strength(0)?1:null;
    const candidates:Point[]=[];
    for(const x of [170,300,410,690,800,930])for(const y of [60,170,280,390,500]){
      const p={x,y};if(!legal(p,this.cover)||this.inWater(p)||units.some(s=>distance(s,p)<75))continue;
      if(this.chests.some(c=>c.claimedBy===null&&distance(c,p)<80)||this.gear.some(g=>distance(g,p)<30))continue;
      candidates.push(p);
    }
    if(!candidates.length){this.nextChestAt=this.time+5;return false;}
    const score=(p:Point)=>{
      if(trailing===null)return 0;
      const allies=units.filter(s=>s.side===trailing),foes=units.filter(s=>s.side!==trailing);
      return Math.min(...allies.map(s=>distance(s,p)))-Math.min(350,Math.min(...foes.map(s=>distance(s,p))))*.7;
    };
    candidates.sort((a,b)=>score(a)-score(b)||a.x-b.x||a.y-b.y);
    const shortlist=candidates.slice(0,trailing===null?candidates.length:6);
    const point=shortlist[Math.floor(this.random()*shortlist.length)];
    this.chests.push({...point,id:this.chestsSpawned++,expiresAt:this.time+COMEBACK.lifetime,claimedBy:null});
    this.nextChestAt=this.time+COMEBACK.interval;this.supplyRevision++;
    this.note(`COMEBACK CHEST spotted! Reach the glowing chest within ${COMEBACK.lifetime}s. Both teams can claim it.`);return true;
  }
  recallSoldier(collector:Soldier) {
    const fallen=this.soldiers.filter(s=>s.side===collector.side&&s.life!=="alive").sort((a,b)=>a.id-b.id)[0];
    if(!fallen)return false;
    let point:Point|undefined;
    for(const radius of [44,68,92])for(let i=0;i<12;i++){
      if(point)break;const p={x:collector.x+Math.cos(i*Math.PI/6)*radius,y:collector.y+Math.sin(i*Math.PI/6)*radius};
      if(legal(p,this.cover)&&!this.inWater(p)&&!this.soldiers.some(s=>s.life==="alive"&&distance(s,p)<(s.side===collector.side?25:60)))point=p;
    }
    if(!point)return false;
    Object.assign(fallen,point,{life:"alive",death:null,burnRemaining:0,drowningTime:0,wasInWater:false,takingCover:false,
      path:[],goal:null,target:null,terrainTarget:null,hold:true,moving:false,recoveringGear:false,traffic:0,formationSpeed:undefined,
      brawl:null,blocking:false,autoGuardTime:0,fightMove:null,fightMoveTime:0,recoilTime:0,knockdownTime:0,brawlKnockdown:false,fightAnchor:null,
      cooldown:2,autoFireWait:3,steadyTime:0,jam:0,flash:0});
    fallen.hp=this.maxHp(fallen)*COMEBACK.reviveHealth;this.stats.revives++;
    this.effects.push({...fallen,kind:"revive",time:1,size:35});return true;
  }
  grantChestReward(collector:Soldier,choice?:ChestReward):ChestReward {
    const allies=this.soldiers.filter(s=>s.side===collector.side),living=allies.filter(s=>s.life==="alive");
    const foes=this.soldiers.filter(s=>s.side!==collector.side&&s.life==="alive");
    const fallen=allies.some(s=>s.life!=="alive");
    const pool:ChestReward[]=["sniper","airstrike"];
    if(living.some(s=>s.hp<this.maxHp(s)||s.burnRemaining>0))pool.push("treatment");
    if(fallen){pool.push("recall");if(foes.length-living.length>=2)pool.push("recall","recall");}
    let reward=choice??pool[Math.floor(this.random()*pool.length)];
    if(reward==="recall"&&!this.recallSoldier(collector))reward=living.some(s=>s.hp<this.maxHp(s)||s.burnRemaining>0)?"treatment":"sniper";
    if(reward==="treatment")for(const s of living){s.hp=Math.min(this.maxHp(s),s.hp+this.maxHp(s)*COMEBACK.healFraction);s.burnRemaining=0;}
    else if(reward==="sniper"||reward==="airstrike")this.powers[collector.side].push(reward);
    this.supplyRevision++;this.note(`${collector.side===0?"Your squad":"Enemy"} opened a chest: ${CHEST_LABELS[reward]}!`);
    this.effects.push({...collector,kind:"revive",time:1,size:35});return reward;
  }
  tickComeback() {
    for(const s of this.soldiers)if(s.recoveringGear)this.pickupGear(s);
    if(this.training||!this.operation)return;
    const old=this.chests.length;
    this.chests=this.chests.filter(c=>c.claimedBy===null?c.expiresAt>this.time:this.time-(c.openedAt??0)<3);
    if(old!==this.chests.length)this.supplyRevision++;
    if(this.time+1e-8>=this.nextChestAt)this.spawnChest();
    for(const chest of this.chests){
      if(chest.claimedBy!==null)continue;
      const collector=this.soldiers.filter(s=>s.life==="alive"&&s.drowningTime<=0&&s.brawl===null&&!s.takingCover&&distance(s,chest)<=COMEBACK.radius)
        .sort((a,b)=>distance(a,chest)-distance(b,chest)||a.id-b.id)[0];
      if(!collector)continue;chest.claimedBy=collector.side;chest.openedAt=this.time;this.chestsOpened++;chest.reward=this.grantChestReward(collector);
    }
  }
  useSuper(side: Side, weapon: SuperWeapon, point: Point) {
    const inventory = this.powers[side],
      index = inventory.indexOf(weapon);
    if (
      !SUPPLY_WEAPONS.includes(weapon) ||
      this.planning ||
      this.winner !== null ||
      index < 0 ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.x > FIELD.width ||
      point.y < 0 ||
      point.y > FIELD.height
    )
      return false;
    if (weapon === "sniper") {
      const target = this.soldiers
        .filter(
          (s) =>
            s.side !== side &&
            s.life === "alive" &&
            s.drowningTime <= 0 &&
            distance(s, point) < 38,
        )
        .sort(
          (a, b) => distance(a, point) - distance(b, point) || a.id - b.id,
        )[0];
      if (!target) {
        this.note("Sniper: click a living enemy. Shot remains ready.");
        return false;
      }
      this.damage(target, 9999, "rifleman", true);
      this.effects.push({ ...target, kind: "hit", time: 0.7, size: 26 });
      this.emitWeapon("rifleman", "fire");
    } else if (weapon === "airstrike") {
      const scatter = scatterAirstrike(point, () => this.random(),this.fortune(side));
      this.strikes.push({
        id: this.airstrikeId++,
        side,
        ...scatter,
        remaining: TUNING.airstrikeWarning,
        impacted: false,
        dropped: false,
      });
      this.emitAirstrike("warning");
      this.note(`Bombardier: ${AIRSTRIKE_ACCURACY[scatter.accuracy]}. Clear the marked blast zone.`);
    }
    inventory.splice(index, 1);
    this.supplyRevision++;
    this.note(
      `${side === 0 ? "Your squad" : "Enemy"}: ${SUPER_LABELS[weapon]} deployed!${weapon === "airstrike" ? ` AIRSTRIKE IN ${TUNING.airstrikeWarning}s — clear the marked zone!` : ""}`,
    );
    return true;
  }
  tickSupers(dt: number) {
    this.collectSupplies();
    for (const strike of this.strikes) {
      strike.remaining -= dt;
      if (!strike.dropped && strike.remaining <= 1.8) {
        strike.dropped = true;
        this.emitAirstrike("drop");
      }
      if (strike.remaining > 0 || strike.impacted) continue;
      strike.impacted = true;
      const snapshot = [...this.cover];
      for (const t of this.combatants())
        if (
          t.life === "alive" &&
          distance(t, strike.point) <= TUNING.airstrikeRadius &&
          !blocked(strike.point, t, snapshot)
        )
          this.damage(t, 9999, "bazooka", true);
      // Airstrike craters obey the same shielding/destruction rules as other blasts.
      for (const r of [...this.cover])
        if (
          distanceToRect(strike.point, r) <= TUNING.airstrikeRadius &&
          !blocked(
            strike.point,
            { x: r.x + r.w / 2, y: r.y + r.h / 2 },
            snapshot.filter((o) => o !== r),
          )
        )
          this.damageCover(r, 100);
      this.emitAirstrike("impact");
    }
    this.strikes = this.strikes.filter(
      (s) => s.remaining > -TUNING.airstrikeAftermath,
    );

    if (this.combatTicks % 30 === 0)
      for (const side of this.aiSides) {
        const weapon = this.powers[side][0],
          target = this.soldiers.find(
            (s) => s.side !== side && s.life === "alive",
          );
        if (weapon && target && (side===0 || !this.challenge || this.challenge.enemyPowers)) this.useSuper(side, weapon, target);
      }
  }
  step() {
    if (this.winner !== null) return;
    const dt = TUNING.step;
    this.tick++;
    if (this.planning) {
      this.planningTicks--;
      if (!this.planning) this.note("GO! Opening orders are live.");
      return;
    }
    this.time = ++this.combatTicks * dt;
    this.tickSupers(dt);
    for (const unit of this.combatants()) this.tickBurn(unit, dt);
    this.effects = this.effects.filter((e) => (e.time -= dt) > 0);
    for (const s of this.soldiers) {
      s.traffic=Math.max(0,(s.traffic??0)-dt);
      s.cooldown -= dt;
      if (s.classId === "torch") {
        s.heat = Math.max(0, (s.heat ?? 0) - TUNING.flameCooling * dt);
        if (s.overheated && s.heat <= TUNING.flameResumeHeat) s.overheated = false;
      }
      s.autoFireWait = Math.max(0, (s.autoFireWait ?? 0) - dt);
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
          s.recoveringGear = false;
          s.death = "drowned";
          this.stats.drownings++;
          this.effects.push({ ...s, kind: "splash", time: 0.8, size: 30 });
          this.note(
            `${s.side === 0 ? "Your" : "Enemy"} ${CLASSES[s.classId].name} drowned. No medic rescue.`,
          );
        }
        continue;
      }
      if (!s.path.length && s.watchAngle !== undefined) this.setHeading(s, s.watchAngle);
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
        s.think = TUNING.aiThink * (s.side===1 ? this.challenge?.enemyThink ?? 1 : 1);
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
            distance(s, contact) > this.weaponRange(s) &&
            s.repath <= 0
          ) {
            const angle = Math.atan2(s.y - contact.y, s.x - contact.x);
            this.setGoal(s, {
              x: contact.x + Math.cos(angle) * CLASSES[s.classId].preferred,
              y: contact.y + Math.sin(angle) * CLASSES[s.classId].preferred,
            });
          }
          if (distance(s, contact) <= this.weaponRange(s)) {
            s.goal = null;
            s.path = [];
            if ((s.autoFireWait ?? 0) <= 0) this.fireAt(s, s.terrainTarget);
          }
        }
      }
      const target = s.target === null ? null : this.getCombatant(s.target);
      if (s.target !== null && (!target || target.life !== "alive"))
        s.target = null;
      if (
        !this.aiSides.includes(s.side) &&
        target &&
        this.canShoot(s, target)
      ) {
        s.path = [];
        s.goal = null;
        s.formationSpeed = undefined;
      }
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
          x: target.x + Math.cos(angle) * this.preferredRange(s),
          y: target.y + Math.sin(angle) * this.preferredRange(s),
        });
        if (
          s.path.length === 0 ||
          (!w.arc && blocked(s.goal!, target, this.cover))
        ) {
          const candidates = [];
          for (let i = 0; i < 16; i++) {
            const a = (i * Math.PI) / 8,
              p = {
                x: target.x + Math.cos(a) * this.preferredRange(s),
                y: target.y + Math.sin(a) * this.preferredRange(s),
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
      const advancing = s.path.length > 0;
      if (s.path.length) {
        const p = s.path[0],
          d = distance(s, p),
          speed =
            (s.formationSpeed ?? this.landSpeed(s)) * this.movementMultiplier(s) * (s.side===1 ? this.challenge?.enemySpeed ?? 1 : 1) *
            (this.inWater(s) ? s.unarmed ? RUN_LIGHT.waterSpeed : CLASSES[s.classId].waterSpeed : 1) *
            dt;
        const desired=d<=speed?p:{x:s.x+(p.x-s.x)/d*speed,y:s.y+(p.y-s.y)/d*speed};
        const obstacles=s.safeRoute?this.dryCover():this.cover;
        const motion=trafficMove(s,desired,this.soldiers,obstacles);
        if(s.side===0&&motion.crowded){
          const entering=(s.traffic??0)<=0;
          s.traffic=TRAFFIC.notice;
          if(entering&&this.time-this.trafficNoticeAt>5){this.note("Friendly traffic: crowded routes slow troops. Back one out or send it around.");this.trafficNoticeAt=this.time;}
        }
        if(distance(s,motion.point)>1e-8){
          this.facePoint(s,motion.point);s.x=motion.point.x;s.y=motion.point.y;s.moving=true;
        } else if(s.goal&&s.repath<=0&&blocked(s,desired,this.cover,14))this.setGoal(s,s.goal,s.safeRoute);
        if(distance(s,p)<.01){s.path.shift();if(!s.path.length)s.goal=null;}
      }
      if (!s.path.length && s.watchAngle !== undefined) this.setHeading(s, s.watchAngle);
      this.updateWater(s);
      if (s.drowningTime > 0) continue;
      s.steadyTime =
        advancing || s.moving ? 0 : (s.steadyTime ?? this.aimDelay(s)) + dt;
      if (!s.path.length) s.formationSpeed = undefined;
      const aim =
        target && target.life === "alive" && this.canAutoShoot(s, target)
          ? target
          : this.combatants()
              .filter((t) => t.side !== s.side && this.canAutoShoot(s, t))
              .sort((a, b) => distance(s, a) - distance(s, b))[0];
      if (!s.terrainTarget && (s.autoFireWait ?? 0) <= 0) {
        if (aim) this.fire(s, aim);
        else if (s.cooldown <= 0) this.fireDistant(s, this.nearestEnemy(s, true));
      }
    }
    for (const s of this.soldiers) this.updateWater(s);
    for (const a of this.soldiers.filter(
      (s) =>

        s.life === "alive" &&
        s.brawl === null &&
        s.drowningTime <= 0,
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
      if (m.life !== "alive") continue;
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
            t.recoveringGear = false;
            t.traffic = 0;
            t.takingCover = false;
            t.burnRemaining = 0;
            t.wasInWater = false;
            t.drowningTime = 0;
            t.hp = this.maxHp(t) * TUNING.reviveHealth;
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
      (m) => m.life === "dead" || (m.x > -25 && m.x < FIELD.width + 25),
    );
    if (this.time >= this.nextMedic) {
      this.nextMedic = this.time + TUNING.aiMedicDelay;
      for (const side of this.aiSides) {
        if(side===1 && this.challenge && !this.challenge.enemyMedics)continue;
        const t = this.soldiers.find(
          (s) =>
            s.side === side &&
            s.life === "down" &&
            !this.medics.some(
              (m) =>
                m.life === "alive" && m.phase === "in" && m.target === s.id,
            ),
        );
        if (t) this.callMedic(t.id, side);
      }
    }
    this.tickComeback();
    const alive = (side: Side) =>
      this.soldiers.some(
        (s) => s.side === side && s.life === "alive",
      );
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
      deploymentSeconds: this.deploymentSeconds,
      aiSides: [...this.aiSides],
      operation: this.operation,
      commands: this.commands,
    };
  }
}
export function replayBattle(replay: Replay, ticks: number) {
  const battle = new Battle(
    replay.seed,
    replay.squad,
    replay.training ?? false,
    replay.deploymentSeconds ?? 0,
    replay.operation,
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
