# Prototype verification — October 13, 2026

## v0.7 interactive boot camp

- 68 tests pass. New checks cover no enemies/no premature victory, movement completion, correct weapon gating, the complete interactive lesson sequence, practice target recovery, training safety isolated from combat rules, and deterministic initial training replay.
- Browser completed the course with real roster selection, native movement/demolition/bridge/water/medic clicks, F and slot shortcuts, native punch/kick clicks, a held Shift event through the input layer, native Space pause, Resume, Menu, Controls, and Done. Travel waits were accelerated by advancing the actual simulation and tutorial update; lessons were not skipped or assigned completion flags.
- The coach reached 15/15 and TRAINING COMPLETE with five friendly soldiers and zero enemies. Deploy squad opened normal squad selection. Coach layout and highlighted routes were visually inspected, and a screenshot of the bridge lesson was saved.
- The first synthetic held-key check targeted Window and caused a test-harness TypeError; the corrected held-key check targeted the page body and completed sparring. This was not a failure during native user input. Test state was cleared by navigation.
- TypeScript and production build pass. CI repeats tests/build before GitHub Pages deployment.

## v0.6 river and bridge update

- 62 tests pass, including class speed/risk thresholds, one roll per entry, permanent drowning and medic rejection, bridge immunity, longer dry routes, default-map routing around scenery, and seeded replay with both crossing options.
- Browser verified a native click on the bridge records a bridge order; the Bazooka completed the route at the opposite bank (619, 68), alive, with zero water-exposure steps.
- Browser inspected wading ripples and the CROSSING label, sinking/fading bubbles and DROWNING label, then a DROWNED result with medic rejection. Class speed and risk are visible in the selected unit's order panel; the safe route is highlighted.
- Browser error logs were empty. Fixtures were cleared by navigation. TypeScript and production build pass; deployment repeats automated checks.

## v0.5 destructible scenery update

- 53 tests pass. New regressions cover zero bullet damage, three-rocket and one-dynamite demolition, lethal-core shielding, blast occlusion of adjacent scenery, all three material types, route reopening, explicit approach/demolition commands, and in-flight collision.
- Replay checks also compare live cover health and rubble.
- Browser fixture verified a real left-click on a rock creates a demolition order. The first rocket produced 60 health, visible cracks and a damage bar. After three hits the rock became rubble, the order cleared, and the soldier behind it retained all 1000 fixture health.
- Rocks, sandbags, and crates have distinct shapes. Browser error logs were empty. Test fixtures were cleared by navigation.
- TypeScript and production build pass; GitHub Actions repeats tests/build before Pages deployment.

## v0.4 brawl animation update

- 46 tests pass, including melee cue/cooldown synchronization, guarded damage reactions, knockout pose state, and recovery before ranged fire.
- Browser fixtures verified player left-click Punch and right-click Kick selecting the matching animated textures; blocked kicks selected the defender's raised guard.
- Fighters face each other, put their weapons away, and use extended/retracting fists or a raised kicking leg. Rendering spaces the two fighters apart for readability.
- A knockout was inspected halfway through its fall: the character retained its uniform and an unarmed hurt pose.
- A short recording of the actual running canvas captures automatically resolved fist-fight animations. Fixtures, zoom changes, and recording state were cleared by navigation.

## v0.3 character update

- Each class has a separate uniform, face, headgear, equipment silhouette, and idle posture. Team armbands, insignia, ground markers, and label colors distinguish the two sides.
- Portraits and battlefield sprites share the same generated textures; downed and revived soldiers retain their class uniform.
- Browser visual checks cover the title, squad portraits, and battlefield at playing size. This update changes presentation only; combat tuning remains the v0.2 values.

## v0.2 update

- 43 tests pass, including new direct-hit, lethal-boundary, outer-splash, friendly-fire, short-range, and weapon-event regressions for dynamite.
- A 12-match diagnostic with the same four seeds and three squads now takes 27–72 seconds, averaging 42 seconds. The v0.1 baseline averaged 159 seconds. Both sides use AI for this timing diagnostic.
- Browser inspection confirms larger class sprites with distinct vest colors, headgear, and oversized equipment. All five projectile types were fired and inspected in a controlled fixture.
- The browser audio context runs and each weapon dispatches its own fire identity; dynamite impact dispatch is also verified. Subjective listening quality still needs player feedback.
- A full-health target in the dynamite core became a skeleton and rejected a medic call in the browser fixture. Test fixtures were cleared by reloading.

## v0.1 baseline (historical)

## Automated checks

- TypeScript check and Vite production build pass.
- 38 Vitest tests pass, including required weapon, terrain, medic, death, battle-end, input-persistence, and input-conflict checks.
- Seed plus tick-stamped command replay reproduces soldier state, RNG state, and projectiles.
- Regression checks cover routing to destinations near sandbags and wounded AI re-engagement.
- A 12-match AI tournament (four seeds × three squad presets) completes without stalemates. Both sides use the enemy tactics for this diagnostic; the game itself does not automate the player's movement.
- Tournament times: 133–193 seconds, average 159 seconds. These are simulation measurements, not a guarantee of human battle duration.

## Browser checks

Desktop Chromium was used to interact with the game, not only to inspect a screenshot.

- Title → squad selection → battle → pause/menu/controls → title.
- Mouse selection, ground movement around sandbags, keyboard slot selection, and mouse attack orders recorded in the live simulation.
- Shooting, projectile effects, downed bodies, skeletons, health/status UI, and medic travel and revival appeared during a complete battle.
- All three player medic calls were used; further calls were unavailable. Enemy medics also revived soldiers.
- A manually played Long Distance battle, seed 234, ended in defeat after 254 seconds with six total revivals. The loss screen returned to title correctly.
- A scripted full browser battle, Long Distance seed 42, ended in victory after 161 seconds. This exercised the complete simulation and victory screen, rather than assigning a winning result. It was a diagnostic bot playthrough, not a manually achieved victory.
- A controlled browser brawl fixture verified left-click Punch, right-click Kick, and held/released Left Shift Block through the real input layer. Right-click stayed in the brawl context and did not deselect the soldier.
- Keyboard rebinding, persistence across reload, conflict warning/swap, left-handed preset, reset, and dynamic labels were exercised through the controls screen.

## Limits

Placeholder sprites and procedural effects are intentionally simple. Human fun, difficulty, and class balance need more playtesting. The full brief's two-to-four-minute goal is approximate; the manual battle slightly exceeded it. Cross-browser behavior, physical AZERTY/Dvorak keyboards, and subjective sound quality are unverified. No claim of final polish or universal balance is made.
