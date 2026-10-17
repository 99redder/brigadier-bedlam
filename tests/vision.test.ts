import { describe, expect, it } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES, TUNING, type ClassId } from "../src/sim/data";
import { headingOf, inView, VIEW_ARC } from "../src/sim/vision";

function fixture(id: ClassId = "rifleman") {
  const b = new Battle(42);
  b.aiSides = []; b.cover = []; b.water = []; b.random = () => .5;
  b.soldiers.forEach(s => { s.life = "dead"; s.cooldown = 999; s.path = []; s.goal = null; });
  const a = b.get(0)!, t = b.get(5)!;
  Object.assign(a, { life: "alive", classId: id, x: 300, y: 250, facing: 1, cooldown: 0, hold: true });
  Object.assign(t, { life: "alive", x: 250, y: 250, hold: true });
  return { b, a, t };
}
function advance(b: Battle, seconds: number) { for (let i = 0; i < Math.ceil(seconds / TUNING.step); i++) b.step(); }

describe("directional field of fire", () => {
  it("includes the 120-degree boundary and handles vertical and wrapped headings", () => {
    const unit = { x: 0, y: 0, facing: 1, heading: 0 };
    expect(inView(unit, { x: 100 * Math.cos(VIEW_ARC / 2), y: 100 * Math.sin(VIEW_ARC / 2) })).toBe(true);
    expect(inView(unit, { x: 0, y: 100 })).toBe(false);
    expect(inView(unit, { x: -100, y: 0 })).toBe(false);
    unit.heading = -Math.PI / 2;
    expect(inView(unit, { x: 0, y: -100 })).toBe(true);
    expect(inView(unit, { x: 0, y: 100 })).toBe(false);
    unit.heading = Math.PI * 2;
    expect(inView(unit, { x: 100, y: 0 })).toBe(true);
  });
  for (const id of Object.keys(CLASSES) as ClassId[])
    for (const side of [0, 1] as const)
      it(`${id} on side ${side} cannot automatically shoot outside its arc`, () => {
        const { b, a, t } = fixture(id);
        a.side = side; t.side = side === 0 ? 1 : 0;
        b.step();
        expect(b.shots.filter(s => s.owner === a.id)).toHaveLength(0);
        expect(b.fireAt(a, t, t.id)).toBe(false);
        expect(a.cooldown).toBeLessThanOrEqual(0);
        t.x = 350;
        b.step();
        expect(b.shots.some(s => s.owner === a.id)).toBe(true);
      });
  it("Fire all cannot swivel toward a target behind the soldier", () => {
    const { b, a, t } = fixture();
    expect(b.fireAll()).toBe(0);
    expect(headingOf(a)).toBe(0);
    expect(b.fireDistant(a, { ...t, x: -400 })).toBe(false);
  });
  it("selects the nearest enemy inside the arc even when a closer enemy is behind", () => {
    const { b, a } = fixture();
    const visible = b.get(6)!;
    Object.assign(visible, { life: "alive", x: 900, y: 250, hold: true });
    b.step();
    const shot = b.shots.find(s => s.owner === a.id)!;
    expect(shot.target).toBe(visible.id);
    expect(shot.miss).toBe(true);
  });
  it("does not gradually swivel its arc by shooting targets at the edge", () => {
    const { b, a, t } = fixture();
    t.x = 350; t.y = 310;
    expect(b.fire(a, t)).toBe(true);
    expect(headingOf(a)).toBe(0);
    a.cooldown = 0;
    t.x = 310; t.y = 320;
    expect(b.fire(a, t)).toBe(false);
  });
  it("an explicit attack turns once, settles, then fires without tracking beyond the arc", () => {
    const { b, a, t } = fixture();
    b.command({ type: "attack", id: a.id, target: t.id });
    expect(headingOf(a)).toBeCloseTo(Math.PI);
    b.step();
    expect(b.shots).toHaveLength(0);
    advance(b, .75);
    expect(b.stats.shots).toBe(1);
    t.x = 350; a.cooldown = 0;
    b.step();
    expect(headingOf(a)).toBeCloseTo(Math.PI);
    expect(b.stats.shots).toBe(1);
  });
  it("manual flames may turn to a deliberate point outside the current arc", () => {
    const { b, a } = fixture("torch");
    b.command({ type: "select", id: a.id });
    expect(b.aimTorch(a, { x: 250, y: 250 })).toBe(true);
    expect(headingOf(a)).toBeCloseTo(Math.PI);
    expect(a.cooldown).toBe(CLASSES.torch.cooldown);
  });
  it("turns in cover without moving, cancelling cover, or shortening reload", () => {
    const { b, a } = fixture();
    b.command({ type: "cover", id: a.id, active: true });
    a.cooldown = 4;
    b.command({ type: "face", id: a.id, point: { x: 300, y: 100 } });
    expect(a.takingCover).toBe(true);
    expect(a.cooldown).toBe(4);
    expect(a.steadyTime).toBe(0);
    expect(a.path).toHaveLength(0);
    expect(headingOf(a)).toBeCloseTo(-Math.PI / 2);
  });
  it("retains queued deployment movement and faces the ordered direction on arrival", () => {
    const { b, a } = fixture();
    b.planningTicks = 30;
    b.command({ type: "move", id: a.id, point: { x: 320, y: 250 } });
    b.command({ type: "face", id: a.id, point: { x: 320, y: 100 } });
    expect(a.path.length).toBeGreaterThan(0);
    advance(b, .5);
    expect(a.x).toBe(300);
    advance(b, 2);
    expect(a.x).toBeCloseTo(320);
    expect(a.y).toBeCloseTo(250);
    expect(a.path).toHaveLength(0);
    expect(headingOf(a)).toBeCloseTo(-Math.PI / 2);
    b.command({ type: "move", id: a.id, point: { x: 340, y: 250 } });
    expect(a.watchAngle).toBeUndefined();
    advance(b, 1);
    expect(headingOf(a)).toBeCloseTo(0);
  });
  it("replays facing orders and movement deterministically", () => {
    const b = new Battle(81, 0, false, 1);
    b.aiSides = [];
    b.command({ type: "move", id: 0, point: { x: 140, y: 110 } });
    b.command({ type: "face", id: 0, point: { x: 140, y: 450 } });
    advance(b, 5);
    const replay = replayBattle(b.replay(), b.tick);
    expect(replay.soldiers).toEqual(b.soldiers);
    expect(replay.shots).toEqual(b.shots);
  });
});
