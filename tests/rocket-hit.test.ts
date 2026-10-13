import { describe, it, expect } from "vitest";
import { Battle, type Shot } from "../src/sim/battle";

function fixture(training = false) {
  const b = new Battle(42, 0, training);
  b.cover = [];
  b.water = [];
  b.random = () => 0.99;
  for (const s of b.soldiers) {
    s.x = 900;
    s.y = 500;
  }
  const shooter = b.get(1)!,
    target = b.get(training ? 0 : 5)!;
  Object.assign(shooter, { x: 100, y: 200, classId: "bazooka", cooldown: 0 });
  Object.assign(target, { x: 250, y: 200, hp: 500 });
  const shot: Shot = {
    id: 0,
    owner: shooter.id,
    target: target.id,
    classId: "bazooka",
    from: { x: 100, y: 200 },
    to: { x: 250, y: 200 },
    time: 0.35,
    duration: 0.35,
  };
  return { b, shooter, target, shot };
}
describe("rocket hit confirmation", () => {
  it("emits a unique hit cue only when the rocket damages a unit", () => {
    const { b, target, shot } = fixture();
    b.resolveShot(shot);
    expect(target.hp).toBeLessThan(500);
    expect(b.combatEvents).toMatchObject([{ classId: "bazooka", kind: "hit" }]);
  });
  it("emits one cue for a blast that hits multiple units", () => {
    const { b, target, shot } = fixture();
    Object.assign(b.get(6)!, { x: target.x + 5, y: target.y });
    b.resolveShot(shot);
    expect(b.combatEvents.filter((e) => e.kind === "hit")).toHaveLength(1);
  });
  it("does not confirm a rocket stopped by cover", () => {
    const { b, target, shot } = fixture();
    b.cover = [{ x: 200, y: 170, w: 20, h: 60, hp: 100 }];
    b.resolveShot(shot);
    expect(target.hp).toBe(500);
    expect(b.combatEvents).toMatchObject([
      { classId: "bazooka", kind: "impact" },
    ]);
  });
  it("does not confirm an empty explosion after the target moves away", () => {
    const { b, target, shot } = fixture();
    target.y += 80;
    b.resolveShot(shot);
    expect(target.hp).toBe(500);
    expect(b.combatEvents.at(-1)!.kind).toBe("impact");
  });
  it("does not confirm guaranteed out-of-range misses", () => {
    const { b, target, shot } = fixture();
    shot.miss = true;
    b.resolveShot(shot);
    expect(target.hp).toBe(500);
    expect(b.combatEvents).toMatchObject([
      { classId: "bazooka", kind: "impact" },
    ]);
  });
  it("does not confirm protected training targets or already downed units", () => {
    const { b, shot } = fixture(true);
    b.resolveShot(shot);
    expect(b.combatEvents.at(-1)!.kind).toBe("impact");
    const normal = fixture();
    normal.target.life = "down";
    normal.b.resolveShot(normal.shot);
    expect(normal.b.combatEvents.at(-1)!.kind).toBe("impact");
  });
  it("also confirms rocket damage to a deployed medic", () => {
    const { b, shot } = fixture();
    Object.assign(b.get(6)!, { life: "down", hp: 0 });
    b.callMedic(6, 1);
    Object.assign(b.medics[0], { x: shot.to.x, y: shot.to.y });
    b.get(5)!.y = 500;
    b.resolveShot(shot);
    expect(b.medics[0].hp).toBeLessThan(60);
    expect(b.combatEvents.at(-1)!.kind).toBe("hit");
  });
});
