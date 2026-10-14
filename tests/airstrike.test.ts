import { describe, it, expect } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES, TUNING, type ClassId } from "../src/sim/data";
import { airstrikePhase } from "../src/view/airstrike";
describe("readable airstrikes", () => {
  it("has an approach, bomb drop and persistent aftermath tied to impact", () => {
    expect(airstrikePhase(TUNING.airstrikeWarning)).toBe("approach");
    expect(airstrikePhase(1)).toBe("bombs");
    expect(airstrikePhase(0)).toBe("impact");
    expect(airstrikePhase(-2)).toBe("impact");
    expect(airstrikePhase(-3)).toBe("finished");
  });
  it("emits distinct warning, bomb and impact cues once, with no premature damage", () => {
    const b = new Battle(42);
    b.aiSides = [];
    b.cover = [];
    b.water = [];
    for (const s of b.soldiers) {
      s.cooldown = 999;
      s.hold = true;
    }
    const t = b.get(5)!;
    t.x = 850;
    t.y = 280;
    b.powers[0] = ["airstrike"];
    b.useSuper(0, "airstrike", t);
    for (
      let i = 0;
      i < Math.round((TUNING.airstrikeWarning - 0.1) / TUNING.step);
      i++
    )
      b.step();
    expect(t.life).toBe("alive");
    expect(b.airstrikeEvents.map((e) => e.kind)).toEqual(["warning", "drop"]);
    for (let i = 0; i < 6; i++) b.step();
    expect(t.life).toBe("dead");
    expect(b.airstrikeEvents.map((e) => e.kind)).toEqual([
      "warning",
      "drop",
      "impact",
    ]);
    expect(b.strikes[0].impacted).toBe(true);
    for (let i = 0; i < 90; i++) b.step();
    expect(b.strikes).toEqual([]);
    expect(b.airstrikeEvents).toHaveLength(3);
  });
  it("replays warning and drop timing deterministically", () => {
    const b = new Battle(42);
    b.aiSides = [];
    b.command({ type: "move", id: 0, point: { x: 380, y: 520 } });
    for (let i = 0; i < 1200 && !b.powers[0].length; i++) b.step();
    const weapon = b.powers[0][0];
    expect(weapon).toBeDefined();
    b.command({ type: "super", side: 0, weapon, point: b.get(5)! });
    for (let i = 0; i < 180; i++) b.step();
    const r = replayBattle(b.replay(), b.tick);
    expect(r.airstrikeEvents).toEqual(b.airstrikeEvents);
    expect(r.strikes).toEqual(b.strikes);
    expect(r.soldiers).toEqual(b.soldiers);
  });
});
describe("deliberate movement pace", () => {
  for (const id of Object.keys(CLASSES) as ClassId[])
    for (const side of [0, 1] as const)
      it(`${id} on side ${side} moves at the slower land pace`, () => {
        const b = new Battle(42);
        b.aiSides = [];
        b.cover = [];
        b.water = [];
        for (const s of b.soldiers) s.cooldown = 999;
        const s = b.get(side * 5)!;
        s.classId = id;
        s.x = side === 0 ? 100 : 900;
        s.y = 100;
        b.command({
          type: "move",
          id: s.id,
          point: { x: s.x + (side === 0 ? 150 : -150), y: 100 },
        });
        const start = { x: s.x, y: s.y };
        for (let i = 0; i < 30; i++) b.step();
        const moved = Math.hypot(s.x - start.x, s.y - start.y);
        expect(moved).toBeGreaterThan(20);
        expect(moved).toBeLessThanOrEqual(31.01);
      });
  it("also slows auxiliary movement while keeping recruits faster than regular troops", () => {
    expect(TUNING.medicSpeed).toBe(62);
    expect(TUNING.reinforcementSpeed).toBe(105);
    expect(Math.max(...Object.values(CLASSES).map((c) => c.speed))).toBe(31);
  });
});
