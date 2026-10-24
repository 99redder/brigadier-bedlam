# Brigadier Bedlam

Current prototype: **v0.43 — rehearsed enemy playbooks for all ten maps.**

New campaigns shuffle ten different map layouts without repeats. Difficulty follows the stage (1–10), not a fixed map name. Stage 1 always has just three weak, slow opponents (two Riflemen and a Lobber); later stages build toward five stronger, quicker opponents with better aim/reload/reactions. Enemy supply powers unlock at stage 4 and rescues at stage 6. Each map starts a fresh copy of your selected squad. Win or lose, the result screen offers the next map until all ten have been visited. Completed stages count once.

| Map | Character |
| --- | --- |
| Picnic Panic | Overturned officers’ picnic tables and hampers |
| Sunstroke Salute | Burned-out tanks with broken tracks and barrels |
| Tea Break Trenches | Wrecked tea wagons carrying oversized kettles |
| Muddy Moustache | Bogged recovery tractors and muddy wheels |
| Crooked Crossing | Crashed aircraft with detached wing panels |
| Quartermaster's Folly | Abandoned supply lorries and spilled cargo |
| The Long Lunch | Collapsed mess halls and barricaded counters |
| Soggy Bottom | Stranded patrol boats with battered hulls |
| Brass Hat Bottleneck | Crumpled staff cars from an unofficial motorcade |
| Frostbite Fiasco | Ruined radio huts and toppled aerials |

Campaign points = stage × (150 per defeated enemy + victory bonuses: 1,000, 100 per survivor, and 2 per second remaining under five minutes). Defeats still earn defeated-enemy points. The result screen shows map points, cumulative points, wins and the next map's briefing. The tour route, selected squad, completed-stage results and optional nickname persist on this device; reloading restarts only the unfinished stage. Local storage failure does not block play.

The nickname input is optional before play and after every map. Continue works without it. Adding a nickname later attaches it to the entire accumulated run; unnamed runs are kept on this device and become eligible to publish when named. Named records sync to the shared all-time leaderboard (best tour per nickname). Failed saves remain queued for retry on startup, online events and result/leaderboard visits. Nicknames are public, unverified and not reserved accounts. This is a casual leaderboard: the server validates map order, result bounds and score calculation, but does not replay matches to prevent a modified client inventing plausible results.

The game remains on GitHub Pages. A Cloudflare Worker and D1 database provide shared scores at `https://brigadier-bedlam-scores.99redder.workers.dev/scores`. Only score/nickname/run metadata is sent after choosing a name. A random device-held run claim prevents other devices overwriting that run; score writes are idempotent and rate limited. Anonymous scores are never uploaded.

For local leaderboard development, run `npx wrangler d1 execute brigadier-bedlam-scores --local --file=leaderboard/schema.sql`, then `npm run leaderboard:dev` in a second terminal. Vite development uses localhost:8791; production uses the deployed Worker. `node leaderboard/smoke.mjs` performs write tests only against a local database. `npm run leaderboard:check` checks generated Worker types, and `npm run leaderboard:deploy` deploys the API using your Cloudflare authentication. `wrangler.jsonc` identifies the dedicated database and Worker; schema setup is additive. GitHub Actions checks both frontend and Worker types, then deploys the static frontend as before.


Each airstrike rolls one seeded accuracy result before its warning: 25% land within 35 units of the requested point, 45% drift 80–180 units, and 30% drift 220–360 units. Impact centers stay within the map, so edges can reduce the final offset. The targeting preview shows the possible drift area, not a guaranteed blast location. After calling, the gold/red warning marks the actual 105-unit blast zone, with a faint white cross/line showing the original request and its drift. The banner reports CLOSE TO TARGET, OFF TARGET or WAY OFF TARGET. Bombs, damage, cover destruction and friendly fire all use that same resolved location. A wide miss can hit nobody or endanger your own squad. Both teams use the same scatter; replays reproduce it.

Reinforcements have been removed from both teams. Supply drops now award only a one-use airstrike or sniper shot. The three contested drop locations and the remaining rewards keep their existing rules. Unsupported old reinforcement commands cannot spawn troops or spend a reward.

