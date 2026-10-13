import { describe, it, expect } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES, TUNING, type ClassId } from "../src/sim/data";
import {
  distance,
  blocked,
  pathfind,
  waterOutlines,
} from "../src/sim/geometry";
function pair(classId: ClassId = "rifleman") {
  const b = new Battle(42);
  b.cover = [];
  b.water = [];
  const a = b.soldiers[0],
    t = b.soldiers[5];
  a.classId = classId;
  a.x = 200;
  a.y = 250;
  a.cooldown = 0;
  t.x = 300;
  t.y = 250;
  t.think = 1e6;
  t.hp = 1000;
  for (const s of b.soldiers)
    if (s !== a && s !== t) {
      s.life = "dead";
      s.hp = 0;
    }
  return { b, a, t };
}
function advance(b: Battle, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / TUNING.step); i++) b.step();
}
describe("weapon rules", () => {
  for (const id of Object.keys(CLASSES) as ClassId[])
    it(`${id} respects its range and cooldown`, () => {
      const { b, a, t } = pair(id);
      t.x = a.x + CLASSES[id].range + 1;
      expect(b.fire(a, t)).toBe(false);
      t.x = a.x + CLASSES[id].range - 1;
      expect(b.canShoot(a, t)).toBe(true);
      b.fire(a, t);
      expect(a.cooldown).toBe(CLASSES[id].cooldown);
      expect(b.fire(a, t)).toBe(false);
    });
  it("rifles and flames avoid blocked targets; explosive classes can attack the cover", () => {
    const { b, a, t } = pair();
    b.cover = [{ x: 240, y: 200, w: 20, h: 100 }];
    for (const id of ["rifleman", "torch"] as ClassId[]) {
      a.classId = id;
      expect(b.canShoot(a, t)).toBe(false);
    }
    for (const id of ["bazooka", "lobber", "sapper"] as ClassId[]) {
      a.classId = id;
      expect(b.canShoot(a, t)).toBe(true);
    }
  });
  it("Torch cannot fire in water, but other classes can", () => {
    const { b, a, t } = pair("torch");
    b.water = [{ x: 180, y: 220, w: 50, h: 50 }];
    expect(b.canShoot(a, t)).toBe(false);
    a.classId = "rifleman";
    expect(b.canShoot(a, t)).toBe(true);
  });
  it("rifle jams recover and prevent shots", () => {
    const { b, a, t } = pair();
    b.random = () => 0;
    expect(b.fire(a, t)).toBe(false);
    expect(a.jam).toBe(TUNING.jamDuration);
    a.cooldown = 0;
    expect(b.canShoot(a, t)).toBe(false);
    t.x = 1000;
    // Distant automatic shots now continue after recovery; do not force a second jam.
    b.random = () => 1;
    advance(b, 2.5);
    expect(a.jam).toBeLessThanOrEqual(0);
  });
  it("grenade splash hits both teams", () => {
    const { b, a, t } = pair("lobber");
    a.x = 280;
    t.x = 300;
    b.random = () => 1;
    const hp = a.hp;
    b.resolveShot({
      id: 0,
      from: a,
      to: { x: 300, y: 250 },
      owner: a.id,
      classId: "lobber",
      target: t.id,
      time: 1,
      duration: 1,
    });
    expect(a.hp).toBe(hp - CLASSES.lobber.damage);
    expect(t.hp).toBe(1000 - CLASSES.lobber.damage);
  });
  it("flame cone hits several enemies, excludes allies and cover", () => {
    const { b, a, t } = pair("torch");
    b.random = () => 1;
    const e = b.soldiers[6];
    e.life = "alive";
    e.hp = CLASSES[e.classId].hp;
    e.x = 290;
    e.y = 260;
    const hp = a.hp;
    b.resolveShot({
      id: 0,
      from: { x: a.x, y: a.y },
      to: { x: t.x, y: t.y },
      owner: a.id,
      classId: "torch",
      target: t.id,
      time: 1,
      duration: 1,
    });
    expect(t.hp).toBeCloseTo(1000 - CLASSES.torch.damage);
    expect(e.hp).toBeCloseTo(CLASSES[e.classId].hp - CLASSES.torch.damage);
    expect(a.hp).toBe(hp);
  });
});
describe("life, medics, battle end", () => {
  it("ordinary deaths are downed and revived by a travelling medic", () => {
    const { b, a, t } = pair();
    const friend = b.soldiers[1];
    friend.life = "alive";
    friend.x = 60;
    friend.y = 40;
    t.x = 900;
    b.damage(a, 999);
    expect(a.life).toBe("down");
    expect(b.callMedic(a.id, 0)).toBe(true);
    expect(b.calls[0]).toBe(1);
    expect(b.callMedic(a.id, 0)).toBe(false);
    advance(b, 2.5);
    expect(a.life).toBe("alive");
    expect(a.hp).toBe(CLASSES[a.classId].hp * TUNING.reviveHealth);
    expect(b.stats.revives).toBe(1);
  });
  for (const id of ["bazooka", "torch", "sapper"] as ClassId[])
    it(`${id} instant kills cannot be revived`, () => {
      const { b, a } = pair();
      b.random = () => 0;
      b.damage(a, 1, id);
      expect(a.life).toBe("dead");
      expect(a.death).toBe(id === "torch" ? "ash" : "skeleton");
      expect(b.callMedic(a.id, 0)).toBe(false);
      expect(b.calls[0]).toBe(2);
    });
  it("medics cannot exceed 2 calls", () => {
    const b = new Battle(9);
    for (const s of b.soldiers.filter((s) => s.side === 0)) s.life = "down";
    expect([0, 1, 2].map((id) => b.callMedic(id, 0))).toEqual([
      true,
      true,
      false,
    ]);
    expect(b.calls[0]).toBe(0);
  });
  it("ends when every soldier on a side is down or dead", () => {
    const b = new Battle(9);
    for (const s of b.soldiers.filter((s) => s.side === 1)) s.life = "down";
    b.step();
    expect(b.winner).toBe(0);
    const ticks = b.tick;
    b.step();
    expect(b.tick).toBe(ticks);
  });
  it("a player loss is also recognized", () => {
    const b = new Battle(9);
    for (const s of b.soldiers.filter((s) => s.side === 0)) s.life = "dead";
    b.step();
    expect(b.winner).toBe(1);
  });
});
describe("movement, brawls and replay", () => {
  it("routes around cover without clipping it", () => {
    const cover = [{ x: 250, y: 200, w: 50, h: 100 }],
      start = { x: 180, y: 250 },
      goal = { x: 400, y: 250 };
    const path = pathfind(start, goal, cover);
    expect(path.length).toBeGreaterThan(1);
    let p = start;
    for (const next of path) {
      expect(blocked(p, next, cover, 14)).toBe(false);
      p = next;
    }
  });
  it("reaches a valid destination whose grid center overlaps cover", () => {
    const cover = [{ x: 250, y: 200, w: 50, h: 100 }],
      start = { x: 180, y: 250 },
      goal = { x: 319, y: 250 };
    const path = pathfind(start, goal, cover);
    expect(path.length).toBeGreaterThan(0);
    expect(path.at(-1)).toEqual(goal);
  });
  it("wounded AI re-engages after a short retreat", () => {
    const { b, a, t } = pair();
    t.hp = 1;
    t.x = 1000;
    b.ai(t);
    expect(t.retreatUntil).toBeGreaterThan(b.time);
    b.time = t.retreatUntil + 1;
    b.ai(t);
    expect(t.goal).not.toBeNull();
    expect(t.goal!.x).toBeLessThan(900);
  });
  it("move orders run through the simulation", () => {
    const { b, a, t } = pair();
    t.x = 1000;
    b.command({ type: "move", id: a.id, point: { x: 400, y: 250 } });
    advance(b, 3);
    expect(distance(a, { x: 400, y: 250 })).toBeLessThan(2);
  });
  it("close enemies brawl; selected soldier uses punch, kick and block", () => {
    const { b, a, t } = pair();
    t.x = 220;
    b.selected = a.id;
    b.step();
    expect(a.brawl).toBe(t.id);
    expect(t.brawl).toBe(a.id);
    a.brawlCd = 0;
    const hp = t.hp;
    b.command({ type: "kick", id: a.id });
    expect(t.hp).toBe(hp - TUNING.kickDamage);
    a.brawlCd = 0;
    b.command({ type: "block", id: a.id, held: true });
    const own = a.hp;
    t.brawlCd = 0;
    b.brawlHit(t, "punch");
    expect(a.hp).toBeCloseTo(own - TUNING.brawlDamage * TUNING.blockReduction);
  });
  it("seed plus tick-stamped orders reproduce a battle", () => {
    const b = new Battle(123, 1);
    b.command({ type: "select", id: 0 });
    b.command({ type: "move", id: 0, point: { x: 350, y: 240 } });
    advance(b, 2);
    b.command({ type: "attack", id: 0, target: 5 });
    advance(b, 4);
    const replay = replayBattle(b.replay(), b.tick);
    expect(replay.soldiers).toEqual(b.soldiers);
    expect(replay.rngState).toBe(b.rngState);
    expect(replay.shots).toEqual(b.shots);
    expect(replay.cover).toEqual(b.cover);
    expect(replay.rubble).toEqual(b.rubble);
  });
  it("enemy AI moves into range and avoids water as Torch", () => {
    const { b, a, t } = pair();
    t.classId = "torch";
    b.water = [{ x: 280, y: 200, w: 60, h: 100 }];
    t.x = 300;
    b.ai(t);
    expect(t.goal).not.toBeNull();
    expect(b.inWater(t.goal!)).toBe(false);
  });
});

