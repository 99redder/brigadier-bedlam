# v0.16 deployment and combat pass

Normal matches start with a ten-second deployment phase. Orders are recorded on the simulation timeline, but movement, AI, weapons, medics, drowning, and combat time stay frozen. Players can select, revise moves, queue bridge crossings, or cancel a move with Hold. At GO, combat time begins at zero and queued movement executes. Pause/Controls freeze the countdown too. Training skips deployment.

The browser enables deployment via the fourth `Battle` constructor parameter. Diagnostics can omit it to measure combat alone. Replays record the duration alongside timestamped opening orders.

## Combat tuning

| Class | Old speed → new | Old cooldown → new | New effect |
| --- | --- | --- | --- |
| Rifleman | 72 → 47 | 0.48 → 1.2 seconds | 30 damage |
| Bazooka | 62 → 40 | 3.4 → 6 seconds | Guaranteed lethal damage within its 28-unit blast |
| Lobber | 67 → 44 | 3.1 → 5 seconds | 130 damage; two hits kill all full-health classes |
| Torch | 75 → 49 | 0.3 → 2 seconds | 12 contact damage, then 35 damage/second for eight seconds |
| Sapper | 80 → 52 | 4.5 → 7.5 seconds | Guaranteed lethal damage within its 60-unit blast |

Medics move at 104 rather than 160. Explosive friendly fire and cover shielding remain active. Terrain durability is unchanged: rockets deal 40, dynamite 100, grenades 20, bullets/flames zero.

Burns persist after a victim leaves range or moves behind cover. Repeated hits refresh duration without stacking the damage rate. Entering river water extinguishes the burn. Burns affect medics, kill as ash, and clear on death/revival. Training remains protected. No random instant-kill chance is needed for rockets, dynamite, or flames.

## Validation

- 123 simulation/input/tutorial tests pass, including deployment freeze/release, revised orders, replay determinism, one-hit explosives, two-hit grenades, delayed burns, extinguishing, cover shielding, and burning medics.
- The matched 36-game AI diagnostic completed every match. Combat averaged 21 seconds, with a range of 16–33 seconds; the normal match's ten-second deployment is additional.
- Raw diagnostic results: [balance-v0.16.json](balance-v0.16.json).
- Browser checks verified an opening move stays frozen with zero shots before GO, then starts moving; pausing preserves the exact countdown tick; all five queued routes remain visible; Fire all and medics unlock at GO; burning has visible flames and an ON FIRE label; boot camp has no visible enemy sprites.
- TypeScript and the production build pass.

Run the full diagnostic with:

```sh
BEDLAM_AUDIT_FILE=/tmp/bedlam-audit.json npx vitest run tests/tuning.test.ts
```
