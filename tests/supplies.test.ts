import { describe, expect, it } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { COVER, CLASSES, TUNING } from "../src/sim/data";
import { legal, pathfind } from "../src/sim/geometry";
function fixture() {
  const b = new Battle(42);
  b.aiSides = [];
  b.cover = [];
  b.water = [];
  for (const s of b.soldiers) {
    s.life = "dead";
    s.cooldown = 999;
    s.hold = true;
  }
  const a = b.get(0)!,
    t = b.get(5)!;
  Object.assign(a, { life: "alive", hp: 230, x: 100, y: 200 });
  Object.assign(t, { life: "alive", hp: 230, x: 900, y: 200 });
  return { b, a, t };
}
function advance(b: Battle, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / TUNING.step); i++) b.step();
}
describe("contested supply drops", () => {
  it("removes the central crate, adds broad cover and makes every drop reachable", () => {
    const b = new Battle(42);
    expect(COVER.some((r) => r.material === "crate")).toBe(false);
    expect(COVER.filter((r) => r.x < 475).length).toBeGreaterThanOrEqual(4);
    expect(COVER.filter((r) => r.x > 625).length).toBeGreaterThanOrEqual(4);
    for (const s of b.soldiers)
      expect(
        pathfind(s, b.get(s.side === 0 ? 5 : 0)!, b.dryCover()).length,
      ).toBeGreaterThan(0);
    expect(b.supplies.length).toBeGreaterThanOrEqual(2);
    expect(b.supplies.some((p) => b.inWater(p))).toBe(true);
    for (const p of b.supplies) {
      expect(legal(p, b.cover)).toBe(true);
      const path = pathfind(b.get(0)!, p, b.cover);
      expect(path.length).toBeGreaterThan(0);
      expect(
        Math.hypot(path.at(-1)!.x - p.x, path.at(-1)!.y - p.y),
      ).toBeLessThan(24);
    }
  });
  it("awards each random reward once to either side on physical contact", () => {
    for (const [roll, weapon] of [
      [0.1, "airstrike"],
      [0.5, "sniper"],
      [0.9, "reinforcements"],
    ] as const) {
      const { b, a, t } = fixture();
      b.random = () => roll;
      Object.assign(t, { x: b.supplies[0].x, y: b.supplies[0].y });
      b.collectSupplies();
      expect(b.powers[1]).toEqual([weapon]);
      expect(b.supplies[0].claimedBy).toBe(1);
      Object.assign(a, { x: b.supplies[0].x, y: b.supplies[0].y });
      b.collectSupplies();
      expect(b.powers[0]).toEqual([]);
      expect(b.powers[1]).toHaveLength(1);
    }
  });
  it("does not award drops during planning or to downed or drowning troops", () => {
    const b = new Battle(42, 0, false, 10);
    Object.assign(b.get(0)!, b.supplies[0]);
    b.step();
    expect(b.powers[0]).toEqual([]);
    const f = fixture();
    Object.assign(f.a, f.b.supplies[0], { life: "down" });
    f.b.collectSupplies();
    expect(f.b.powers[0]).toEqual([]);
    f.a.life = "alive";
    f.a.drowningTime = 1;
    f.b.collectSupplies();
    expect(f.b.powers[0]).toEqual([]);
    expect(new Battle(42, 0, true).supplies).toEqual([]);
  });
  it("sniper consumes one shot only for a valid enemy and kills through cover", () => {
    const { b, a, t } = fixture();
    b.powers[0] = ["sniper"];
    b.cover = [{ x: 400, y: 150, w: 100, h: 100, hp: 100 }];
    expect(b.useSuper(0, "sniper", a)).toBe(false);
    expect(b.powers[0]).toHaveLength(1);
    expect(b.useSuper(0, "sniper", t)).toBe(true);
    expect(t.life).toBe("dead");
    expect(b.powers[0]).toEqual([]);
    expect(b.useSuper(0, "sniper", t)).toBe(false);
  });
  it("airstrikes warn before impact, kill exposed allies too and retain cover shielding", () => {
    const { b, a, t } = fixture();
    Object.assign(a, { x: 850, y: 200 });
    const protectedUnit = b.get(6)!;
    Object.assign(protectedUnit, { life: "alive", x: 900, y: 275, hp: 230 });
    b.cover = [{ x: 870, y: 235, w: 80, h: 20, hp: 100 }];
    b.powers[0] = ["airstrike"];
    expect(b.useSuper(0, "airstrike", { x: 900, y: 200 })).toBe(true);
    advance(b, 1);
    expect(a.life).toBe("alive");
    expect(t.life).toBe("alive");
    expect(b.strikes).toHaveLength(1);
    advance(b, TUNING.airstrikeWarning - 1 + 0.1);
    expect(a.life).toBe("dead");
    expect(t.life).toBe("dead");
    expect(protectedUnit.life).toBe("alive");
    expect(b.cover).toEqual([]);
    expect(b.rubble).toHaveLength(1);
  });
  it("reinforcements charge quickly, cannot shoot, and kill only on contact", () => {
    const { b, t } = fixture();
    b.powers[0] = ["reinforcements"];
    b.useSuper(0, "reinforcements", { x: 300, y: 200 });
    const recruits = b.soldiers.filter((s) => s.reinforcement);
    expect(recruits).toHaveLength(3);
    expect(recruits.every((s) => s.hp === 18)).toBe(true);
    expect(b.fire(recruits[0], t)).toBe(false);
    advance(b, 1);
    expect(t.life).toBe("alive");
    expect(b.stats.shots).toBe(0);
    expect(recruits[0].x).toBeGreaterThan(100);
    expect(recruits[0].x).toBeLessThan(150);
    advance(b, 10);
    expect(t.life).toBe("dead");
    expect(b.stats.shots).toBe(0);
  });
  it("recruits die to one rifle hit, cannot be revived and expire", () => {
    const { b } = fixture();
    b.powers[0] = ["reinforcements"];
    b.useSuper(0, "reinforcements", { x: 300, y: 200 });
    const recruits = b.soldiers.filter((s) => s.reinforcement);
    b.random = () => 0.5;
    b.damage(recruits[0], CLASSES.rifleman.damage, "rifleman");
    expect(recruits[0].life).toBe("dead");
    expect(b.callMedic(recruits[0].id, 0)).toBe(false);
    recruits[1].expiresAt = 0;
    b.tickReinforcement(recruits[1], TUNING.step);
    expect(recruits[1].life).toBe("dead");
  });
  it("keeps reward collection, enemy use and reinforcements deterministic on replay", () => {
    const b = new Battle(81);
    b.aiSides = [0, 1];
    for (let i = 0; i < 600 && b.winner === null; i++) b.step();
    const replay = replayBattle(b.replay(), b.tick);
    expect(replay.supplies).toEqual(b.supplies);
    expect(replay.powers).toEqual(b.powers);
    expect(replay.soldiers).toEqual(b.soldiers);
    expect(replay.rngState).toBe(b.rngState);
  }, 15000);
  it("replays a collected and activated reward from ordinary player commands", () => {
    const b = new Battle(42);
    b.aiSides = [];
    b.command({ type: "move", id: 0, point: { x: 380, y: 520 } });
    for (let i = 0; i < 900 && b.powers[0].length === 0; i++) b.step();
    expect(b.powers[0]).toHaveLength(1);
    const weapon = b.powers[0][0];
    b.command({
      type: "super",
      side: 0,
      weapon,
      point: { x: b.get(5)!.x, y: b.get(5)!.y },
    });
    advance(b, 2);
    const r = replayBattle(b.replay(), b.tick);
    expect(r.soldiers).toEqual(b.soldiers);
    expect(r.powers).toEqual(b.powers);
    expect(r.strikes).toEqual(b.strikes);
    expect(r.rngState).toBe(b.rngState);
  });
});