describe("dynamite lethal core and weapon events", () => {
  const explode = (b: Battle, owner: number, target: number) =>
    b.resolveShot({
      id: 0,
      from: { x: 200, y: 250 },
      to: { x: 300, y: 250 },
      owner,
      classId: "sapper",
      target,
      time: 1,
      duration: 1,
    });
  it("a direct dynamite hit guarantees a permanent kill even at full health with no lucky roll", () => {
    const { b, a, t } = pair("sapper");
    b.random = () => 1;
    t.hp = 9999;
    explode(b, a.id, t.id);
    expect(t.life).toBe("dead");
    expect(t.death).toBe("skeleton");
    expect(b.callMedic(t.id, 1)).toBe(false);
  });
  it("the lethal core includes its boundary; outside it, normal splash rules apply", () => {
    const { b, a, t } = pair("sapper");
    b.random = () => 1;
    t.x = 300 + CLASSES.sapper.lethalRadius;
    explode(b, a.id, t.id);
    expect(t.life).toBe("dead");
    t.life = "alive";
    t.hp = 1000;
    t.x += 0.01;
    explode(b, a.id, t.id);
    expect(t.life).toBe("alive");
    expect(t.hp).toBe(1000 - CLASSES.sapper.damage);
  });
  it("close dynamite kills allies too, but cannot hit outside the blast radius", () => {
    const { b, a, t } = pair("sapper");
    b.random = () => 1;
    a.x = 300;
    t.x = 300 + CLASSES.sapper.radius + 1;
    explode(b, a.id, t.id);
    expect(a.life).toBe("dead");
    expect(t.hp).toBe(1000);
  });
  it("short-range dynamite cannot be thrown from rifle range", () => {
    const { b, a, t } = pair("sapper");
    t.x = a.x + CLASSES.sapper.range + 1;
    expect(b.fire(a, t)).toBe(false);
    expect(CLASSES.sapper.range).toBeLessThan(CLASSES.rifleman.range);
  });
  it("successful shots emit the correct weapon sound events; jams do not emit gunfire", () => {
    for (const id of Object.keys(CLASSES) as ClassId[]) {
      const { b, a, t } = pair(id);
      b.random = () => 1;
      expect(b.fire(a, t)).toBe(true);
      expect(b.combatEvents[0]).toMatchObject({ classId: id, kind: "fire" });
      b.resolveShot(b.shots[0]);
      expect(b.combatEvents.at(-1)).toMatchObject({
        classId: id,
        kind: "impact",
      });
    }
    const { b, a, t } = pair();
    b.random = () => 0;
    b.fire(a, t);
    expect(b.combatEvents).toEqual([]);
  });
});

