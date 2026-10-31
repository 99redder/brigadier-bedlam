import { describe, it, expect } from "vitest";
import { Battle, type Side } from "../src/sim/battle";
import { publicState, validCommand, fromView } from "../src/net/protocol";
import { trafficMove } from "../src/sim/traffic";
const battle = () =>
  new Battle(42, 0, false, 10, { mapId: 0, level: 10, mode: "hard" }, true);
describe("human versus human rules", () => {
  it("starts five matching soldiers per side without AI, luck, elites or campaign stat boosts", () => {
    const b = battle();
    expect(b.aiSides).toEqual([]);
    expect(b.challenge).toBeNull();
    expect(b.enemyMapPlan).toBeNull();
    for (let i = 0; i < 5; i++) {
      const a = b.get(i)!,
        z = b.get(i + 5)!;
      expect(a.classId).toBe(z.classId);
      expect(a.hp).toBe(z.hp);
      expect(b.maxHp(a)).toBe(b.maxHp(z));
      expect(b.landSpeed(a)).toBe(b.landSpeed(z));
      expect(z.human).toBe(true);
      expect(z.elite).toBeUndefined();
    }
    expect(b.fortune(0)).toBe(0);
    expect(b.fortune(1)).toBe(0);
  });
  it("keeps both commanders' selections and blocking independent", () => {
    const b = battle();
    b.get(0)!.blocking = true;
    b.get(5)!.blocking = true;
    b.command({ type: "select", id: 6 }, false, 1);
    expect(b.selected).toBeNull();
    expect(b.selectedBySide).toEqual([null, 6]);
    expect(b.get(0)!.blocking).toBe(true);
    expect(b.get(5)!.blocking).toBe(false);
    b.command({ type: "select", id: 1 }, false, 0);
    expect(b.selectedBySide).toEqual([1, 6]);
  });
  it("recognizes either player's selected Torch for manual control", () => {
    const b = battle(),
      a = b.soldiers.find((s) => s.side === 0 && s.classId === "torch")!,
      z = b.soldiers.find((s) => s.side === 1 && s.classId === "torch")!;
    b.command({ type: "select", id: a.id }, false, 0);
    b.command({ type: "select", id: z.id }, false, 1);
    expect(b.isManualTorch(a)).toBe(true);
    expect(b.isManualTorch(z)).toBe(true);
  });
  it("applies fire-all only to the commanding side", () => {
    const b = battle();
    b.planningTicks = 0;
    const fired: number[] = [];
    b.fireDistant = (s) => {
      fired.push(s.side);
      return true;
    };
    b.command({ type: "fire-all" }, false, 1);
    expect(fired.length).toBeGreaterThan(0);
    expect(new Set(fired)).toEqual(new Set([1]));
  });
  it("uses the same difficult friendly traffic rules on either team", () => {
    const b = battle();
    b.cover = [];
    const results = ([0, 1] as Side[]).map((side) => {
      const a = b.get(side * 5)!,
        z = b.get(side * 5 + 1)!;
      Object.assign(a, { x: 100, y: 200 });
      Object.assign(z, { x: 140, y: 200 });
      return trafficMove(a, { x: 101, y: 200 }, [a, z], []);
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[0].crowded).toBe(true);
    expect(results[0].point.x).toBeCloseTo(100.4);
  });
  it("survives a persisted checkpoint without changing the subsequent simulation", () => {
    const b = battle();
    for (let i = 0; i < 320; i++) b.step();
    const copy = Object.assign(battle(), JSON.parse(JSON.stringify(b)));
    for (let i = 0; i < 180; i++) {
      b.step();
      copy.step();
    }
    expect(JSON.stringify(copy)).toBe(JSON.stringify(b));
  });
});
describe("multiplayer command boundary", () => {
  it.each([0, 1] as Side[])(
    "restricts player %s to their own squad and map bounds",
    (side) => {
      const b = battle(),
        id = side * 5,
        other = (side ^ 1) * 5;
      expect(
        validCommand({ type: "move", id, point: { x: 200, y: 200 } }, b, side),
      ).toBe(true);
      expect(
        validCommand(
          { type: "move", id: other, point: { x: 200, y: 200 } },
          b,
          side,
        ),
      ).toBe(false);
      expect(
        validCommand(
          { type: "move", id, point: { x: Infinity, y: 200 } },
          b,
          side,
        ),
      ).toBe(false);
      expect(
        validCommand({ type: "move", id, point: { x: -1, y: 200 } }, b, side),
      ).toBe(false);
      expect(
        validCommand({ type: "move", id, point: { x: 200, y: 561 } }, b, side),
      ).toBe(false);
      expect(validCommand({ type: "damage", id, amount: 9999 }, b, side)).toBe(
        false,
      );
      expect(
        validCommand(
          {
            type: "super",
            side: side ^ 1,
            weapon: "sniper",
            point: { x: 200, y: 200 },
          },
          b,
          side,
        ),
      ).toBe(false);
      expect(validCommand({ type: "attack", id, target: other }, b, side)).toBe(
        true,
      );
      expect(validCommand({ type: "attack", id, target: id }, b, side)).toBe(
        false,
      );
    },
  );
  it.each([
    null,
    [],
    "move",
    {},
    { type: "cover", id: 0, active: "yes" },
    { type: "block", id: 0, held: 1 },
  ])("rejects malformed commands %j", (input) =>
    expect(validCommand(input, battle(), 0)).toBe(false),
  );
  it("maps the second player's local unit ids to authoritative ids without changing world coordinates", () => {
    expect(fromView({ type: "attack", id: 0, target: 7 }, 1)).toEqual({
      type: "attack",
      id: 5,
      target: 2,
    });
    expect(
      fromView(
        { type: "super", side: 0, weapon: "mortar", point: { x: 100, y: 150 } },
        1,
      ),
    ).toEqual({
      type: "super",
      side: 1,
      weapon: "mortar",
      point: { x: 100, y: 150 },
    });
  });
});
describe("public match snapshots", () => {
  it("shows either player as the local green squad while keeping their starting location", () => {
    const b = battle();
    b.powers = [["sniper"], ["mortar"]];
    b.calls = [2, 1];
    b.winner = 1;
    const state = publicState(b, 1);
    expect(state.soldiers.find((s) => s.id === 0)?.x).toBe(b.get(5)!.x);
    expect(state.soldiers.find((s) => s.id === 0)?.side).toBe(0);
    expect(state.powers[0]).toEqual(["mortar"]);
    expect(state.calls).toEqual([1, 2]);
    expect(state.winner).toBe(0);
  });
  it("does not expose private randomness, checkpoints, enemy orders or incidental effect fields", () => {
    const b = battle();
    b.get(5)!.goal = { x: 200, y: 200 };
    b.get(5)!.path = [{ x: 200, y: 200 }];
    b.get(5)!.watchAngle = 0.4;
    b.effects.push({ ...b.get(5)!, kind: "hit", size: 5, time: 1 });
    const state = publicState(b, 0);
    expect(state).not.toHaveProperty("rngState");
    expect(state).not.toHaveProperty("commands");
    expect(state.soldiers[5].goal).toBeNull();
    expect(state.soldiers[5].path).toEqual([]);
    expect(state.soldiers[5]).not.toHaveProperty("watchAngle");
    expect(state.effects[0]).not.toHaveProperty("goal");
    expect(b.get(5)!.goal).toEqual({ x: 200, y: 200 });
  });
  it("conceals future mortar landing points until shells launch", () => {
    const b = battle();
    b.planningTicks = 0;
    b.powers[0] = ["mortar"];
    b.useSuper(0, "mortar", { x: 700, y: 300 });
    const original = b.mortars[0].shells.map((s) => ({ ...s.point }));
    const state = publicState(b, 1);
    expect(state.mortars[0].side).toBe(1);
    for (const shell of state.mortars[0].shells)
      expect(shell.point).toEqual(state.mortars[0].center);
    expect(b.mortars[0].shells.map((s) => s.point)).toEqual(original);
  });
});
