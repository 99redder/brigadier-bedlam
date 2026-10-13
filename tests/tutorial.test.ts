import { describe, it, expect } from "vitest";
import { Tutorial } from "../src/sim/tutorial";
import { Battle, replayBattle } from "../src/sim/battle";
import { TUNING } from "../src/sim/data";
function run(t: Tutorial, predicate: () => boolean, max = 1200) {
  for (let i = 0; i < max && !predicate(); i++) {
    t.battle.step();
    t.update();
  }
  expect(predicate()).toBe(true);
}
describe("interactive boot camp", () => {
  it("has no enemy soldiers and keeps running without a victory result", () => {
    const t = new Tutorial();
    expect(t.battle.soldiers).toHaveLength(5);
    expect(t.battle.soldiers.every((s) => s.side === 0)).toBe(true);
    for (let i = 0; i < 900; i++) t.battle.step();
    expect(t.battle.winner).toBeNull();
    expect(t.id).toBe("welcome");
  });
  it("does not advance movement on a click alone or accept the wrong demolition class", () => {
    const t = new Tutorial();
    t.advance();
    const b = t.battle;
    b.command({ type: "select", id: 0 });
    t.update();
    b.command({ type: "move", id: 0, point: { x: 180, y: 235 } });
    t.update();
    expect(t.id).toBe("move");
    run(t, () => t.id === "hold");
    b.command({ type: "hold", id: 0 });
    t.update();
    b.command({ type: "select", id: 1 });
    t.update();
    expect(t.id).toBe("bullets");
    expect(
      t.accepts({ type: "demolish", id: 1, point: { x: 295, y: 270 } }),
    ).toBe(false);
    expect(
      t.accepts({ type: "demolish", id: 0, point: { x: 295, y: 270 } }),
    ).toBe(true);
  });
  it("requires a full interactive sequence before graduation", () => {
    const t = new Tutorial(),
      b = t.battle;
    t.advance();
    b.command({ type: "select", id: 0 });
    t.update();
    b.command({ type: "move", id: 0, point: { x: 180, y: 235 } });
    run(t, () => t.id === "hold");
    b.command({ type: "hold", id: 0 });
    t.update();
    b.command({ type: "select", id: 1 });
    t.update();
    b.command({ type: "select", id: 0 });
    b.command({ type: "demolish", id: 0, point: { x: 295, y: 270 } });
    run(t, () => t.id === "rockets");
    expect(t.rock.hp).toBe(100);
    b.command({ type: "select", id: 1 });
    b.command({ type: "demolish", id: 1, point: { x: 295, y: 270 } });
    run(t, () => t.id === "dynamite");
    b.command({ type: "select", id: 4 });
    b.command({ type: "demolish", id: 4, point: { x: 400, y: 410 } });
    run(t, () => t.id === "bridge");
    b.command({ type: "select", id: 0 });
    b.command({ type: "bridge", id: 0, point: { x: 550, y: 68 } });
    run(t, () => t.id === "water");
    expect(b.get(0)!.x).toBeGreaterThan(595);
    b.random = () => 0;
    b.command({ type: "move", id: 0, point: { x: 450, y: 180 } });
    run(t, () => t.id === "medic");
    expect(b.get(0)!.life).toBe("alive");
    expect(b.get(0)!.drowningTime).toBe(0);
    expect(b.get(2)!.life).toBe("down");
    b.command({ type: "medic", target: 2, side: 0 });
    run(t, () => t.id === "spar");
    expect(b.calls[0]).toBe(2);
    b.command({ type: "punch", id: 0 });
    for (let i = 0; i < 30; i++) b.step();
    b.command({ type: "kick", id: 0 });
    b.command({ type: "block", id: 0, held: true });
    run(t, () => t.id === "pause");
    expect(b.get(3)!.hp).toBe(260);
    t.ui("pause");
    t.update();
    expect(t.id).toBe("pause");
    t.ui("resume");
    t.update();
    expect(t.id).toBe("settings");
    t.ui("settings-open");
    t.update();
    expect(t.complete).toBe(false);
    t.ui("settings-close");
    t.update();
    expect(t.complete).toBe(true);
    expect(b.winner).toBeNull();
    expect(b.soldiers.every((s) => s.life === "alive")).toBe(true);
  });
  it("restores practice targets that were demolished before their lesson", () => {
    const t = new Tutorial(),
      b = t.battle;
    b.cover = b.cover.filter((r) => r !== t.rock);
    t.rock.hp = 0;
    b.rubble.push({ ...t.rock });
    const phase = () => t.id;
    while (phase() !== "bullets") t.advance();
    expect(b.cover.includes(t.rock)).toBe(true);
    expect(t.rock.hp).toBe(100);
    expect(b.rubble.some((r) => r.x === t.rock.x)).toBe(false);
    b.get(0)!.x = 700;
    while (phase() !== "bridge") t.advance();
    expect(b.get(0)!.x).toBeLessThan(505);
  });
  it("training protection does not disable normal battle damage or drowning", () => {
    const t = new Tutorial();
    t.battle.damage(t.battle.get(0)!, 9999, "sapper", true);
    expect(t.battle.get(0)!.life).toBe("alive");
    const b = new Battle(717);
    b.damage(b.get(0)!, 9999, "sapper", true);
    expect(b.get(0)!.life).toBe("dead");
    const a = b.get(1)!;
    a.x = 550;
    a.y = 280;
    b.random = () => 0;
    b.updateWater(a);
    expect(a.drowningTime).toBe(TUNING.drowningDuration);
  });
  it("training replays preserve enemy-free mode", () => {
    const t = new Tutorial();
    t.battle.command({ type: "move", id: 0, point: { x: 180, y: 235 } });
    for (let i = 0; i < 90; i++) t.battle.step();
    const replay = replayBattle(t.battle.replay(), t.battle.tick);
    expect(replay.training).toBe(true);
    expect(replay.soldiers).toEqual(t.battle.soldiers);
    expect(replay.winner).toBeNull();
  });
});