describe("melee animation synchronization", () => {
  it("accepted strikes produce one move and impact cue, while cooldown clicks produce none", () => {
    const { b, a, t } = pair();
    b.startBrawl(a, t);
    a.brawlCd = 0;
    b.command({ type: "punch", id: a.id });
    expect(a.fightMove).toBe("punch");
    expect(a.fightMoveTime).toBe(TUNING.punchAnimation);
    expect(t.recoilTime).toBe(TUNING.recoilAnimation);
    expect(b.meleeEvents).toHaveLength(1);
    b.command({ type: "kick", id: a.id });
    expect(b.meleeEvents).toHaveLength(1);
    expect(a.fightMove).toBe("punch");
  });
  it("a block produces a guarded reaction and reduced damage", () => {
    const { b, a, t } = pair();
    b.startBrawl(a, t);
    a.brawlCd = 0;
    t.blocking = true;
    const hp = t.hp;
    b.command({ type: "kick", id: a.id });
    expect(t.hp).toBeCloseTo(hp - TUNING.kickDamage * TUNING.blockReduction);
    expect(t.recoilBlocked).toBe(true);
    expect(b.meleeEvents.at(-1)).toMatchObject({ kind: "kick", blocked: true });
    expect(b.effects.some((e) => e.kind === "block")).toBe(true);
  });
  it("knockouts leave an unarmed fallen pose and strikes recover before ranged fire resumes", () => {
    const { b, a, t } = pair();
    b.startBrawl(a, t);
    a.brawlCd = 0;
    t.hp = 1;
    b.command({ type: "punch", id: a.id });
    expect(t.life).toBe("down");
    expect(t.brawlKnockdown).toBe(true);
    expect(t.knockdownTime).toBe(TUNING.knockdownAnimation);
    const enemy = b.soldiers[6];
    enemy.life = "alive";
    enemy.hp = 1000;
    enemy.x = 900;
    enemy.y = 250;
    enemy.think = 1e6;
    for (let i = 0; i < 15; i++) b.step();
    expect(a.fightMoveTime).toBe(0);
    expect(t.knockdownTime).toBe(0);
    enemy.x = 300;
    expect(b.canShoot(a, enemy)).toBe(true);
  });
});