Troops still shoot automatically inside their facing arcs, but at half the commanded pace. Each shot now starts the normal weapon reload and a longer passive-fire timer. **Fire all** bypasses only the passive wait: repeat the button or its binding to fire ready stationary troops at up to twice the unattended rate. The roster shows VOLLEY READY when a troop has reloaded but is still waiting to fire automatically. One press commands one volley; it does not enable a permanent speed boost. Repeated clicks cannot shorten reloads, skip aiming, fire outside the arc, or make moving troops shoot. Taking cover still doubles reloads and passive intervals. Selected Bazookas also fire automatically. Both teams use the slower passive cadence. Damage and movement speeds are unchanged.


Automatic weapons only fire within a **120° arc** centered on the soldier’s facing direction. They no longer swivel to acquire enemies beside or behind them. The selected troop’s range sector and the small gold direction arrows make their firing lanes visible. Fire all and guaranteed out-of-range misses obey the same arc, including when targeting medics. No enemy inside the arc means no automatic shot and no reload spent.

Select a soldier, click **Face direction** (default **V**, left-handed **N**), then click a point on the map. A stationary soldier turns in place and takes the normal 0.7 seconds to settle; reloads are preserved. Moving faces the direction of travel. After queuing a move, assign a facing order to watch that direction on arrival without cancelling the route; this also works during deployment. New movement orders replace that queued facing. Right-click cancels facing selection. Troops can turn while taking cover. Explicit attack/demolition orders turn toward the commanded target once; manual Torch bursts aim toward the cursor. Enemy AI sets its own firing positions and must obey the same arc and settling rules. Flanking a stationary firing lane now matters.


Open **Field manual** from the title screen or battle pause menu. Four scrollable chapters cover getting started, field tactics, all five slapstick personnel biographies with portraits and class advice, and your current control bindings. The battle stays paused while reading; Close manual or Escape returns to the previous screen. Chapter navigation, keyboard scrolling and focus stay within the manual.

Soldier, melee, celebration, medic and casualty textures now render at twice their previous resolution while retaining their gameplay size. Soft shading, rounded outlines, uniform stitching, equipment highlights and class-specific details make the five silhouettes clearer: Rifleman tailoring and rifle hardware, Bazooka armor plates and launcher bore, Lobber grenade segments and beret pin, Torch pressure gauge and pilot flame, and Sapper overalls, bandage and dynamite fuse. Both teams keep their identifying colors.

Moving soldiers use a twelve-frame stepping cycle with independent legs and quieter body bobbing. Taking cover uses a dedicated crouched pose. Troop and medic positions interpolate between the fixed simulation steps for smoother movement on faster displays. This is a presentation pass: movement speeds, weapon stats, hit detection, AI and replay timing are unchanged.

Select a living troop and click the gold **Take cover** button beside their name and soldier number in the bottom orders panel or press **C** (left-handed preset: **K**). They duck into a lower profile, stop moving, and show a turquoise shield/ring and IN COVER label. Rifle shots are much less likely to hit them at range, but they fire half as often. Use **Leave cover** or the same key before moving again. Movement and bridge orders are blocked while covered, and Move squad leaves covered troops in place. Cover can be set during deployment and remains active after deselection.

This stance is available on dry ground and is separate from hiding behind solid terrain. It reduces the rifle target area and increases incoming rifle aim error; it does not add armor or an extra random dodge roll. Closing the distance makes rifles more effective again. Explosions, flames, sniper shots and melee remain counters, and direct rocket/dynamite hits retain their lethality. All outgoing reloads—including manual flames—are doubled. Leaving cover cannot shorten an existing reload. Brawls, casualties and revival clear the stance. Saved controls upgrade without losing custom bindings.

Use **Move squad**, then click a destination, to send available troops to spaced positions. Routes remain visible, and their speeds are coordinated for arrival together on clear ground. Cover, water, drowning and combat can disrupt that timing; water orders retain the direct risky route. Use individual movement/bridge/Hold orders to override one soldier. Group movement can be queued during deployment; right-click cancels targeting.

Moving regular troops now hold automatic fire. After stopping they take 0.7 seconds to aim, making covering fire and the decision to advance matter. Explicit attack orders stop a soldier when it enters firing range; manual flame bursts require a stationary soldier. Both teams follow the same movement/firing rules. Rifle range drops from 300 to 210 (30% less), with reload time increasing from 0.65 to 1.1 seconds. Damage stays 18 per hit, making rifles mid-range support rather than an all-purpose long-range answer. Movement is a further 14–17% slower across regular troops, medics. Enemy rifles use the same hit geometry as player rifles; the extra hidden hit/miss coin flip is removed, while weapon scatter, cover, jams and water risks remain.

