import { describe, it, expect } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES, TUNING } from "../src/sim/data";
import { distance } from "../src/sim/geometry";
function field() {
  const b = new Battle(42);
  b.aiSides = [];
  b.water = [];
  b.cover = [];
  b.supplies = [];
  for (const s of b.soldiers) {
    s.cooldown = 999;
    s.hold = true;
  }
  return b;
}
describe("positioning and coordinated orders", () => {
  it("reels rifle reach and cadence in below long-range support weapons", () => {
    expect(CLASSES.rifleman.range).toBe(210);
    expect(CLASSES.rifleman.cooldown).toBe(1.1);
    expect(CLASSES.rifleman.range).toBeLessThan(CLASSES.lobber.range * 0.65);
    const b = field(),
      a = b.get(0)!,
      t = b.get(5)!;
    a.cooldown = 0;
    t.x = a.x + 211;
    t.y = a.y;
    expect(b.canShoot(a, t)).toBe(false);
    t.x--;
    expect(b.canShoot(a, t)).toBe(true);
  });
  it("holds automatic fire while advancing and takes time to aim after stopping", () => {
    const b = field(),
      a = b.get(0)!,
      t = b.get(5)!;
    a.cooldown = 0;
    Object.assign(a, { x: 100, y: 200 });
    Object.assign(t, { x: 260, y: 200 });
    b.command({ type: "move", id: 0, point: { x: 125, y: 200 } });
    for (let i = 0; i < 15; i++) b.step();
    expect(b.shots.filter((s) => s.owner === a.id)).toEqual([]);
    b.command({ type: "hold", id: 0 });
    expect(b.fireAll()).toBe(0);
    for (let i = 0; i < Math.floor(TUNING.aimSettleTime / TUNING.step) - 1; i++)
      b.step();
    expect(b.stats.shots).toBe(0);
    for (let i = 0; i < 4; i++) b.step();
    expect(b.stats.shots).toBe(1);
  });
  it("queues spaced squad destinations and synchronizes clear-ground arrival", () => {
    const b = field();
    b.command({ type: "squad-move", point: { x: 350, y: 280 } });
    const troops = b.soldiers.filter((s) => s.side === 0),
      durations = troops.map((s) => {
        let n = 0,
          p = s;
        for (const next of s.path) {
          n += distance(p, next);
          p = { ...s, ...next };
        }
        return n / s.formationSpeed!;
      });
    expect(new Set(troops.map((s) => `${s.goal!.x},${s.goal!.y}`)).size).toBe(
      5,
    );
    expect(Math.max(...durations) - Math.min(...durations)).toBeLessThan(0.001);
    expect(
      troops.every((s) => s.formationSpeed! <= CLASSES[s.classId].speed),
    ).toBe(true);
    for (
      let i = 0;
      i < Math.ceil(Math.max(...durations) / TUNING.step) + 15;
      i++
    )
      b.step();
    expect(troops.every((s) => !s.path.length)).toBe(true);
    expect(troops.every((s) => s.x > 340)).toBe(true);
  });
  it("keeps squad moves frozen during deployment and permits individual overrides", () => {
    const b = new Battle(42, 0, false, 10);
    b.command({ type: "squad-move", point: { x: 310, y: 280 } });
    const before = b.soldiers.map((s) => ({ x: s.x, y: s.y }));
    for (let i = 0; i < 60; i++) b.step();
    expect(b.soldiers.map((s) => ({ x: s.x, y: s.y }))).toEqual(before);
    b.command({ type: "hold", id: 0 });
    expect(b.get(0)!.formationSpeed).toBeUndefined();
    expect(b.get(0)!.path).toEqual([]);
    expect(b.get(1)!.formationSpeed).toBeDefined();
  });
  it("excludes unavailable troops from squad movement", () => {
    const b = field();
    b.get(0)!.life = "down";
    b.get(1)!.drowningTime = 1;
    b.get(2)!.brawl = 5;
    b.command({ type: "squad-move", point: { x: 310, y: 280 } });
    expect(b.get(0)!.goal).toBeNull();
    expect(b.get(1)!.goal).toBeNull();
    expect(b.get(2)!.goal).toBeNull();
    expect(b.get(3)!.goal).not.toBeNull();
  });
  it("replays coordinated deployment orders deterministically", () => {
    const b = new Battle(42, 0, false, 10);
    b.aiSides = [];
    b.command({ type: "squad-move", point: { x: 310, y: 280 } });
    for (let i = 0; i < 600; i++) b.step();
    const r = replayBattle(b.replay(), b.tick);
    expect(r.soldiers).toEqual(b.soldiers);
    expect(r.rngState).toBe(b.rngState);
  });
});