describe("destructible scenery", () => {
  function fixture(id: ClassId = "bazooka") {
    const setup = pair(id);
    setup.b.random = () => 1;
    setup.b.cover = [
      { x: 240, y: 220, w: 10, h: 60, hp: 100, material: "rock" },
    ];
    setup.t.x = 260;
    return setup;
  }
  function shoot(
    b: Battle,
    a: Battle["soldiers"][number],
    t: Battle["soldiers"][number],
  ) {
    a.cooldown = 0;
    expect(b.fire(a, t)).toBe(true);
    const shot = b.shots.pop()!;
    b.resolveShot(shot);
    return shot;
  }
  it("bullets hit the surface without damaging scenery or the soldier behind it", () => {
    const { b, a, t } = fixture("rifleman");
    for (let i = 0; i < 20; i++) {
      a.cooldown = 0;
      expect(b.fireAt(a, { x: 245, y: 250 })).toBe(true);
      b.resolveShot(b.shots.pop()!);
    }
    expect(b.cover[0].hp).toBe(100);
    expect(t.hp).toBe(1000);
    expect(b.rubble).toHaveLength(0);
  });
  it("three rockets demolish a rock; the destroying blast still protects its far side", () => {
    const { b, a, t } = fixture();
    expect(shoot(b, a, t).to.x).toBeCloseTo(239.99);
    expect(b.cover[0].hp).toBe(60);
    shoot(b, a, t);
    expect(b.cover[0].hp).toBe(20);
    shoot(b, a, t);
    expect(b.cover).toHaveLength(0);
    expect(b.rubble).toHaveLength(1);
    expect(t.hp).toBe(1000);
    shoot(b, a, t);
    expect(t.hp).toBe(1000 - CLASSES.bazooka.damage);
  });
  it("one dynamite destroys cover but cannot kill through it, including within the lethal core", () => {
    const { b, a, t } = fixture("sapper");
    shoot(b, a, t);
    expect(b.cover).toHaveLength(0);
    expect(t.life).toBe("alive");
    expect(t.hp).toBe(1000);
    shoot(b, a, t);
    expect(t.life).toBe("dead");
  });
  it("a blast shields soldiers and other scenery behind intact cover", () => {
    const { b, a, t } = fixture("sapper");
    b.cover.push({ x: 255, y: 240, w: 5, h: 20, hp: 100, material: "crate" });
    b.resolveShot({
      id: 0,
      from: { x: 200, y: 180 },
      to: { x: 230, y: 250 },
      owner: a.id,
      classId: "sapper",
      target: t.id,
      time: 1,
      duration: 1,
    });
    expect(t.hp).toBe(1000);
    expect(b.cover).toHaveLength(1);
    expect(b.cover[0].material).toBe("crate");
    expect(b.cover[0].hp).toBe(100);
  });
  it("all scenery materials use the same rules and destroyed cover opens movement routes", () => {
    for (const material of ["rock", "sandbags", "crate"] as const) {
      const { b, a, t } = fixture("sapper");
      b.cover[0].material = material;
      b.command({ type: "move", id: a.id, point: { x: 320, y: 250 } });
      expect(a.path.length).toBeGreaterThan(1);
      shoot(b, a, t);
      expect(blocked(a, { x: 320, y: 250 }, b.cover, 14)).toBe(false);
      expect(a.path).toEqual([{ x: 320, y: 250 }]);
    }
  });
  it("a click order approaches out-of-range cover and stops targeting it after demolition", () => {
    const { b, a, t } = fixture("sapper");
    a.x = 80;
    t.x = 900;
    b.command({ type: "demolish", id: a.id, point: { x: 245, y: 250 } });
    b.step();
    expect(a.goal).not.toBeNull();
    for (let i = 0; i < 150; i++) b.step();
    expect(b.cover).toHaveLength(0);
    expect(a.terrainTarget).toBeNull();
  });
  it("projectiles also collide with scenery introduced while they are in flight", () => {
    const { b, a, t } = pair("bazooka");
    b.random = () => 1;
    b.fire(a, t);
    b.cover = [{ x: 240, y: 220, w: 20, h: 60, hp: 100 }];
    b.resolveShot(b.shots[0]);
    expect(b.cover[0].hp).toBe(60);
    expect(t.hp).toBe(1000);
  });
});