All regular soldiers on both teams now move about 40% slower than v0.19. Medics are slower by the same proportion. Class speed differences, river penalties, weapon reloads and the ten-second deployment phase remain. This gives opening routes, repositioning and leaving cover more weight.

Airstrikes now announce FRIENDLY or ENEMY AIRSTRIKE in a large banner and mark the blast zone in gold or red. A 4.5-second warning gives troops time to leave the danger zone. A large four-engine bomber crosses the battlefield and visibly drops five bombs into the marked area. Bombs hit together at the actual damage moment, followed by fireballs, an expanding shockwave and 2.4 seconds of smoke. Warning sirens, engine rumble, a falling-bomb whistle and a distinct series of blasts distinguish airstrikes from rocket hits. Pause freezes the animation and Sound off respects every new cue. The aftermath also finishes during victory celebrations.

The central wooden crate is gone. Each bank now has five broad rock/sandbag shelters, all using the existing destruction rules. Three glowing supply drops offer a reason to leave cover: one in the river, one in a southern alcove, and one in a northern alcove. Walk a living squad member onto a drop to claim it. Both teams compete for the same drops, each collected only once. River entry still carries normal class drowning risks.

Each drop rolls one random one-use reward:

| Reward | How to use it | Tradeoff |
| --- | --- | --- |
| Airstrike | Click its Supply rewards button, then a point on the map | Random drift up to 360 units; actual zone gets a 4.5-second warning; 105-unit lethal blast; friendly fire and cover shielding apply. Destroys exposed cover. |
| Sniper shot | Click its button, then an enemy | One guaranteed kill, including behind cover; only one shot. An empty click keeps it ready. |

Right-click cancels reward targeting without spending it. The yellow reticle previews targeting; red circles and an incoming aircraft warn of an airstrike. Rewards cannot be used during deployment or after the match ends. Enemy AI sends its nearest suitable soldier for supplies and uses captured rewards automatically. Boot camp remains enemy-free, with its final briefing explaining normal supply rules.

Select Torch and press **T** (left-handed preset: **L**) to spray toward the cursor. The narrow cone previews flame reach. Torch alone supports manual aiming: select it and use the rebindable spray action at the cursor, or click an enemy. Bursts require a stationary soldier, use a 30° cone, and share reload/heat with automatic fire. The tank overheats after sustained bursts and cools before firing resumes; deselection and Fire all cannot reset heat. All Torch units retain automatic fire. Bazookas now always fire automatically, with a 70° facing arc, 1.5-second aiming delay, scatter, and eight-second reload.

Deployment sounds once per displayed countdown second. The final three seconds use a higher double beep, followed by an ascending start call exactly when GO releases combat. Pausing stops new cues; resuming does not repeat the current tick. Restarting resets the sequence, boot camp stays silent, and Sound off mutes every deployment cue.

Every normal match opens with a ten-second deployment countdown. Inspect the full map, select soldiers, and click destinations (or the bridge) to queue opening moves. Routes stay visible for every assigned soldier; orders can be revised or cancelled with Hold. Both teams and their weapons remain frozen until GO, and the combat clock starts then. Pause and Controls also pause deployment. Boot camp stays interactive without a countdown.

Movement is slower for every class and medics (53 units/second). Weapon strengths and weaknesses:

| Class | Land speed | Seconds between shots | Effect on an exposed soldier |
| --- | ---: | ---: | --- |
| Rifleman | 24 | 1.1 | 18 damage; quick, accurate fire with medium armor (230 HP) |
| Bazooka | 20 | 8 | One rocket blast kills; heavy armor (330 HP); automatic scatter |
| Lobber | 22 | 5 | Accurate 115-damage grenades; two hits kill most classes, three for Bazooka; light armor (180 HP) |
| Torch | 25 | 2 | 12 contact damage, then 35 damage/second while burning |
| Sapper | 26 | 6 | Accurate lethal dynamite, 80-unit reach and 34-unit blast; no armor (130 HP) |

