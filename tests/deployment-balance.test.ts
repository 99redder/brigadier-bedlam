import { describe, expect, it } from "vitest";
import { Battle, replayBattle, type Shot } from "../src/sim/battle";
import { CLASSES, TUNING, type ClassId } from "../src/sim/data";
function advance(b: Battle, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / TUNING.step); i++) b.step();
}
function combat(id: ClassId = "torch", victim: ClassId = "rifleman") {
  const b = new Battle(42);
  b.aiSides = [];
  b.cover = [];
  b.water = [];
  b.random = () => 0.99;
  for (const s of b.soldiers) {
    s.life = "dead";
    s.cooldown = 1e6;
    s.path = [];
    s.goal = null;
  }
  const a = b.get(0)!,
    t = b.get(5)!;
  Object.assign(a, {
    life: "alive",
    classId: id,
    x: 100,
    y: 200,
    hp: CLASSES[id].hp,
  });
  Object.assign(t, {
    life: "alive",
    classId: victim,
    x: 180,
    y: 200,
    hp: CLASSES[victim].hp,
  });
  return { b, a, t };
}
function impact(f: ReturnType<typeof combat>) {
  const shot: Shot = {
    id: 0,
    owner: f.a.id,
    target: f.t.id,
    classId: f.a.classId,
    from: { x: 100, y: 200 },
    to: { x: 180, y: 200 },
    time: 1,
    duration: 1,
  };
  f.b.resolveShot(shot);
}
describe("opening deployment", () => {
  it("freezes both teams, weapons, and combat time for ten seconds while accepting moves", () => {
    const b = new Battle(42, 0, false, TUNING.deploymentSeconds);
    const start = b.soldiers.map((s) => ({ x: s.x, y: s.y, hp: s.hp }));
    expect(b.countdown).toBe(10);
    b.command({ type: "move", id: 0, point: { x: 230, y: 75 } });
    const route = structuredClone(b.get(0)!.path);
    expect(route.length).toBeGreaterThan(0);
    b.command({ type: "fire-all" });
    b.command({ type: "demolish", id: 1, point: { x: 250, y: 220 } });
    expect(b.get(1)!.terrainTarget).toBeNull();
    advance(b, 9);
    expect(b.countdown).toBe(1);
    expect(b.get(0)!.path).toEqual(route);
    advance(b, 1);
    expect(b.planning).toBe(false);
    expect(b.time).toBe(0);
    expect(b.soldiers.map((s) => ({ x: s.x, y: s.y, hp: s.hp }))).toEqual(
      start,
    );
    expect(b.shots).toHaveLength(0);
    b.step();
    expect(b.time).toBeCloseTo(TUNING.step);
    expect(b.get(0)!.x).toBeGreaterThan(start[0].x);
    advance(b, 1);
    expect(b.soldiers.some((s) => s.side === 1 && s.x !== start[s.id].x)).toBe(
      true,
    );
  });
  it("lets players revise and cancel queued orders without spending combat resources", () => {
    const b = new Battle(42, 0, false, 10);
    b.cover = [];
    b.command({ type: "move", id: 0, point: { x: 220, y: 75 } });
    b.command({ type: "move", id: 0, point: { x: 230, y: 100 } });
    expect(b.get(0)!.goal).toEqual({ x: 230, y: 100 });
    b.command({ type: "hold", id: 0 });
    expect(b.get(0)!.path).toHaveLength(0);
    b.get(1)!.life = "down";
    b.command({ type: "medic", side: 0, target: 1 });
    expect(b.calls[0]).toBe(2);
    expect(b.medics).toHaveLength(0);
    expect(b.fireAt(b.get(2)!, { x: 200, y: 200 })).toBe(false);
  });
  it("records the countdown and opening orders in deterministic replays", () => {
    const b = new Battle(81, 0, false, 10);
    b.aiSides = [];
    b.command({ type: "move", id: 0, point: { x: 230, y: 75 } });
    advance(b, 4);
    b.command({ type: "move", id: 0, point: { x: 240, y: 100 } });
    advance(b, 8);
    const replay = replayBattle(b.replay(), b.tick);
    expect(replay.soldiers).toEqual(b.soldiers);
    expect(replay.rngState).toBe(b.rngState);
    expect(replay.time).toBe(b.time);
    expect(replay.planningTicks).toBe(b.planningTicks);
    expect(new Battle(42, 0, true, 10).planning).toBe(false);
  });
});
describe("slower, more lethal combat", () => {
  for (const id of ["bazooka", "sapper"] as ClassId[])
    it(`${id} kills on one exposed hit without a lucky roll`, () => {
      const f = combat(id);
      f.t.hp = 9999;
      impact(f);
      expect(f.t.life).toBe("dead");
      expect(f.t.hp).toBe(0);
    });
  for (const victim of Object.keys(CLASSES) as ClassId[])
    it(`grenades respect ${victim} armor`, () => {
      const f = combat("lobber", victim);
      impact(f);
      expect(f.t.life).toBe("alive");
      impact(f);
      if (victim === "bazooka") {
        expect(f.t.life).toBe("alive");
        impact(f);
      }
      expect(f.t.life).toBe("down");
      expect(f.t.hp).toBe(0);
    });
  it("slows movement and fire while rifle damage still takes multiple hits", () => {
    const f = combat("rifleman");
    expect(Object.values(CLASSES).every((c) => c.speed <= 52)).toBe(true);
    expect(CLASSES.rifleman.cooldown).toBeLessThan(CLASSES.bazooka.cooldown);
    impact(f);
    expect(f.t.life).toBe("alive");
    expect(f.t.hp).toBeLessThan(CLASSES.rifleman.hp);
  });
});
describe("persistent burning", () => {
  it("keeps hurting after the victim leaves weapon range, killing slowly as ash", () => {
    const f = combat("torch", "torch");
    impact(f);
    expect(f.t.life).toBe("alive");
    expect(f.t.burnRemaining).toBe(8);
    f.t.x = 800;
    const initial = f.t.hp;
    advance(f.b, 2);
    expect(f.t.life).toBe("alive");
    expect(f.t.hp).toBeCloseTo(initial - 70);
    advance(f.b, 6);
    expect(f.t.life).toBe("dead");
    expect(f.t.death).toBe("ash");
  });
  it("refreshes duration without stacking burn damage", () => {
    const f = combat();
    impact(f);
    f.b.tickBurn(f.t, 1);
    impact(f);
    expect(f.t.burnRemaining).toBe(8);
    const before = f.t.hp;
    f.b.tickBurn(f.t, 1);
    expect(f.t.hp).toBeCloseTo(before - 35);
  });
  it("extinguishes in river water and does not ignite through cover", () => {
    const f = combat();
    impact(f);
    f.b.water = [{ x: 170, y: 190, w: 30, h: 30 }];
    const before = f.t.hp;
    f.b.tickBurn(f.t, 1);
    expect(f.t.burnRemaining).toBe(0);
    expect(f.t.hp).toBe(before);
    const shielded = combat();
    shielded.b.cover = [{ x: 140, y: 180, w: 15, h: 40, hp: 100 }];
    impact(shielded);
    expect(shielded.t.burnRemaining).toBe(0);
  });
  it("burns medics and clears the effect on death", () => {
    const f = combat();
    f.b.get(6)!.life = "down";
    f.b.callMedic(6, 1);
    const m = f.b.medics[0];
    Object.assign(m, { x: 180, y: 200 });
    f.t.x = 800;
    impact(f);
    expect(m.burnRemaining).toBe(8);
    f.b.tickBurn(m, 2);
    expect(m.life).toBe("dead");
    expect(m.death).toBe("ash");
    expect(m.burnRemaining).toBe(0);
  });
});
