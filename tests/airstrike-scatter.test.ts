import { describe, expect, it } from "vitest";
import { Battle } from "../src/sim/battle";
import { scatterAirstrike } from "../src/sim/airstrike";
import { FIELD, TUNING } from "../src/sim/data";
function rolls(...values: number[]) { let i = 0; return () => values[i++ % values.length]; }

describe("inaccurate airstrike runs", () => {
  for (const [roll, accuracy, offset] of [
    [0, "near", 17.5], [.24999, "near", 17.5],
    [.25, "off", 130], [.69999, "off", 130],
    [.7, "wild", 290], [.99999, "wild", 290],
  ] as const) it(`resolves roll ${roll} to ${accuracy} scatter`, () => {
    const requested = Object.freeze({ x: 550, y: 280 });
    const result = scatterAirstrike(requested, rolls(roll, .5, 0));
    expect(result.accuracy).toBe(accuracy);
    expect(result.point).toEqual({ x: 550 + offset, y: 280 });
    expect(result.requested).toEqual(requested);
    expect(result.requested).not.toBe(requested);
  });
  it("keeps extreme misses inside the battlefield, without rerolling toward the target", () => {
    const result = scatterAirstrike({ x: FIELD.width - 1, y: 1 }, rolls(.9, .999, .875));
    expect(result.accuracy).toBe("wild");
    expect(result.point).toEqual({ x: FIELD.width, y: 0 });
  });
  it("uses seeded game randomness and fixes the impact point once at call time", () => {
    const a = new Battle(84), b = new Battle(84);
    for (const battle of [a, b]) {
      battle.aiSides = [];
      battle.powers[0] = ["airstrike"];
      battle.command({ type: "super", side: 0, weapon: "airstrike", point: { x: 550, y: 280 } });
    }
    expect(a.strikes).toEqual(b.strikes);
    expect(a.rngState).toBe(b.rngState);
    const point = { ...a.strikes[0].point };
    a.tickSupers(.5);
    expect(a.strikes[0].point).toEqual(point);
    expect(a.strikes[0].remaining).toBe(TUNING.airstrikeWarning - .5);
  });
  for (const side of [0, 1] as const)
    it(`side ${side}'s wide miss spares the intended enemy and damages the warned area, including allies`, () => {
      const b = new Battle(42);
      b.aiSides = []; b.cover = []; b.water = [];
      b.random = rolls(.9, .5, .5); // 290 units west of the chosen target.
      b.soldiers.forEach(s => { s.life = "dead"; s.hold = true; s.cooldown = 999; });
      const ally = b.get(side === 0 ? 0 : 5)!, enemy = b.get(side === 0 ? 5 : 0)!;
      Object.assign(ally, { life: "alive", x: 260, y: 280 });
      Object.assign(enemy, { life: "alive", x: 550, y: 280 });
      b.powers[side] = ["airstrike"];
      expect(b.useSuper(side, "airstrike", enemy)).toBe(true);
      const strike = b.strikes[0];
      expect(strike.requested).toEqual({ x: 550, y: 280 });
      expect(strike.point.x).toBeCloseTo(260);
      expect(strike.accuracy).toBe("wild");
      b.tickSupers(TUNING.airstrikeWarning - .1);
      expect(ally.life).toBe("alive");
      expect(enemy.life).toBe("alive");
      b.tickSupers(.2);
      expect(ally.life).toBe("dead");
      expect(enemy.life).toBe("alive");
      expect(b.powers[side]).toEqual([]);
    });
  it("does not roll scatter or spend a reward for an invalid call", () => {
    const b = new Battle(42);
    b.powers[0] = ["airstrike"];
    const rng = b.rngState;
    expect(b.useSuper(0, "airstrike", { x: -1, y: 20 })).toBe(false);
    expect(b.rngState).toBe(rng);
    expect(b.powers[0]).toEqual(["airstrike"]);
    expect(b.strikes).toEqual([]);
  });
});