A flame hit ignites an eight-second burn, shown by flames and ON FIRE status. It persists outside weapon range and behind cover, eventually killing most full-health soldiers as ash; heavy rocket armor can survive one burn. Further flame hits refresh the duration without stacking burn damage. River water extinguishes burning; cover prevents the initial flame hit. Medics can burn too. Training remains protected.

Rockets and dynamite still respect cover and friendly fire. Cover damage stays unchanged: three rockets or one dynamite demolish a rock, while grenades chip it and bullets/flames cannot damage it.

When a rocket blast actually damages a soldier or medic, it plays a distinct crack/boom with a bright two-note confirmation instead of the normal rocket explosion. Cover hits, empty explosions, out-of-range misses, downed units, and protected training targets keep the ordinary impact sound. Each rocket emits one hit cue even if its blast damages several units. The cue respects Sound off and has a separate playback throttle so a nearby terrain impact cannot suppress it.

If no enemy is in effective range units keep firing toward the closest living enemy inside their facing arc. These shots stop at weapon range, respect cover visually, and always miss without damaging soldiers or medics. Explosives intercepted by cover still damage that cover normally. Normal cooldowns, jams, brawls, drowning restrictions, and Torch's water restriction still apply. In-range attacks keep their normal damage rules. Fire all includes these distant shots for stationary player soldiers.

Title-screen illustrations are rendered directly at high resolution with larger, distinct weapons and class/weapon nameplates. The rifle has a wood stock and long barrel; the rocket launcher has a wide muzzle; the grenade has segmentation and a pull ring; the flamethrower has a fuel hose and pilot flame; dynamite is a tied bundle with a sparking fuse. Squad-selection and roster portraits also render at higher resolution.

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

`dist/` is a static site. No account, multiplayer, analytics, or AI service is required to play. The optional shared all-time board uses the score API described above; offline gameplay and device-local scores still work. GitHub Actions tests and builds every push to `main`, then publishes to GitHub Pages. Pull requests run the same checks without publishing.

## How to play

Start with **Boot camp** on the title screen for guided practice, or choose a preset squad, optionally enter a battle seed, then deploy. Knock down all five enemy soldiers before they do the same to yours.

- Left-click a friendly soldier to select them. Left-click the ground to move, an enemy to attack, scenery to demolish, or a downed friendly to call a medic.
- Left-click the bridge with a soldier selected to take a safe route to the opposite bank. Clicking ground on the far bank takes the direct route, with water speed penalties and drowning risk.
- **Fire all** (`G` by default; `H` in the left-handed preset) orders stationary player soldiers to shoot at an available enemy in range, their current demolition target, or fire a guaranteed miss toward the closest enemy inside their facing arc beyond range. Moving soldiers keep their routes; Torch heat also limits firing. The order bypasses the passive pause, but respects reloads, jams, brawls, and cover; the radio log reports how many fired.
- Right-click to deselect. Stationary soldiers automatically fire at enemies inside their facing arc after aiming; shots beyond the range sector always miss. They otherwise hold their positions unless carrying out an explicit order.
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
- Rockets, grenades, and dynamite can damage allies. Flame attacks affect enemies in a cone. Rockets have a small 24-unit blast radius.
- Dynamite throws have only 80 world units of range. Exposed soldiers anywhere within the 34-unit blast radius die permanently, including allies. Rockets are likewise lethal inside their 24-unit blast radius.
- All projectiles stop at the first intact obstacle, including thrown explosives. Blast visibility uses the obstacle layout before destruction: the blast that removes cover still shields soldiers and other scenery behind it. Subsequent attacks can pass through the cleared route. This applies to every solid prop on the current battlefield and any new props added through the same cover data. Water, the bridge, and the ground remain terrain.
- Explosive lethality is guaranteed rather than random. Burning causes permanent ash deaths over time. All values live in `src/sim/data.ts`.
- A brawl begins within 28 world units and cannot be interrupted by a move order. Nearby living soldiers get a small knockback. Third parties may still shoot combatants. Weapons are stowed during the fight; guards, punches, kicks, blocked hits, recoil, and knockdowns use separate generated frames. Strike follow-through completes before ranged fire resumes. AI guards are held briefly so blocks are readable.
- A medic call is spent when dispatched, and duplicate calls for a soldier are rejected. Enemies get the same two-call allowance.
- A battle ends immediately when a side has no living soldiers, even if its medic is inbound. Simultaneous elimination counts as a player defeat.
- A selected Torch attack aims one stationary burst at the target’s current point. Other attack orders, including Bazookas, chase the named target into range and fire through their facing arc. Hold cancels movement and pursuit but keeps automatic firing. Explicit orders persist after deselection.
- Enemy AI avoids unsafe allied blast zones, chooses dry firing positions, completes surviving crossings, favors suitable targets and firing positions, penalizes exposed positions and clustering, avoids water as Torch, and retreats briefly when hurt before re-engaging.
- The left-handed preset moves keyboard shortcuts to the specified right-hand keys; mouse buttons retain their standard primary/secondary roles.
- Browser keyboard-layout labels are used where supported. Observed key labels and physical-code labels provide fallbacks elsewhere.

