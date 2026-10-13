# Prototype verification — October 13, 2026

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
