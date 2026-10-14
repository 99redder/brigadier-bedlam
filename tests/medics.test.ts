import { describe, expect, it } from "vitest";
import { Battle } from "../src/sim/battle";
import { CLASSES, TUNING, type ClassId } from "../src/sim/data";

function rescue(side: 0 | 1 = 0) {
  const b = new Battle(42);
  b.aiSides = [];
  b.cover = [];
  b.water = [];
  b.random = () => 0.5;
  for (const s of b.soldiers) {
    s.x = 950;
    s.y = 500;
    s.cooldown = 1e6;
    s.hold = true;
  }
  const patient = b.soldiers[side * 5];
  patient.x = 100;
  patient.y = 200;
  patient.life = "down";
  patient.hp = 0;
  const shooter = b.soldiers[(1 - side) * 5];
  shooter.x = 300;
  shooter.y = 200;
  shooter.classId = "rifleman";
  shooter.cooldown = 0;
  expect(b.callMedic(patient.id, side)).toBe(true);
  const medic = b.medics[0];
  medic.x = 200;
  medic.y = 200;
  return { b, patient, shooter, medic };
}
function hit(classId: ClassId, friendly = false) {
  const fixture = rescue();
  const { b, shooter, medic } = fixture;
  shooter.classId = classId;
  if (classId === "sapper") shooter.x = 270;
  if (friendly) shooter.side = medic.side;
  b.fireAt(shooter, medic, medic.id);
  b.resolveShot(b.shots.at(-1)!);
  return fixture;
}

describe("vulnerable medics", () => {
  it("spends only two calls per team, independently", () => {
    const b = new Battle(1);
    for (const side of [0, 1] as const) {
      const patients = b.soldiers.filter((s) => s.side === side).slice(0, 3);
      for (const p of patients) p.life = "down";
      expect(patients.map((p) => b.callMedic(p.id, side))).toEqual([
        true,
        true,
        false,
      ]);
      expect(b.calls[side]).toBe(0);
    }
    expect(new Set(b.medics.map((m) => m.id)).size).toBe(4);
  });
  it("can be deliberately targeted and killed by rifle fire, cancelling the rescue", () => {
    const { b, shooter, medic, patient } = rescue();
    medic.hp = CLASSES.rifleman.damage;
    b.command({ type: "attack", id: shooter.id, target: medic.id });
    expect(shooter.target).toBe(medic.id);
    expect(b.fire(shooter, medic)).toBe(true);
    b.resolveShot(b.shots[0]);
    expect(medic.life).toBe("dead");
    expect(medic.death).toBe("skeleton");
    const position = { x: medic.x, y: medic.y };
    for (let i = 0; i < 150; i++) b.step();
    expect({ x: medic.x, y: medic.y }).toEqual(position);
    expect(patient.life).toBe("down");
    expect(b.stats.revives).toBe(0);
    expect(b.calls[0]).toBe(1);
    expect(b.callMedic(patient.id, 0)).toBe(true);
    expect(b.calls[0]).toBe(0);
    expect(b.medics[1].id).not.toBe(medic.id);
    expect(b.canShoot(shooter, medic)).toBe(false);
  });
  it("automatically shoots an exposed enemy medic and includes medics in Fire all", () => {
    const { b, shooter, medic } = rescue(1);
    expect(b.chooseTarget(shooter)).toBe(medic);
    expect(b.fireAll()).toBe(1);
    expect(b.shots[0].target).toBe(medic.id);
    shooter.cooldown = 0;
    b.shots = [];
    b.step();
    expect(b.shots[0].target).toBe(medic.id);
  });
  for (const weapon of ["bazooka", "lobber", "torch", "sapper"] as ClassId[])
    it(`takes ${weapon} damage`, () => {
      const { medic } = hit(weapon);
      expect(medic.hp).toBeLessThan(TUNING.medicHealth);
      if (weapon === "sapper") expect(medic.life).toBe("dead");
    });
  it("explosions can kill friendly medics too", () => {
    expect(hit("sapper", true).medic.life).toBe("dead");
  });
  it("cover shields a medic, including from the blast that demolishes it", () => {
    const { b, shooter, medic } = rescue();
    b.cover = [{ x: 240, y: 160, w: 20, h: 80, hp: 100 }];
    shooter.classId = "sapper";
    b.fireAt(shooter, medic, medic.id);
    b.resolveShot(b.shots[0]);
    expect(b.cover).toHaveLength(0);
    expect(medic.hp).toBe(TUNING.medicHealth);
    shooter.classId = "rifleman";
    shooter.cooldown = 0;
    b.cover = [{ x: 240, y: 160, w: 20, h: 80, hp: 100 }];
    expect(b.canShoot(shooter, medic)).toBe(false);
  });
  it("does not finish a revive if killed during treatment", () => {
    const { b, medic, patient } = rescue();
    medic.x = patient.x;
    medic.path = [];
    medic.timer = 0.79;
    b.damage(medic, 999);
    b.step();
    expect(patient.life).toBe("down");
    expect(b.stats.revives).toBe(0);
  });
  it("can die on the way out without undoing the completed revival", () => {
    const { b, medic, patient } = rescue();
    medic.x = patient.x;
    medic.path = [];
    medic.timer = 0.79;
    b.step();
    expect(patient.life).toBe("alive");
    expect(medic.phase).toBe("out");
    b.damage(medic, 999, "torch");
    b.step();
    expect(medic.death).toBe("ash");
    expect(patient.life).toBe("alive");
    expect(b.stats.revives).toBe(1);
  });
  it("keeps training protected and does not count medics towards squad survival", () => {
    const training = new Battle(42, 0, true);
    training.soldiers[0].life = "down";
    training.callMedic(0, 0);
    training.damage(training.medics[0], 999, "sapper", true);
    expect(training.medics[0].life).toBe("alive");
    const { b } = rescue();
    for (const s of b.soldiers.filter((s) => s.side === 0)) s.life = "down";
    b.step();
    expect(b.winner).toBe(1);
  });
});