## Scope and remaining work

Implemented: title, interactive boot camp, three squads, ten campaign maps, cumulative scores and a shared nickname leaderboard, five classes, cover, water, enemy AI, medics, permanent deaths, close combat, rebindable controls, synthesized SFX, pause menu, win/lose screens, replay export, tests, and static hosting.

This is a first playable prototype, not final game art or a finished balance pass. Rounds favor a short planning window followed by brisk, lethal combat. The v0.21 matched 36-game diagnostic averaged 31 seconds of combat (22–63 seconds), plus the ten-second deployment phase; positioning, instant kills, and player orders still affect duration. Additional human playtesting is needed to judge fun, difficulty, and class balance. Commando controls, final sprite animation, and music remain outside this build's scope. The simulation/view boundary leaves room to add them.

Browser QA uses the desktop Chromium browser available in the development environment. Other browsers, alternate keyboard layouts on physical hardware, and subjective audio quality are not yet verified.

The v0.10 balance changes and repeatable diagnostic are documented in [docs/balance-v0.10.md](docs/balance-v0.10.md). Automated AI control of both teams is a diagnostic option; ordinary play keeps the player squad under manual orders.

### v0.30 specialist balance

Manual aim belongs only to Torch. Bazookas keep heavy armor and lethal hits but rely on automatic scattered fire through a 70° arc, a 1.5-second aiming delay, and an eight-second reload. Torch can aim short 30° bursts with the existing T/L binding, must stop first, and retains automatic fire when selected. All flame bursts share heat and cooldown; overheated tanks stop firing until cooled. Burn damage refreshes without stacking. Controls, facing previews, tutorial copy and field-manual advice reflect the change.

### v0.31 map landmarks

Each map now has four large, themed cover props with its own silhouette and authored layout: overturned picnic furniture, burned-out tanks, wrecked tea wagons, bogged tractors, crashed aircraft, supply lorries, collapsed mess halls, stranded boats, crumpled staff cars and ruined radio outposts. These are solid simulation cover, not decoration: movement and gunfire are blocked, guns/flames cannot destroy them, three rocket hits or one dynamite bundle demolish them, and their rubble is passable. Each landmark shows damage cracks and a health strip after being hit. The field manual describes each map's props and tactical role.

### v0.32 environment variety

Frostbite Fiasco is the snow map: pale drifts, vehicle tracks, frosted radio huts and a rim of ice around an open blue meltwater channel. Sunstroke Salute is the desert: warm sand, dune ridges, wind ripples, dusty tank wrecks and an oasis channel. The other maps use wildflower meadow, autumn leaves, churned mud, chalk coast, red dust, parched hayfield, marsh reeds or cracked cobblestone. Each has a separate ground/bank/water palette, ground detail and routed wheel tracks. Flat ground decoration adds no hidden obstacles. Solid wrecks remain destructible cover. Rivers retain class-based drowning risks and bridges remain safe. Rain and snow now apply the explicit v0.33 rules below; sand remains cosmetic. Map IDs, campaign routes and saved scores remain compatible.

### v0.33 tactical weather

Soggy Bottom now has visible rain. On both teams, Torch range falls from 112 to 84, initial flame damage falls from 12 to 6, burn damage falls from 35/s to 17.5/s, and burns last three seconds instead of eight (58.5 total damage per isolated burst instead of 292). Repeated hits refresh rather than stack burns; heat and reloads still apply. The effective cone preview and AI approach distances use the reduced range.

