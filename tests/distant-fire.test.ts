import { describe, it, expect } from "vitest";
import { Battle } from "../src/sim/battle";
import { CLASSES, TUNING, type ClassId } from "../src/sim/data";

function distant(classId: ClassId = "rifleman") {
  const b = new Battle(42);
  b.aiSides = [];
  b.cover = [];
  b.water = [];
  b.random = () => 0.5;
  for (const s of b.soldiers) {
    s.life = "dead";
    s.path = [];
    s.goal = null;
  }
  const a = b.get(0)!,
    target = b.get(5)!;
  Object.assign(a, {
    life: "alive",
    classId,
    x: 100,
    y: 200,
    hold: true,
    cooldown: 0,
  });
  Object.assign(target, {
    life: "alive",
    x: 800,
    y: 400,
    cooldown: 1e6,
    hold: true,
  });
  return { b, a, target };
}
describe("out-of-range automatic fire", () => {
  for (const id of Object.keys(CLASSES) as ClassId[])
    it(`${id} fires toward the nearest enemy and misses without damaging units`, () => {
      const { b, a, target } = distant(id);
      const far = b.get(6)!;
      Object.assign(far, {
        life: "alive",
        x: 1000,
        y: 500,
        cooldown: 1e6,
        hold: true,
      });
      // A stale explicit target must not direct these misses past the closest enemy.
      a.target = far.id;
      b.step();
      const shot = b.shots.find((s) => s.owner === a.id)!;
      expect(shot).toBeDefined();
      expect(shot.miss).toBe(true);
      expect(shot.target).toBe(target.id);
      expect(Math.hypot(shot.to.x - a.x, shot.to.y - a.y)).toBeCloseTo(
        CLASSES[id].range,
      );
      expect((shot.to.x - a.x) / (target.x - a.x)).toBeCloseTo(
        (shot.to.y - a.y) / (target.y - a.y),
      );
      const friend = b.get(1)!;
      Object.assign(friend, { life: "alive", x: shot.to.x, y: shot.to.y });
      // Even a unit moving onto the landing point cannot turn a guaranteed miss into a hit.
      const health = b.soldiers.map((s) => s.hp);
      b.resolveShot(shot);
      expect(b.soldiers.map((s) => s.hp)).toEqual(health);
      expect(a.cooldown).toBeGreaterThan(0);
      expect(b.fireDistant(a, target)).toBe(false);
    });
  it("preserves destructible cover when distant fire is intercepted", () => {
    for (const id of ["bazooka", "sapper"] as ClassId[]) {
      const { b, a, target } = distant(id);
      b.cover = [{ x: 170, y: 210, w: 20, h: 50, hp: 100 }];
      const hits = id === "bazooka" ? 3 : 1;
      for (let n = 0; n < hits; n++) {
        a.cooldown = 0;
        expect(b.fireDistant(a, target)).toBe(true);
        const shot = b.shots.at(-1)!;
        expect(shot.hitCover).toBe(true);
        b.resolveShot(shot);
        if (n < hits - 1) expect(b.cover[0].hp).toBe(100 - 40 * (n + 1));
      }
      expect(b.cover).toHaveLength(0);
      expect(target.hp).toBe(CLASSES[target.classId].hp);
    }
  });
  it("keeps firing at its slower passive cadence and damages targets once they enter range", () => {
    const { b, a, target } = distant();
    for (
      let i = 0;
      i < Math.ceil((2.2 * CLASSES.rifleman.cooldown * TUNING.passiveFireMultiplier) / TUNING.step);
      i++
    )
      b.step();
    expect(b.stats.shots).toBeGreaterThanOrEqual(2);
    expect(target.hp).toBe(CLASSES[target.classId].hp);
    target.x = 200;
    target.y = 200;
    a.cooldown = 0;
    a.autoFireWait = 0; // Re-arm the fixture after its preceding distant shot.
    b.step();
    const shot = b.shots.find((s) => s.owner === a.id && !s.miss)!;
    expect(shot).toBeDefined();
    b.resolveShot(shot);
    expect(target.hp).toBeLessThan(CLASSES[target.classId].hp);
  });
  it("Fire all emits misses from stationary soldiers only", () => {
    const { b, a } = distant();
    a.path = [{ x: 150, y: 200 }];
    expect(b.fireAll()).toBe(0);
    a.path = [];
    expect(b.fireAll()).toBe(1);
    expect(b.shots[0].miss).toBe(true);
  });
  it("still respects jams, brawls, drowning, and Torch's water restriction", () => {
    const { b, a, target } = distant();
    a.jam = 1;
    expect(b.fireDistant(a, target)).toBe(false);
    a.jam = 0;
    a.brawl = target.id;
    expect(b.fireDistant(a, target)).toBe(false);
    a.brawl = null;
    a.drowningTime = TUNING.drowningDuration;
    expect(b.fireDistant(a, target)).toBe(false);
    a.drowningTime = 0;
    a.classId = "torch";
    b.water = [{ x: 80, y: 180, w: 40, h: 40 }];
    expect(b.fireDistant(a, target)).toBe(false);
    expect(b.shots).toHaveLength(0);
  });
});