describe("river crossings and bridges", () => {
  function riverPair(id: ClassId = "rifleman") {
    const setup = pair(id);
    setup.b.water = [{ x: 400, y: 0, w: 100, h: 560 }];
    setup.b.bridges = [{ x: 380, y: 36, w: 140, h: 64 }];
    setup.a.x = 350;
    setup.a.y = 280;
    setup.a.cooldown = 999;
    setup.t.x = 1050;
    setup.t.y = 520;
    setup.t.cooldown = 999;
    return setup;
  }
  it("the river spans the battlefield and its bridge is out of the central combat route", () => {
    const b = new Battle(42);
    expect(b.water[0].y).toBe(0);
    expect(b.water.at(-1)!.y + b.water.at(-1)!.h).toBe(560);
    expect(new Set(b.water.map((r) => r.x)).size).toBeGreaterThan(4);
    for (let i = 1; i < b.water.length; i++) {
      const previous = b.water[i - 1],
        current = b.water[i];
      expect(current.y).toBe(previous.y + previous.h);
      expect(
        Math.min(previous.x + previous.w, current.x + current.w) -
          Math.max(previous.x, current.x),
      ).toBeGreaterThan(0);
    }
    expect(b.inWater({ x: 550, y: 280 })).toBe(true);
    expect(b.inWater({ x: 550, y: 68 })).toBe(false);
    expect(b.bridges[0].y + b.bridges[0].h).toBeLessThan(150);
    expect(
      b.cover.some((r) => blocked(r, { x: r.x + r.w, y: r.y + r.h }, b.water)),
    ).toBe(false);
  });
  it("class risks use a 25% baseline, with a safer Rifleman and riskier heavy kits", () => {
    expect(CLASSES.lobber.drowningRisk).toBe(0.25);
    expect(CLASSES.rifleman.drowningRisk).toBeLessThan(0.25);
    for (const id of ["bazooka", "sapper", "torch"] as const) {
      expect(CLASSES[id].drowningRisk).toBeGreaterThan(0.25);
      expect(CLASSES[id].waterSpeed).toBeLessThan(CLASSES.rifleman.waterSpeed);
    }
  });
  it("rolls only once per water entry, and rolls again only after leaving and re-entering", () => {
    const { b, a } = riverPair();
    let rolls = 0;
    b.random = () => {
      rolls++;
      return 1;
    };
    a.x = 450;
    b.updateWater(a);
    for (let i = 0; i < 100; i++) b.updateWater(a);
    expect(rolls).toBe(1);
    a.x = 350;
    b.updateWater(a);
    a.x = 450;
    b.updateWater(a);
    expect(rolls).toBe(2);
  });
  it("uses each class threshold without a per-frame death lottery", () => {
    for (const id of Object.keys(CLASSES) as ClassId[]) {
      const { b, a } = riverPair(id);
      a.x = 450;
      b.random = () => CLASSES[id].drowningRisk;
      b.updateWater(a);
      expect(a.drowningTime).toBe(0);
      a.x = 350;
      b.updateWater(a);
      a.x = 450;
      b.random = () => CLASSES[id].drowningRisk - 0.0001;
      b.updateWater(a);
      expect(a.drowningTime).toBe(TUNING.drowningDuration);
    }
  });
  it("drowning stops combat and movement, animates briefly, then permanently removes the soldier", () => {
    const { b, a, t } = riverPair("bazooka");
    a.x = 450;
    b.random = () => 0;
    b.updateWater(a);
    const start = { x: a.x, y: a.y };
    b.command({ type: "move", id: a.id, point: { x: 600, y: 280 } });
    expect(a.path).toEqual([]);
    expect(b.canShoot(a, t)).toBe(false);
    advance(b, 1.3);
    expect(a.life).toBe("dead");
    expect(a.death).toBe("drowned");
    expect({ x: a.x, y: a.y }).toEqual(start);
    expect(b.callMedic(a.id, 0)).toBe(false);
    expect(b.stats.drownings).toBe(1);
    expect(b.winner).toBe(1);
  });
  it("Riflemen cross faster than launchers when both survive", () => {
    const positions = [];
    for (const id of ["rifleman", "bazooka"] as const) {
      const { b, a } = riverPair(id);
      a.x = 410;
      b.random = () => 1;
      b.command({ type: "move", id: a.id, point: { x: 650, y: 280 } });
      advance(b, 1);
      positions.push(a.x);
      expect(a.life).toBe("alive");
    }
    expect(positions[0] - 410).toBeGreaterThan((positions[1] - 410) * 1.5);
  });
  it("clicking a bridge takes a longer dry route and avoids every drowning roll", () => {
    const { b, a } = riverPair("bazooka");
    let rolls = 0;
    b.random = () => {
      rolls++;
      return 0;
    };
    b.command({ type: "bridge", id: a.id, point: { x: 450, y: 68 } });
    expect(a.safeRoute).toBe(true);
    expect(a.path.length).toBeGreaterThan(1);
    let length = 0,
      previous = { x: a.x, y: a.y };
    for (const point of a.path) {
      length += distance(previous, point);
      previous = point;
    }
    expect(length).toBeGreaterThan(350);
    for (let i = 0; i < 600; i++) {
      b.step();
      expect(b.inWater(a)).toBe(false);
    }
    expect(a.x).toBeGreaterThan(500);
    expect(a.life).toBe("alive");
    expect(rolls).toBe(0);
    expect(a.goal).toBeNull();
  });
  it("bridge crossings and water outcomes are deterministic in replay", () => {
    const b = new Battle(567, 0);
    b.command({ type: "bridge", id: 0, point: { x: 550, y: 68 } });
    b.command({ type: "move", id: 1, point: { x: 680, y: 260 } });
    advance(b, 12);
    const replay = replayBattle(b.replay(), b.tick);
    expect(replay.soldiers).toEqual(b.soldiers);
    expect(replay.stats).toEqual(b.stats);
    expect(replay.rngState).toBe(b.rngState);
  });
});