Frostbite Fiasco has deep snow. Ground movement slows by class: Bazooka 45%, Torch 35%, Lobber 20%, Rifleman 10%, Sapper 5%. This applies equally to both teams before stage difficulty modifiers. Cleared bridges retain normal speed; river movement uses the existing water penalties and drowning risks. Squad formation pacing and AI supply travel costs account for snow. Forced melee motions and field medics retain their existing behavior.

A persistent header warning, deployment advice, selected-unit notes, moving-unit roster status, radio message, next-map briefing and manual chapter explain conditions before and during play. Rain animation uses simulation time, freezes on pause and never consumes simulation randomness. Map weather is fixed for a round and is derived deterministically from its map ID for replays.


### v0.34 — Run light and timed comeback chests

Select a soldier and use **Drop gear** (**B**, or **M** in the left-handed preset) to leave their weapon and armor at their exact position. Unarmed soldiers have 130 maximum HP and move at 36 units/second, with lighter snow/water penalties. They cannot shoot, but can collect supplies/chests, call support powers and fight with fists. Health percentage, reloads and heat persist across equipment changes. Dropping gear requires dry ground.

**Return for gear**, the same key, or clicking the selected soldier's own kit sends them back by a dry route, or swims out first if already in the river. Only its owner can recover it. Another move/hold/cover order cancels recovery. Equipping preserves health percentage and imposes at least 1.5 seconds before firing. Distinct light-shirt sprites, empty hands, roster status and labeled kit markers show the tradeoff.

Campaign chests first arrive after 30 combat seconds, then every 45 seconds, up to six per map. Each expires after 45 seconds; deployment/pause freeze the clock. Spawn candidates (dry ground on rivers, central water on lakes) favor a side that has lost more of its starting roster. Both teams compete for chests, including AI runners. Rewards are a sniper shot, an inaccurate airstrike, 35% maximum-health treatment/extinguishing for living allies, or a recall of one fallen soldier at 60% health in a nearby safe spot. Recall can restore permanent casualties, is weighted higher when outnumbered by at least two, and reuses existing roster slots without replacing dropped gear. No chests spawn in Boot camp. The HUD and field manual explain timing, recovery and reward rules.


### v0.35 — Difficulty modes and progressive enemy tactics

New tours offer Easy (×1 score), Medium (×1.5, default) and Hard (×2). Mode is fixed through all ten stages and recorded in saves, replays, results and the shared leaderboard. Existing tours/scores retain their Original rules. Stage 1 remains a weaker three-enemy introduction in each mode; later stages add enemies, armor, tighter scatter, quicker reactions and shorter reloads. Regular movement remains deliberate.

Medium unlocks focus fire at stage 3, safer firing positions/flanking and defensive crouching at stage 5, airstrike-warning evasion and faster commanded volleys at stage 7, and rocket/dynamite cover demolition at stage 9. Hard unlocks these at 1/3/5/7; Easy introduces focus at 5 and flanking/cover at 9. Advanced squads field two Bazookas and substitute a Rifleman for Torch in rain. Tactical choices run on the normal AI decision timer and retain aiming delays, firing arcs, armor tradeoffs, reloads, friendly-fire checks and terrain collision. Enemy intel appears in the radio briefing and next-map report.


### v0.36 — Detailed landmark art and permanent cover

Removed floating landmark nameplates. Supersampled, cached canvas art adds shaded armor, continuous tank tracks and long barrels, wrecked aircraft wings/cockpits, dimensional truck cabs and canvas, timber/roof panels, boat decking, rusty seams, rivets and contact shadows across all ten themes. Damage cracks and health strips remain for destructible objects.

Each map retains four solid landmarks, with one smaller footprint now occupied by an indestructible concrete bunker or natural bedrock outcrop. Existing routes and bridge access remain unchanged. These props block movement, projectiles and blasts, survive every weapon and airstrike, and never generate rubble or a damage bar. Demolition commands explain that permanent cover must be flanked; advanced enemy AI does not attempt to breach it. Vehicles and wooden structures retain their existing destruction rules. The field manual describes the distinction.


### v0.37 — Enemy fortune and stronger Hard campaigns

