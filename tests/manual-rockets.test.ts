import { describe, expect, it } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES } from "../src/sim/data";
function fixture() {
  const b = new Battle(42);
  b.aiSides = [];
  b.water = [];
  b.cover = [];
  for (const s of b.soldiers) s.life = "dead";
  const a = b.get(1)!,
    t = b.get(5)!;
  Object.assign(a, { life: "alive", x: 100, y: 200, cooldown: 0, hold: true });
  Object.assign(t, {
    life: "alive",
    x: 350,
    y: 200,
    cooldown: 999,
    hold: true,
  });
  b.command({ type: "select", id: a.id });
  return { b, a, t };
}
describe("manual rocket tradeoffs", () => {
  it("requires each selected shot and excludes the selected launcher from Fire all", () => {
    const { b, a, t } = fixture();
    b.step();
    expect(b.shots).toHaveLength(0);
    expect(b.fireAll()).toBe(0);
    b.command({ type: "attack", id: a.id, target: t.id });
    expect(b.shots).toHaveLength(1);
    b.command({ type: "attack", id: a.id, target: t.id });
    expect(b.shots).toHaveLength(1);
    // Move off the snapshot before impact; no homing and no automatic repeat.
    t.y = 300;
    for (let i = 0; i < 150; i++) b.step();
    expect(t.life).toBe("alive");
    expect(b.stats.shots).toBe(1);
    expect(a.cooldown).toBeLessThanOrEqual(0);
  });
  it("manual aim is exact regardless of RNG and bracing cancels movement", () => {
    for (const roll of [0.01, 0.99]) {
      const { b, a, t } = fixture();
      b.random = () => roll;
      b.command({ type: "move", id: a.id, point: { x: 150, y: 200 } });
      b.command({ type: "aim", id: a.id, point: { x: t.x, y: t.y } });
      expect(b.shots[0].to).toEqual({ x: t.x, y: t.y });
      expect(b.shots[0].manual).toBe(true);
      expect(a.path).toEqual([]);
      expect(a.goal).toBeNull();
      expect(a.cooldown).toBe(4);
      b.resolveShot(b.shots[0]);
      expect(t.life).toBe("dead");
    }
  });
  it("unselected rockets fire automatically with scatter; enemies scatter farther", () => {
    const { b, a, t } = fixture();
    b.random = () => 0.99;
    b.selected = null;
    b.step();
    const shot = b.shots[0];
    expect(shot.manual).toBe(false);
    expect(shot.to.y).not.toBe(t.y);
    const autoError = Math.abs(Math.atan2(shot.to.y - a.y, shot.to.x - a.x));
    b.shots = [];
    a.cooldown = 0;
    a.side = 1;
    t.side = 0;
    b.fire(a, t);
    const enemy = b.shots[0];
    expect(
      Math.abs(Math.atan2(enemy.to.y - a.y, enemy.to.x - a.x)),
    ).toBeGreaterThan(autoError);
  });
  it("rejects manual orders for unattended units and during deployment", () => {
    const { b, a, t } = fixture();
    b.selected = null;
    expect(b.aimRocket(a, t)).toBe(false);
    const planning = new Battle(42, 0, false, 10);
    planning.command({ type: "select", id: 1 });
    planning.command({ type: "aim", id: 1, point: { x: 300, y: 200 } });
    expect(planning.shots).toEqual([]);
  });
  it("manual commands replay deterministically", () => {
    const b = new Battle(42);
    b.command({ type: "select", id: 1 });
    b.command({ type: "aim", id: 1, point: { x: 300, y: 100 } });
    for (let i = 0; i < 150; i++) b.step();
    const replay = replayBattle(b.replay(), b.tick);
    expect(replay.soldiers).toEqual(b.soldiers);
    expect(replay.rngState).toBe(b.rngState);
  });
  it("gives heavy rockets more armor and dynamite a severe reach disadvantage", () => {
    expect(CLASSES.bazooka.hp).toBeGreaterThan(CLASSES.rifleman.hp);
    expect(CLASSES.rifleman.hp).toBeGreaterThan(CLASSES.lobber.hp);
    expect(CLASSES.lobber.hp).toBeGreaterThan(CLASSES.sapper.hp);
    expect(CLASSES.sapper.range).toBeLessThan(CLASSES.rifleman.range / 3);
    expect(CLASSES.rifleman.cooldown).toBeLessThan(CLASSES.lobber.cooldown / 4);
  });
});
