# Brigadier Bedlam

Current prototype: **v0.12 — two medic calls and vulnerable field medics.**

Each team gets two medic calls. Medics have 60 health and can be targeted by enemy soldiers, including automatic fire and Fire all. Bullets, flames, and blasts damage medics; explosions can also hit friendly medics. Cover shields them using the same rules as soldiers. A medic killed before finishing treatment leaves the patient down and the call spent, allowing another attempt if a call remains. Medics can also die while leaving after a successful rescue. Fallen medics stay on the field and cannot be revived.

The surviving soldiers on the winning team celebrate for 3.5 seconds before the results modal opens. Riflemen salute, Bazookas flex, Lobbers dance a jig, Torches pump a fist, and Sappers hop with raised arms. This also applies to enemy victories. Pausing freezes the celebration; starting another battle resets it. The celebration uses presentation time, leaving combat results and deterministic replays unchanged.

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

Start with **Boot camp** on the title screen for guided practice, or choose a preset squad, optionally enter a battle seed, then deploy. Knock down all five enemy soldiers before they do the same to yours.

- Left-click a friendly soldier to select them. Left-click the ground to move, an enemy to attack, scenery to demolish, or a downed friendly to call a medic.
- Left-click the bridge with a soldier selected to take a safe route to the opposite bank. Clicking ground on the far bank takes the direct route, with water speed penalties and drowning risk.
- **Fire all** (`G` by default; `H` in the left-handed preset) orders stationary player soldiers to shoot at an available enemy in range, or their current demolition target. Moving soldiers keep their routes. The order respects reloads, jams, brawls, and cover; the radio log reports how many fired.
- Right-click to deselect. Soldiers automatically shoot enemies in range. They otherwise hold their positions unless carrying out an explicit order.
- `1–5` select slots; `Q / E` cycle living soldiers; `R` calls a medic for the downed friendly nearest the cursor; `F` holds position.
- `Space` pauses; `Esc` opens the pause menu. The game also pauses when its window loses focus.
- In a selected soldier's brawl: left-click punches, right-click kicks, and hold Left Shift to block. Other brawls resolve automatically.
- Medics restore 60% health. Each side has two calls. Skeletons and ash cannot be revived.
- Rocks, sandbags, and crates obstruct movement, projectiles, and explosions. Three rockets or one dynamite destroy them; grenades chip them, while bullets and flames do not damage them. Rubble is passable. River water slows soldiers according to class and prevents Torch from firing. The bridge uses normal land speed and has no drowning risk.

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

## Boot camp

The title screen's **Boot camp** opens a separate practice level with five friendly soldiers and no enemies. Its 15-step coach uses highlighted targets and advances after completed actions: selecting, moving, holding, slot shortcuts, firing bullets at cover, rocket and dynamite demolition, bridge and river crossings, medic rescue, friendly punch/kick/block sparring, pause/resume, and visiting Controls. The welcome and graduation cards frame the lesson.

The lesson runs without a victory timer. Combat cannot injure soldiers and river entry cannot drown them; a staged downed ally teaches medic calls. These protections apply only in training. Guidance explains normal battle risks, automatic firing, attack orders, victory conditions, class identities, range, jams, friendly fire, permanent deaths, and saved control bindings. Hints use the current bindings. Early demolition does not break later exercises: their practice targets reset when needed.

You can restart or exit any time. Graduation offers real squad deployment, repeating the course, or continued enemy-free practice. Replay export remains available in ordinary battles; tutorial progression uses instructor events as well as commands.

## River crossing tradeoff

The jagged river zigzags between the two halves of the battlefield. Its connected water bands share a single visible bank outline, so the displayed shape matches water hazards and navigation. Its bridge sits near the northern edge, well away from the central fighting. Click it to order a safe crossing; the highlighted route shows the detour. Direct ground orders retain the shorter water route.

| Class | Speed in water (% of land speed) | Drowning chance per entry |
| --- | ---: | ---: |
| Rifleman | 85% | 10% |
| Lobber | 65% | 25% |
| Sapper | 50% | 35% |
| Bazooka | 45% | 40% |
| Torch | 40% | 45% |