it("the default map routes to the bridge around intact scenery", () => {
  const b = new Battle(42);
  const a = b.soldiers[1];
  a.x = 330;
  a.y = 280;
  b.command({ type: "bridge", id: a.id, point: { x: 550, y: 68 } });
  expect(a.path.length).toBeGreaterThan(1);
  let previous = { x: a.x, y: a.y };
  for (const p of a.path) {
    expect(blocked(previous, p, b.dryCover(), 14)).toBe(false);
    previous = p;
  }
  expect(previous.x).toBeGreaterThan(595);
});

it("jagged banks use the same outline and water hit areas, without filling dry notches", () => {
  const b = new Battle(42);
  const outline = waterOutlines(b.water);
  expect(outline).toHaveLength(1);
  expect(outline[0]).toContainEqual({ x: 475, y: 100 });
  expect(outline[0]).toContainEqual({ x: 645, y: 365 });
  expect(b.inWater({ x: 480, y: 130 })).toBe(true);
  expect(b.inWater({ x: 480, y: 180 })).toBe(false);
  expect(b.inWater({ x: 630, y: 330 })).toBe(true);
  expect(b.inWater({ x: 630, y: 390 })).toBe(false);
});

describe("Fire all squad order", () => {
  it("fires only stationary player soldiers, preserves routes, and respects cooldowns", () => {
    const b = new Battle(42);
    b.cover = [];
    b.water = [];
    b.random = () => 1;
    for (const s of b.soldiers) {
      s.cooldown = 0;
      s.x = s.side === 0 ? 200 : 280;
      s.y = 240 + s.slot * 3;
      if (s.side === 1 && s.id !== 5) s.life = "dead";
    }
    b.get(5)!.hp = 1000;
    const moving = b.get(2)!,
      queued = b.get(4)!;
    moving.moving = true;
    queued.path = [{ x: 400, y: 250 }];
    queued.goal = { x: 400, y: 250 };
    b.command({ type: "fire-all" });
    expect(b.shots.map((s) => s.owner)).toEqual([0, 1, 3]);
    expect(queued.path).toEqual([{ x: 400, y: 250 }]);
    expect(moving.moving).toBe(true);
    b.command({ type: "fire-all" });
    expect(b.shots).toHaveLength(3);
    moving.moving = false;
    queued.path = [];
    b.command({ type: "fire-all" });
    expect(b.shots.map((s) => s.owner)).toEqual([0, 1, 3, 2, 4]);
    expect(b.commands.at(-1)!.command).toEqual({ type: "fire-all" });
  });
  it("keeps cover and life restrictions while distant Fire all shots miss", () => {
    const { b, a, t } = pair();
    b.random = () => 1;
    b.cover = [{ x: 240, y: 220, w: 20, h: 60, hp: 100 }];
    expect(b.fireAll()).toBe(0);
    b.cover = [];
    t.x = 1000;
    expect(b.fireAll()).toBe(1);
    expect(b.shots[0].miss).toBe(true);
    b.shots = [];
    t.x = 300;
    a.life = "down";
    expect(b.fireAll()).toBe(0);
    expect(b.shots).toEqual([]);
  });
});

