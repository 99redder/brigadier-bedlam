# v0.35 difficulty pass

Each new campaign fixes Easy, Medium, or Hard for all ten stages. Medium is the default. Original tours retain the previous curve and score rules. Player HP, reloads, and movement never change with mode.

| Enemy upgrade | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Focus wounded targets / concentrate fire | Stage 5 | Stage 3 | Stage 1 |
| Safer flank positions / defensive cover | Stage 9 | Stage 5 | Stage 3 |
| Evade visible bomber warnings / faster volleys / heavy squad | — | Stage 7 | Stage 5 |
| Demolish intervening cover with explosives | — | Stage 9 | Stage 7 |
| Support powers | Stage 6 | Stage 4 | Stage 3 |
| Medic calls | Stage 8 | Stage 6 | Stage 4 |
| Score multiplier | 1× | 1.5× | 2× |

Stats interpolate at every stage. Enemy final-stage HP multipliers are 1.15 / 1.55 / 1.9, reload multipliers .95 / .73 / .60 and movement .92 / 1.04 / 1.14. Opening stages use three weaker Riflemen/Lobbers; later stages grow to five. Advanced squads use two Bazookas, one Lobber, one Rifleman, and a Torch (replaced by another Rifleman in rain).

AI decisions occur on the existing think timer. They retain firing arcs, aiming delays, projectile scatter, cover collision, weather, drowning, reloads, and friendly-blast safety checks. Crouching applies the same doubled reload as player cover. Bomb evasion follows the already visible actual blast warning and can fail if escape takes too long. Demolition orders clear when their firing solution ceases to be safe. Swimmers leave the river before considering dry-only chest routes.

Score validation computes mode bonuses on the server, rejects unknown/mixed modes, and prevents an existing run changing its mode. No database migration is needed: mode is stored in each history result. The shared board displays the mode; older scores show Original. Saved tours and exported replays carry mode, including the original absence of a mode.

## Repeatable diagnostic

Bundle and run the simulation script with the project's installed esbuild:

```sh
node --input-type=module -e "import {build} from 'esbuild';await build({entryPoints:['scripts/difficulty-diagnostic.ts'],bundle:true,platform:'node',outfile:'/tmp/bedlam-difficulty-diagnostic.cjs'});"
node /tmp/bedlam-difficulty-diagnostic.cjs
```

Optional arguments narrow the run, e.g. `medium 10`. It uses four fixed seeds (101–104), four maps (0, 2, 4, 8), a Mixed Bag squad and basic AI controlling the player side. Each battle is capped at 180 combat seconds. Unfinished runs print their state to stderr.

| Mode | Enemy wins, stage 1 | Stage 5 | Stage 10 |
| --- | --- | --- | --- |
| Easy | 0/4 | 1/4 | 1/4 |
| Medium | 1/4 | 1/4 | 4/4 |
| Hard | 0/4 | 4/4 | 4/4 |

All 36 runs finished within the cap. This small deterministic bot sample verifies a material late-stage increase; it does not establish human win rates or guarantee monotonic outcomes for individual seeds. Human playtesting should continue to tune the curve.

Validation: 333 automated tests, TypeScript/Vite build, Worker type check, browser selection/resume/next-stage/result checks, and local Worker API checks (mode labels, multipliers, invalid modes and mode changes). No diagnostic scores were sent to production.
