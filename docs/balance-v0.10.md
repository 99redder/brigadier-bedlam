# v0.10 balance and AI check

This pass adds configurable Fire all controls and addresses ranged AI safety and water positioning. It keeps normal player movement under manual control.

## Changes

- Fire all defaults to G, or H in the left-handed preset. It supports alternate mouse/key bindings, conflict swaps, saved settings, and use while the selected soldier is brawling. Old saved controls are upgraded without discarding existing custom bindings; an unused key is selected when the preferred key is occupied. WASD remains unbound by default.
- Torch damage increases from 3.8 to 5.4 per flame pulse. Lobber grenade damage increases from 18 to 22. Ranges, drowning risks, scenery durability, and the guaranteed dynamite lethal core are unchanged.
- Autonomous explosive shooters check the actual impact surface and blast occlusion before firing near allies. They can reposition or choose a safer target. Explicit player firing orders remain available.
- AI chooses dry destinations and completes a surviving crossing rather than stopping in the river to fight. Ally separation respects safe bridge routes.

## Matched diagnostic

The old test manually called AI for the player side, which then also ran player pursuit logic. It also gave the sides different bridge, accuracy, and medic policies. The new diagnostic selects AI control for both sides and runs the same scheduling and policies through the normal simulation. Normal games still automate only the opponent. This mode is preserved in diagnostic replays.

Four seeds (42, 81, 234, 831) and all nine preset pairings produce 36 games for each comparison. The baseline was collected with the corrected harness before the weapon and tactical adjustments.

| Measure | Baseline | Revised |
| --- | ---: | ---: |
| Games completed | 36 / 36 | 36 / 36 |
| Average simulation seconds | 50.3 | 41.3 |
| Duration range | 18–92 | 23–65 |
| Total drownings | 29 | 29 |

Raw rows and class counters are in `balance-v0.10.json`. These are automated games on one map, not measurements of human difficulty or proof of equal class strength. Raw class damage includes friendly damage and changes with match duration. Further human feedback is still needed, especially for the short-range classes.

Run the extended diagnostic with:

```sh
BEDLAM_AUDIT_FILE=/tmp/bedlam-audit.json npx vitest run tests/tuning.test.ts
```

Without that environment variable, the regular test suite runs its smaller 12-game deadlock check.

## Browser verification

- Rebound Fire all from G to B, saved, reloaded, and pressed B. The HUD displayed B and the simulation recorded a Fire all order.
- Pressed the rebound key while a selected soldier was brawling; the squad order remained available.
- A controlled AI Sapper withheld fire with a nearby ally and fired after the ally moved outside the blast zone.
- A seeded Long Distance battle reached the defeat screen after 49 seconds, with actual selection and movement orders; simulation waits were accelerated. Enemy medic calls were exhausted. This is a loss check, not a claim of a balanced human win rate.
- Test fixtures and temporary binding changes were removed. Original browser settings were restored.
