import { describe, expect, it } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES, TUNING } from "../src/sim/data";
function fixture() {
  const b = new Battle(42);
  b.aiSides = []; b.cover = []; b.water = []; b.random = () => .5;
  b.soldiers.forEach(s => { s.life = "dead"; s.cooldown = 999; s.path = []; s.goal = null; });
  const a = b.get(0)!, t = b.get(5)!;
  Object.assign(a, { life: "alive", x: 100, y: 200, hold: true, cooldown: 0 });
  Object.assign(t, { life: "alive", x: 850, y: 200, hold: true });
  return { b, a, t };
}
function advance(b: Battle, seconds: number) { for (let i = 0; i < Math.ceil(seconds / TUNING.step); i++) b.step(); }

describe("passive fire versus commanded volleys", () => {
  it("continues firing unattended, at half the maximum commanded pace", () => {
    function run(active: boolean) {
      const { b } = fixture();
      for (let i = 0; i < 180; i++) {
        if (active) b.command({ type: "fire-all" });
        b.step();
      }
      return b.stats.shots;
    }
    const passive = run(false), commanded = run(true);
    expect(passive).toBe(3);
    expect(commanded).toBe(6);
  });
  it("uses the slower passive cadence for the opposing team too", () => {
    const { b, a, t } = fixture();
    a.side = 1; t.side = 0;
    advance(b, 6);
    expect(b.stats.shots).toBe(3);
  });
  it("applies the passive pause to automatic demolition fire as well", () => {
    const { b, a } = fixture();
    a.terrainTarget = { x: 200, y: 200 };
    b.step();
    advance(b, 1.3);
    expect(b.stats.shots).toBe(1);
    expect(b.fireAll()).toBe(1);
    expect(b.stats.shots).toBe(2);
  });
  it("Fire all skips passive hesitation only after the physical reload finishes", () => {
    const { b, a } = fixture();
    b.step();
    expect(b.stats.shots).toBe(1);
    expect(a.cooldown).toBe(CLASSES.rifleman.cooldown);
    expect(a.autoFireWait).toBe(CLASSES.rifleman.cooldown * TUNING.passiveFireMultiplier);
    advance(b, .4);
    const reload = a.cooldown, wait = a.autoFireWait;
    for (let i = 0; i < 10; i++) expect(b.fireAll()).toBe(0);
    expect(a.cooldown).toBe(reload);
    expect(a.autoFireWait).toBe(wait);
    advance(b, .8);
    expect(b.stats.shots).toBe(1);
    expect(a.cooldown).toBeLessThanOrEqual(0);
    expect(a.autoFireWait).toBeGreaterThan(0);
    expect(b.fireAll()).toBe(1);
    expect(b.fireAll()).toBe(0);
    expect(b.stats.shots).toBe(2);
  });
  it("one volley does not grant a lasting automatic-fire speed boost", () => {
    const { b } = fixture();
    expect(b.fireAll()).toBe(1);
    advance(b, 1.3);
    expect(b.stats.shots).toBe(1);
    advance(b, 1);
    expect(b.stats.shots).toBe(2);
  });
  it("retains doubled covered reloads, and leaving cover cannot accelerate them", () => {
    const { b, a } = fixture();
    b.command({ type: "cover", id: a.id, active: true });
    a.steadyTime = TUNING.aimSettleTime;
    expect(b.fireAll()).toBe(1);
    expect(a.cooldown).toBe(CLASSES.rifleman.cooldown * TUNING.coverReloadMultiplier);
    advance(b, 1.2);
    expect(b.fireAll()).toBe(0);
    const remaining = a.cooldown;
    b.command({ type: "cover", id: a.id, active: false });
    expect(a.cooldown).toBe(remaining);
    advance(b, 1.2);
    expect(b.stats.shots).toBe(1);
    expect(b.fireAll()).toBe(1);
  });
  it("cannot use the faster command cadence to bypass facing, movement or manual rocket control", () => {
    const { b, a } = fixture();
    a.heading = Math.PI;
    expect(b.fireAll()).toBe(0);
    a.heading = 0;
    b.command({ type: "move", id: a.id, point: { x: 150, y: 200 } });
    expect(b.fireAll()).toBe(0);
    a.path = []; a.goal = null; a.moving = false;
    a.classId = "bazooka";
    b.command({ type: "select", id: a.id });
    expect(b.fireAll()).toBe(0);
    expect(b.aimRocket(a, { x: 200, y: 200 })).toBe(true);
    expect(a.cooldown).toBe(TUNING.manualRocketReload);
  });
  it("pauses both timers during deployment", () => {
    const { b, a } = fixture();
    b.fireAll();
    const reload = a.cooldown, wait = a.autoFireWait;
    b.planningTicks = 60;
    advance(b, 1);
    expect(a.cooldown).toBe(reload);
    expect(a.autoFireWait).toBe(wait);
    expect(b.fireAll()).toBe(0);
  });
  it("replays repeated volleys and passive waits deterministically", () => {
    const b = new Battle(63);
    b.aiSides = [];
    for (let i = 0; i < 120; i++) {
      if (i % 10 === 0) b.command({ type: "fire-all" });
      b.step();
    }
    const copy = replayBattle(b.replay(), b.tick);
    expect(copy.soldiers).toEqual(b.soldiers);
    expect(copy.shots).toEqual(b.shots);
    expect(copy.stats).toEqual(b.stats);
  });
});