The 25% baseline is adjusted for class equipment. The seeded simulation rolls once on water entry. Surviving units do not roll repeatedly while remaining in water; leaving and entering again starts a new attempt. A failed roll starts a short sinking animation, stops combat and movement, and ends in permanent drowning. Medics cannot revive a drowned soldier. Both teams use the same rules. Enemy heavy classes favor the bridge when their intended route crosses the river.

## Prototype design choices

- Every solid scenery object has 100 health. Rockets deal 40 terrain damage, dynamite 100, and grenades 20. Bullets and flames deal zero terrain damage. Cracks and health bars show damage; destruction creates debris and permanent passable rubble. Soldiers and medics recalculate active routes when cover is destroyed. Units do not intercept shots aimed at others; medics can be targeted directly and take blast damage.
- Rockets, grenades, and dynamite can damage allies. Flame attacks affect enemies in a cone. Rockets have a small 28-unit blast radius.
- Dynamite throws have only 125 world units of range. Exposed soldiers within 24 units of the blast center are guaranteed to die permanently, including allies; the outer 60-unit blast radius deals normal splash damage. The bright central flash marks the lethal core.
- All projectiles stop at the first intact obstacle, including thrown explosives. Blast visibility uses the obstacle layout before destruction: the blast that removes cover still shields soldiers and other scenery behind it. Subsequent attacks can pass through the cleared route. This applies to every solid prop on the current battlefield and any new props added through the same cover data. Water, the bridge, and the ground remain terrain.
- Other permanent instant kills, including rare outer dynamite splash kills, use the configured per-hit probability. All values live in `src/sim/data.ts`.
- A brawl begins within 28 world units and cannot be interrupted by a move order. Nearby living soldiers get a small knockback. Third parties may still shoot combatants. Weapons are stowed during the fight; guards, punches, kicks, blocked hits, recoil, and knockdowns use separate generated frames. Strike follow-through completes before ranged fire resumes. AI guards are held briefly so blocks are readable.
- A medic call is spent when dispatched, and duplicate calls for a soldier are rejected. Enemies get the same two-call allowance.
- A battle ends immediately when a side has no living soldiers, even if its medic is inbound. Simultaneous elimination counts as a player defeat.
- An attack order chases the named target into range. Hold cancels movement and pursuit but keeps automatic firing. Explicit orders persist after deselection.
- Enemy AI avoids unsafe allied blast zones, chooses dry firing positions, completes surviving crossings, favors suitable targets and firing positions, penalizes exposed positions and clustering, avoids water as Torch, and retreats briefly when hurt before re-engaging.
- The left-handed preset moves keyboard shortcuts to the specified right-hand keys; mouse buttons retain their standard primary/secondary roles.
- Browser keyboard-layout labels are used where supported. Observed key labels and physical-code labels provide fallbacks elsewhere.

## Scope and remaining work

Implemented: title, interactive boot camp, three squads, one battlefield, five classes, cover, water, enemy AI, medics, permanent deaths, close combat, rebindable controls, synthesized SFX, pause menu, win/lose screens, replay export, tests, and static hosting.

This is a first playable prototype, not final game art or a finished balance pass. Rounds now target a brisk roughly 30–90 seconds, replacing the initial brief's two-to-four-minute target. The latest matched 36-game diagnostic averaged 41 seconds (23–65 seconds); positioning, instant kills, and player orders still affect duration. Additional human playtesting is needed to judge fun, difficulty, and class balance. Campaign, extra maps, commando controls, pickups, scoring, final sprite animation, and music remain outside this build's scope. The simulation/view boundary leaves room to add them.

Browser QA uses the desktop Chromium browser available in the development environment. Other browsers, alternate keyboard layouts on physical hardware, and subjective audio quality are not yet verified.

The v0.10 balance changes and repeatable diagnostic are documented in [docs/balance-v0.10.md](docs/balance-v0.10.md). Automated AI control of both teams is a diagnostic option; ordinary play keeps the player squad under manual orders.
