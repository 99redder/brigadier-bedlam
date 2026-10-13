import { it, expect } from "vitest";
import { Battle } from "../src/sim/battle";
it("AI tournament finishes without deadlock", () => {
  const rows = [];
  for (const seed of [42, 81, 234, 831])
    for (const squad of [0, 1, 2]) {
      const b = new Battle(seed, squad);
      for (let tick = 0; tick < 30 * 360 && b.winner === null; tick++) {
        if (tick % 20 === 0)
          for (const s of b.soldiers.filter(
            (s) => s.side === 0 && s.life === "alive" && s.brawl === null,
          ))
            b.ai(s);
        if (tick % 150 === 0) {
          const down = b.soldiers.find(
            (s) => s.side === 0 && s.life === "down",
          );
          if (down) b.callMedic(down.id, 0);
        }
        b.step();
      }
      rows.push({
        seed,
        squad,
        seconds: Math.round(b.time),
        winner: b.winner,
        brawls: b.stats.brawls,
        revives: b.stats.revives,
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
  expect(rows.every((r) => r.winner !== null)).toBe(true);
}, 60000);
