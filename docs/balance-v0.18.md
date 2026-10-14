# v0.18 weapon tradeoffs and manual rockets

Selected player Bazookas require deliberate shots. Clicking an enemy or scenery snapshots its location; T fires at the cursor. Manual shots have zero scatter, a 0.55-second flight, a 24-unit lethal blast, and a four-second reload. Firing stops movement. Only one selected unit gets this precision. Deselected player rockets scatter ±14 degrees and ±6% distance; enemy rockets have 1.7 times that error. Cover, range, friendly fire, brawls and reloads still apply. Fire all skips the selected manual launcher.

Armor is represented by class health: Bazooka 330, Rifleman 230, Torch 220, Lobber 180, Sapper 130. Grenades deal 115, killing most classes in two hits but a Bazooka in three. Rifle fire deals 18 every 0.65 seconds, with slight spread and jams. Sappers have accurate lethal dynamite but only 80 reach, 34 blast radius and six-second reload. Burning remains a continuing hazard; heavy rocket armor can survive one isolated burn.

## Verification

135 tests cover manual precision versus automatic scatter, extra enemy scatter, no automatic selected fire, reload restrictions, bracing, fixed-point misses, deployment gating, replay determinism, saved controls, armor, cover, medics, and the interactive tutorial. Browser QA verified T and the Fire rocket button, the aiming guide, lethal hit sound, reload feedback and no repeat fire after reloading.

The extended diagnostic played all nine squad pairings with four seeds (36 games), using AI for both teams and no deployment delay. Every match finished: mean 31.1 seconds, minimum 20, maximum 54. Player-side AI won 24/36; enemy rockets intentionally have additional scatter. Actual player control, deployment planning and manual accuracy change these outcomes. This checks progress and deterministic simulation rather than proving human balance. Full observations are in balance-v0.18.json.

```sh
BEDLAM_AUDIT_FILE=/tmp/brigadier-bedlam-v0.18-audit.json npx vitest run tests/tuning.test.ts
```