Enemy fortune now rises every stage: Easy .02→.30, Medium .15→.65, Hard .40→1.00. Favorable rolls center weapon scatter (best of three samples on a fortune-weighted chance), shorten reloads by up to 35%, reduce jams by up to 90% and drowning risk by up to 75%. Enemy shot damage gains up to 50%, with up to a 30% chance of a further 1.75× critical hit. Luck is seeded and attached to the fired projectile, never a hit reroll or cover bypass. Player rolls and direct rocket/dynamite lethality are unchanged. At maximum enemy fortune, bomber runs are near/off/wild 75/20/5 rather than the player's 25/45/30; warnings still reveal the actual danger.

Enemy firing positions now take priority over optional loot runs. Tracking a target that remains inside a held firing arc no longer continually resets AI aiming. Enemy accuracy, health and reload curves are stronger; late Hard fields three Bazookas and two Lobbers. The difficulty picker, enemy briefing and manual explain the advantage. Original tours retain their original stat/fortune rules.


### v0.38 — Player traffic jams and enemy deconfliction

Friendly troops now body-block at 32 units of separation. Approaching a collision course within 52 units reduces movement to 40%; head-on orders can remain jammed until the player backs a troop out or routes it around. Clear parallel routes retain normal speed. Removed the automatic post-movement push that previously separated allies. Existing overlaps permit outward movement, and held/crouched units are not displaced. Amber rings, roster CROWDED warnings and compact field warning badges, selected-unit advice and a rate-limited radio message explain the jam; Hold cancels a movement order so normal aiming/firing can resume.

Enemies maintain a tighter 24-unit separation, reserve distinct goal locations, and automatically steer around allies using normal movement steps. Candidate steps respect terrain and dry bridge routes. Lookahead considers both allies and terrain; reverse movement is a last resort so troops do not oscillate on a narrow bridge. No side is teleported or pushed through cover. The manual explains route planning, staggered crossings and the enemy coordination advantage.

### v0.39 — Hear the sniper

Player and enemy sniper rewards now use the same loud, distinctive crack, low boom, rolling echoes and bolt click. The sound plays once when a valid shot fires, independently of ordinary rifle volley throttling; aiming or invalid clicks stay silent. It obeys the Sound on/off toggle.

### v0.40 — Different battlefields, different openings

Every map now has its own authored shoreline, bridge position and three starting reward positions. Rivers include an east-bending creek, opposing diagonals, a western dogleg, a Z crossing, a serpentine channel and an hourglass bottleneck. Water geometry is shared by rendering, swimming hazards and pathfinding. Landmarks sit clear of the shoreline with navigable bank passages. All maps retain a safe dry crossing.

Muddy Moustache, The Long Lunch and Soggy Bottom contain broad, bounded lakes with different north/south land approaches. ALL starting drops and later timed chests appear in central open water on those maps. Going around the lake is safe; collecting rewards requires swimming. The existing class-based slowing/drowning rules apply. Enemy chest runners can pursue water objectives, and recall rewards place revived troops on a nearby dry shore rather than in the lake. Chests retain their normal timing, expiration and reward pool.

Deployment advice describes the current layout without a central title overlay. The field manual and next-stage briefing include each map's route and objective tradeoff. Difficulty remains tied to campaign stage and mode, independently of shuffled map order.

### v0.41 — Enemy supply runs

Hard uses dedicated light supply runners from stage 1; Medium unlocks them at stage 5. Easy and Original retain their prior AI. One healthy, unexposed soldier drops real gear and armor, races for a specific unclaimed supply drop or live chest, then returns to that exact bag to rearm. The planner weighs actual navigable routes, water slowdown/entry risk, enemy firing lanes, chest deadlines and the combat cost of sidelining a class, favoring Lobbers over heavy rockets when routes are comparable. Other enemy troops keep their combat assignments while the runner is out.

Runners commit to their objective rather than changing targets every think. Capture, theft, expiry, injury, nearby threats, visible bomb warnings, a stalled route or an outbound time limit trigger a return. Losing a runner clears the assignment; a revived unarmed runner recovers its equipment before fighting. Re-equipping preserves health fraction and the normal firing delay. Runners get normal light-kit speed, armor loss and drowning rules; existing difficulty modifiers still apply. Inventory is capped at two stored powers for new runs, and a short assignment cooldown prevents repeatedly dropping gear. AI decisions remain deterministic for replays. Existing stage restrictions on spending enemy support powers remain in force.

### v0.42 — Enemy cover positions and peeking

