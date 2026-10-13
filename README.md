# Brigadier Bedlam

Current prototype: **v0.4 — animated fist fights with punches, kicks, guards, reactions, and knockdowns.**

Five soldiers. Questionable leadership. An original, cartoonish single-player squad tactics prototype, inspired by the genre of 1990s console tactics games. No names or assets from General Chaos are used.

**Play:** https://99redder.github.io/brigadier-bedlam/

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL Vite prints. Production commands:

```sh
npm test
npm run build
npm run preview
```

`dist/` is a static site. No backend, accounts, multiplayer, analytics, or AI service is required to play. GitHub Actions tests and builds every push to `main`, then publishes to GitHub Pages. Pull requests run the same checks without publishing.

## How to play

Choose a preset squad, optionally enter a battle seed, then deploy. Knock down all five enemy soldiers before they do the same to yours.

- Left-click a friendly soldier to select them. Left-click the ground to move, an enemy to attack, or a downed friendly to call a medic.
- Right-click to deselect. Soldiers automatically shoot enemies in range. They otherwise hold their positions unless carrying out an explicit order.
- `1–5` select slots; `Q / E` cycle living soldiers; `R` calls a medic for the downed friendly nearest the cursor; `F` holds position.
- `Space` pauses; `Esc` opens the pause menu. The game also pauses when its window loses focus.
- In a selected soldier's brawl: left-click punches, right-click kicks, and hold Left Shift to block. Other brawls resolve automatically.
- Medics restore 60% health. Each side has three calls. Skeletons and ash cannot be revived.
- Sandbags obstruct movement and direct fire. Grenades and dynamite arc over them. Water slows soldiers and prevents Torch from firing.

Open **Controls** from the title or pause menu to rebind any action, add an alternate, swap conflicting bindings, apply a left-handed keyboard preset, or reset defaults. Binding hints update automatically. WASD starts unbound. Bindings use physical keyboard codes and persist locally; unsupported or corrupt storage falls back to defaults.

## Architecture and tuning

- `src/sim/data.ts`: all class names, weapon stats, preset squads, battlefield layout, and AI tuning.
- `src/sim/battle.ts`: pure TypeScript simulation, 30 fixed steps per second, seeded RNG, commands, targeting, weapons, medics, brawls, and AI. No Phaser imports.
- `src/sim/geometry.ts`: line-of-sight checks and deterministic A* movement around cover.
- `src/input/bindings.ts`: input contexts, defaults, validation, conflict handling, persistence, and physical-key labels.
- `src/view/assets.ts`: generated soldier textures and the shared asset exports. Replace texture generation with atlas loading to introduce final art.
- `src/view/fighting.ts`: unarmed fight frames, including guard, punch extension/retraction, kicks, blocking, and recoil.
- `src/view/characters.ts`: class-specific uniforms, faces, equipment, and posture; shared team armbands and insignia.
- `src/view/projectiles.ts`: bullet tracers, finned rockets, arcing grenades, flame jets, and red dynamite bundles with a lit fuse.
- `src/view/audio.ts`: individual synthesized weapon sounds and explosive impact sounds, driven by simulation combat events.
- `src/view/scene.ts`: Phaser rendering, projection, animation, and fixed-step scheduling.
- `src/main.ts`: screens, action forwarding, squad selection, and HUD.

The view uses a shallow oblique projection, depth-sorted sprites and cover, and an exact 16:9 canvas scaled to fit desktop windows. UI and soldier art are original. Google Fonts supplies optional typography; system fonts are the fallback.

## Replay a bug

The pause and result screens include **Export replay**. The JSON contains the seed, squad, and tick-stamped commands. A seed alone reproduces the starting conditions; reproducing player decisions also requires commands.

Use `replayBattle(replay, ticks)` from `src/sim/battle.ts` to reproduce the simulation in TypeScript. The replay version is `1`; replay compatibility is only guaranteed for the same game version. A development-only `window.bedlam` inspection object is available on the Vite dev server. It is absent from the production build.

## Character identities

- Rifleman: upright, moustached veteran in a tidy khaki field tunic and patrol cap.
- Bazooka: broad, bare-armed bruiser in purple armor, with a square jaw and heavy boots.
- Lobber: grinning grenadier in a flared green coat, yellow neckerchief, and tilted beret.
- Torch: industrial fire specialist in orange padded coveralls, reflective bands, a respirator, and gauntlets.
- Sapper: scruffy mechanic in blue overalls and rolled sleeves, with a bandana, spiky hair, and tool belt.

Both teams use these class identities. Their armbands, insignia, ground markers, and nameplates carry team color.

## Prototype design choices

- Cover is indestructible and blocks movement. Medics route around it. Units and medics do not block shots.
- Grenades and dynamite can damage allies. Flame attacks affect enemies in a cone; rockets hit one soldier.
- Dynamite throws have only 125 world units of range. Everyone within 24 units of the blast center is guaranteed to die permanently, including allies; the outer 60-unit blast radius deals normal splash damage. The bright central flash marks the lethal core.
- Other permanent instant kills, including rare outer dynamite splash kills, use the configured per-hit probability. All values live in `src/sim/data.ts`.
- A brawl begins within 28 world units and cannot be interrupted by a move order. Nearby living soldiers get a small knockback. Third parties may still shoot combatants. Weapons are stowed during the fight; guards, punches, kicks, blocked hits, recoil, and knockdowns use separate generated frames. Strike follow-through completes before ranged fire resumes. AI guards are held briefly so blocks are readable.
- A medic call is spent when dispatched, and duplicate calls for a soldier are rejected. Enemies get the same three-call allowance.
- A battle ends immediately when a side has no living soldiers, even if its medic is inbound. Simultaneous elimination counts as a player defeat.
- An attack order chases the named target into range. Hold cancels movement and pursuit but keeps automatic firing. Explicit orders persist after deselection.
- Enemy AI favors suitable targets and firing positions, penalizes exposed positions and clustering, avoids water as Torch, and retreats briefly when hurt before re-engaging.
- The left-handed preset moves keyboard shortcuts to the specified right-hand keys; mouse buttons retain their standard primary/secondary roles.
- Browser keyboard-layout labels are used where supported. Observed key labels and physical-code labels provide fallbacks elsewhere.

## Scope and remaining work

Implemented: title, three squads, one battlefield, five classes, cover, water, enemy AI, medics, permanent deaths, close combat, rebindable controls, synthesized SFX, pause menu, win/lose screens, replay export, tests, and static hosting.

This is a first playable prototype, not final game art or a finished balance pass. Rounds now target a brisk roughly 30–90 seconds, replacing the initial brief's two-to-four-minute target. The latest 12-match diagnostic averaged 42 seconds (27–72 seconds); positioning, instant kills, and player orders still affect duration. Additional human playtesting is needed to judge fun, difficulty, and class balance. Campaign, tutorials, extra maps, commando controls, pickups, scoring, final sprite animation, and music remain outside this build's scope. The simulation/view boundary leaves room to add them.

Browser QA uses the desktop Chromium browser available in the development environment. Other browsers, alternate keyboard layouts on physical hardware, and subjective audio quality are not yet verified.