describe("autonomous blast safety and river tactics", () => {
  it("AI holds an unsafe explosive shot, while an explicit player order remains possible", () => {
    const { b, a, t } = pair("sapper");
    b.aiSides = [0, 1];
    b.random = () => 1;
    const friend = b.get(1)!;
    Object.assign(friend, {
      life: "alive",
      hp: 210,
      x: 300,
      y: 285,
      cooldown: 999,
      think: 999,
    });
    a.think = 999;
    t.cooldown = 999;
    expect(b.canShoot(a, t)).toBe(true);
    expect(b.safeBlast(a, t)).toBe(false);
    b.step();
    expect(b.shots.some((shot) => shot.owner === a.id)).toBe(false);
    a.cooldown = 0;
    expect(b.fire(a, t)).toBe(true);
    friend.x = 450;
    expect(b.safeBlast(a, t)).toBe(true);
  });
  it("blast safety recognizes that cover shields an ally", () => {
    const { b, a, t } = pair("lobber");
    const friend = b.get(1)!;
    Object.assign(friend, { life: "alive", hp: 210, x: 340, y: 250 });
    expect(b.safeBlast(a, t)).toBe(false);
    b.cover = [{ x: 320, y: 220, w: 10, h: 60, hp: 100 }];
    expect(b.safeBlast(a, t)).toBe(true);
  });
  it("AI finishes a surviving crossing rather than stopping to fight in water", () => {
    const { b, a, t } = pair("torch");
    b.aiSides = [0, 1];
    b.random = () => 1;
    b.water = [{ x: 250, y: 0, w: 100, h: 560 }];
    b.bridges = [];
    a.x = 270;
    a.goal = { x: 390, y: 250 };
    a.path = [a.goal];
    const path = a.path;
    b.ai(a);
    expect(a.path).toBe(path);
    expect(a.goal).toEqual({ x: 390, y: 250 });
    a.path = [];
    a.goal = null;
    b.ai(a);
    expect(a.goal).not.toBeNull();
    expect(b.inWater(a.goal!)).toBe(false);
  });
  it("AI destinations avoid water while manual river orders retain the direct choice", () => {
    const { b, a } = pair("lobber");
    b.water = [{ x: 250, y: 0, w: 100, h: 560 }];
    b.bridges = [];
    b.setGoal(a, { x: 300, y: 250 });
    expect(b.inWater(a.goal!)).toBe(true);
    b.aiSides = [0, 1];
    b.setGoal(a, { x: 300, y: 250 });
    expect(b.inWater(a.goal!)).toBe(false);
  });
  it("diagnostic AI control is recorded in deterministic replays", () => {
    const b = new Battle(81);
    b.aiSides = [0, 1];
    advance(b, 5);
    const replay = replayBattle(b.replay(), b.tick);
    expect(replay.aiSides).toEqual([0, 1]);
    expect(replay.soldiers).toEqual(b.soldiers);
  });
});
