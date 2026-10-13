import { it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { CLASSES, SQUADS } from "../src/sim/data";
import { Battle } from "../src/sim/battle";
it("AI tournament finishes without deadlock", () => {
  const rows = [];
  const classes = Object.fromEntries(
    Object.keys(CLASSES).map((id) => [
      id,
      { shots: 0, damage: 0, drownings: 0, deployments: 0 },
    ]),
  );
  for (const seed of [42, 81, 234, 831])
    for (const squad of [0, 1, 2])
      for (const opposition of process.env.BEDLAM_AUDIT_FILE
        ? [0, 1, 2]
        : [null]) {
        const b = new Battle(seed, squad);
        b.aiSides = [0, 1];
        if (opposition !== null)
          for (const s of b.soldiers.filter((s) => s.side === 1)) {
            s.classId = SQUADS[opposition].classes[s.slot];
            s.hp = CLASSES[s.classId].hp;
          }
        for (const s of b.soldiers) classes[s.classId].deployments++;
        const fire = b.fire.bind(b),
          damage = b.damage.bind(b);
        b.fire = (s, t) => {
          const success = fire(s, t);
          if (success) classes[s.classId].shots++;
          return success;
        };
        b.damage = (target, amount, id = null, lethal = false) => {
          const before = target.hp;
          damage(target, amount, id, lethal);
          if (id) classes[id].damage += Math.max(0, before - target.hp);
        };
        for (let tick = 0; tick < 30 * 360 && b.winner === null; tick++) {
          b.step();
        }
        for (const s of b.soldiers)
          if (s.death === "drowned") classes[s.classId].drownings++;
        rows.push({
          seed,
          squad,
          opposition,
          seconds: Math.round(b.time),
          winner: b.winner,
          brawls: b.stats.brawls,
          revives: b.stats.revives,
          drownings: b.stats.drownings,
          coverDestroyed: b.rubble.length,
        });
        if (b.winner === null)
          console.log(
            "STUCK",
            seed,
            squad,
            b.soldiers
              .filter((s) => s.life === "alive")
              .map((s) => ({
                id: s.id,
                x: s.x,
                y: s.y,
                hp: s.hp,
                goal: s.goal,
                path: s.path.length,
                target: s.target,
              })),
          );
      }
  console.table(rows);
  if (process.env.BEDLAM_AUDIT_FILE)
    writeFileSync(
      process.env.BEDLAM_AUDIT_FILE,
      JSON.stringify({ rows, classes }, null, 2),
    );
  expect(rows.every((r) => r.winner !== null)).toBe(true);
}, 60000);
