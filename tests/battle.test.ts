import { describe, it, expect } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES, TUNING, type ClassId } from "../src/sim/data";
import { distance, blocked, pathfind } from "../src/sim/geometry";
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
    expect(b.calls[0]).toBe(2);
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
      expect(b.calls[0]).toBe(3);
    });
  it("medics cannot exceed 3 calls", () => {
    const b = new Battle(9);
    for (const s of b.soldiers.filter((s) => s.side === 0)) s.life = "down";
    expect([0, 1, 2, 3].map((id) => b.callMedic(id, 0))).toEqual([
      true,
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
