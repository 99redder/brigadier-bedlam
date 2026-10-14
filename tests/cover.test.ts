import { describe, it, expect } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES, TUNING } from "../src/sim/data";
function field() {
  const b = new Battle(42);
  b.aiSides = [];
  b.cover = [];
  b.water = [];
  b.supplies = [];
  for (const s of b.soldiers) {
    s.cooldown = 999;
    s.hold = true;
  }
  return b;
}
describe("individual take-cover stance", () => {
  it("cancels movement and locks individual and group moves until explicitly left", () => {
    const b = field(),
      s = b.get(0)!;
    b.command({ type: "move", id: 0, point: { x: 200, y: 100 } });
    b.command({ type: "cover", id: 0, active: true });
    const start = { x: s.x, y: s.y };
    expect(s.path).toEqual([]);
    expect(s.hold).toBe(true);
    b.command({ type: "move", id: 0, point: { x: 200, y: 100 } });
    b.command({ type: "squad-move", point: { x: 250, y: 300 } });
    for (let i = 0; i < 60; i++) b.step();
    expect({ x: s.x, y: s.y }).toEqual(start);
    expect(s.goal).toBeNull();
    b.command({ type: "cover", id: 0, active: false });
    b.command({ type: "move", id: 0, point: { x: 200, y: 100 } });
    expect(s.path.length).toBeGreaterThan(0);
  });
  it("doubles every shot's reload without shortening it on exit or repeat cover orders", () => {
    const b = field(),
      s = b.get(0)!;
    b.command({ type: "cover", id: 0, active: true });
    s.cooldown = 0;
    s.steadyTime = 1;
    b.random = () => 0.5;
    expect(b.fireAt(s, { x: s.x + 100, y: s.y })).toBe(true);
    expect(s.cooldown).toBe(CLASSES.rifleman.cooldown * 2);
    b.command({ type: "cover", id: 0, active: true });
    expect(s.cooldown).toBe(CLASSES.rifleman.cooldown * 2);
    b.command({ type: "cover", id: 0, active: false });
    expect(s.cooldown).toBe(CLASSES.rifleman.cooldown * 2);
    expect(b.fireAll()).toBe(0);
  });
  it("also penalizes precise manual rockets", () => {
    const b = field(),
      s = b.get(1)!;
    b.command({ type: "select", id: 1 });
    b.command({ type: "cover", id: 1, active: true });
    s.cooldown = 0;
    b.command({ type: "aim", id: 1, point: { x: s.x + 100, y: s.y } });
    expect(b.shots[0].manual).toBe(true);
    expect(s.cooldown).toBe(TUNING.manualRocketReload * 2);
  });
  it("makes distant rifle hits substantially rarer using projectile geometry", () => {
    function hits(covered: boolean, gap = 180) {
      const b = field(),
        a = b.get(0)!,
        t = b.get(5)!;
      Object.assign(a, { x: 100, y: 250 });
      Object.assign(t, { x: 100 + gap, y: 250, hp: 1e6 });
      b.command({ type: "cover", id: t.id, active: covered });
      let n = 0;
      for (let i = 0; i < 180; i++) {
        a.cooldown = 0;
        a.jam = 0;
        const before = t.hp;
        if (b.fire(a, t)) {
          b.resolveShot(b.shots.pop()!);
          if (t.hp < before) n++;
        }
      }
      return n;
    }
    const exposed = hits(false),
      covered = hits(true);
    expect(exposed).toBeGreaterThan(150);
    expect(covered).toBeLessThan(exposed * 0.4);
    expect(hits(true, 40)).toBeGreaterThan(covered * 2);
  });
  it("does not turn cover into armor against lethal explosives or close combat", () => {
    const b = field(),
      a = b.get(1)!,
      t = b.get(5)!;
    Object.assign(a, { x: 100, y: 250 });
    Object.assign(t, { x: 230, y: 250 });
    b.command({ type: "cover", id: t.id, active: true });
    b.command({ type: "select", id: 1 });
    a.cooldown = 0;
    b.command({ type: "aim", id: 1, point: { x: t.x, y: t.y } });
    b.resolveShot(b.shots[0]);
    expect(t.life).toBe("dead");
    expect(t.takingCover).toBe(false);
    const x = field(),
      u = x.get(0)!,
      v = x.get(5)!;
    x.command({ type: "cover", id: 0, active: true });
    x.startBrawl(u, v);
    expect(u.takingCover).toBe(false);
  });
  it("allows deployment orders but rejects water, brawls, downed troops and recruits", () => {
    const b = new Battle(42, 0, false, 10);
    b.command({ type: "cover", id: 0, active: true });
    expect(b.get(0)!.takingCover).toBe(true);
    b.step();
    expect(b.shots).toEqual([]);
    const f = field(),
      s = f.get(0)!;
    f.water = [{ x: s.x - 10, y: s.y - 10, w: 20, h: 20 }];
    f.command({ type: "cover", id: 0, active: true });
    expect(s.takingCover).not.toBe(true);
    f.water = [];
    s.life = "down";
    f.command({ type: "cover", id: 0, active: true });
    expect(s.takingCover).not.toBe(true);
    s.life = "alive";
    s.reinforcement = true;
    f.command({ type: "cover", id: 0, active: true });
    expect(s.takingCover).not.toBe(true);
  });
  it("replays cover orders, locked movement and reloads deterministically", () => {
    const b = new Battle(42);
    b.aiSides = [];
    b.command({ type: "cover", id: 0, active: true });
    for (let i = 0; i < 90; i++) b.step();
    b.command({ type: "move", id: 0, point: { x: 200, y: 100 } });
    b.command({ type: "cover", id: 0, active: false });
    for (let i = 0; i < 90; i++) b.step();
    const r = replayBattle(b.replay(), b.tick);
    expect(r.soldiers).toEqual(b.soldiers);
    expect(r.rngState).toBe(b.rngState);
  });
});