Hard enables proactive cover from stage 1, Medium from stage 4, and Easy from stage 8. Enemy fighters evaluate actual solid objects for a screened shelter and a reachable, unobstructed firing corner. They reserve separate squad positions, walk to shelter, wait for reloads, peek to fire with their normal settling time, and return behind cover when reloading or under fire. A protected unit cannot fire through its own shelter. No movement, range, health or damage bonuses are added by this behavior.

Exposed ranged troops also use the ordinary Take cover stance against rifles before being wounded, paying its existing doubled reload/passive cadence once on entry. They stand up when close enemies, fire or changed conditions make it inappropriate. Physical cover plans release on destruction, flanking, target displacement, an unsafe shelter or stalled movement, and bomb evasion retains priority. Already safe firing lanes are retained. Light supply runners keep their assignment and clear old cover reservations when dropping gear. Melee/short-range fighters can still advance; troops neither teleport between corners nor gain blast immunity from crouching.

Regression coverage checks screened geometry, legal dry routes, clear firing corners, squad spacing, actual shelter/peek/fire/return cycles, preemptive stance penalties, cover destruction and flanking, runner interaction and deterministic replays.

### v0.43 — Enemy terrain intelligence

Ten authored playbooks define distinct approaches, firing directions, overwatch/screen positions and reward priorities. Enemy orders are prepared before deployment ends, but movement and combat still wait for GO. Hard uses map intel from stage 1, Medium from stage 3, and Easy from stage 6. Hard and later stages use the full alternate flank; earlier assisted stages keep a simpler main approach. Original tours and Boot camp retain their prior rules.

| Map | Rehearsed opening |
| --- | --- |
| Picnic Panic | Northern bridge push, with a lower-bank follow-through and south-drop screen |
| Sunstroke Salute | Southern bridge hook and diagonal-river crossfire |
| Tea Break Trenches | Northeast bridge pressure, split across the western dogleg |
| Muddy Moustache | Opposite lake-shore approaches while a runner contests the central rewards |
| Crooked Crossing | Southern bridge wing sweep, with guards on separate river bends |
| Quartermaster's Folly | Central crossing, staggered crossfire and a southern flank |
| The Long Lunch | Broad northern bypass plus the remote southern bridge approach |
| Soggy Bottom | Main southern shore attack and a northern bridge flank |
| Brass Hat Bottleneck | Southern back-door crossing while guards watch the central choke |
| Frostbite Fiasco | Northern bridge flank with snow-adjusted mobile roles and heavy overwatch |

Long-range weapons take overwatch; faster troops get flanking roles using actual weather-adjusted speed. Assault and support departures are staggered to reduce crossing traffic. Routes are normalized to legal dry positions, use existing pathfinding and squad spacing, expire or release when stalled, and yield to nearby combat, fire, cover and supply runs. Posts are held briefly before troops resume reactive combat. Replays include the same deterministic prepared roles and progress; AI creates no player commands and reads no future orders.

Runner objective costs now include each map's authored drop priority, while route length, danger, deadlines and gear recovery still apply. With terrain intel enabled, sniper rewards prioritize armed heavy threats over naked decoys. Airstrikes score actual enemy groups and avoid friendly concentrations before applying the normal inaccurate scatter. They can still miss and cause friendly fire. Rehearsed troops follow a safe approach before considering demolition; they do not waste distant shots into their own cover. Useful close-range breaching remains available. Movement speeds, weapon stats, reward odds and difficulty multipliers are unchanged.

### v0.44: enemy elite specialists

Every combat stage starts with five opponents. Two enemy-only specialists replace regular slots on Easy stage 10, Medium stages 7–10 and Hard stages 5–10: Crackshot (navy rifle veteran, 1.35× speed, 0.7× reload, 0.35× spread, 1.2× armor HP) and Blast Marshal (gold armored rocketeer, 1.3× speed, 0.8× reload, 0.45× scatter, 1.25× armor HP). Bonuses stack with difficulty. Elites keep ordinary range, aiming time, line of sight and lethal-hit rules. They prioritize visible bomb warnings, sprint 1.4× along actual escape paths and stay clear until impact. They can still be trapped or killed; sniper shots kill immediately. Elites do not strip equipment for supply runs. Historical early-stage 3/4-enemy wins remain accepted by score validation alongside new five-enemy results.
