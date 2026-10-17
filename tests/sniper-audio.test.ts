import { describe, expect, it } from "vitest";
import { Battle } from "../src/sim/battle";

function fixture() {
  const b = new Battle(42);
  b.aiSides = [];
  b.cover = [];
  b.water = [];
  for (const s of b.soldiers) {
    s.cooldown = 999;
    s.autoFireWait = 999;
    s.hold = true;
  }
  return b;
}
const sniperEvents = (b: Battle) => b.combatEvents.filter(e => e.classId === "sniper");

describe("sniper firing announcements", () => {
  for (const side of [0, 1] as const)
    it(`announces a successful shot exactly once for side ${side}`, () => {
      const b = fixture(), target = b.get(side === 0 ? 5 : 0)!;
      b.powers[side] = ["sniper"];
      expect(b.useSuper(side, "sniper", target)).toBe(true);
      expect(target.life).toBe("dead");
      expect(b.combatEvents).toEqual([{ id: 0, classId: "sniper", kind: "fire" }]);
      expect(b.useSuper(side, "sniper", target)).toBe(false);
      for (let i = 0; i < 60; i++) b.step();
      expect(sniperEvents(b)).toHaveLength(1);
    });

  it("announces a computer-fired reward through the actual AI path", () => {
    const b = fixture();
    b.aiSides = [1];
    b.powers[1] = ["sniper"];
    b.combatTicks = 29;
    b.step();
    expect(b.powers[1]).toEqual([]);
    expect(sniperEvents(b)).toEqual([{ id: 0, classId: "sniper", kind: "fire" }]);
  });

  it("keeps pickup, empty clicks, friendly clicks, planning and spent shots silent", () => {
    const b = fixture();
    b.powers[0] = ["sniper"];
    expect(b.combatEvents).toEqual([]);
    expect(b.useSuper(0, "sniper", { x: 550, y: 280 })).toBe(false);
    expect(b.useSuper(0, "sniper", b.get(0)!)).toBe(false);
    b.planningTicks = 30;
    expect(b.useSuper(0, "sniper", b.get(5)!)).toBe(false);
    expect(b.combatEvents).toEqual([]);
    expect(b.powers[0]).toEqual(["sniper"]);
  });

  it("preserves two simultaneous opposing shots as separate audio events", () => {
    const b = fixture();
    b.powers = [["sniper"], ["sniper"]];
    b.useSuper(0, "sniper", b.get(5)!);
    b.useSuper(1, "sniper", b.get(0)!);
    expect(sniperEvents(b).map(e => e.id)).toEqual([0, 1]);
  });
});
