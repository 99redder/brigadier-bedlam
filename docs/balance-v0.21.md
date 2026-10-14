# v0.21 positioning and rifle balance

Rifle range 300→210, preferred range 235→170, cooldown 0.65→1.1 seconds, damage unchanged at 18. Land movement is another 14–17% slower: Rifleman 24, Bazooka 20, Lobber 22, Torch 25, Sapper 26. Medic speed 53, recruit speed 90. Class armor, explosive lethality and manual rocket precision remain.

Regular troops on either team hold automatic fire during movement and wait 0.7 seconds to aim after stopping. Fire all obeys this restriction. Manual rockets retain deliberate bracing. Attack orders stop in range rather than firing on the run. Bullet collision is identical for both teams; the separate enemy 85% hit coin flip is removed. Seeded spread, jams, drowning and reward rolls remain as designed.

Move squad assigns available player troops to spaced safe destinations and scales path speeds toward a shared arrival time without exceeding class speed. Deployment queues the command; individual movement, attack, bridge, hold and aim override a troop's formation speed. Water and changing obstacles can disrupt arrival timing. All routes remain visible during coordinated movement. Troops in brawls, drowning or down, and auxiliary recruits, are excluded. Right-click cancels the targeting mode.

165 tests pass, including reduced rifle range/cadence, moving fire suppression, aiming delay, spaced destinations, coordinated clear-ground arrival, deployment freezing, overrides, unavailable troops and deterministic group replay. Browser QA exercised the actual button and ground click and verified all five destinations, queued statuses and the 210-unit rifle circle.

The 36-game matched AI diagnostic completed every game: mean 30.6 combat seconds, range 22–63, player-side AI wins 13/36. Normal games add ten seconds of deployment. This verifies progress, not human balance or a guaranteed round duration; shorter rifles also change pickup and explosive outcomes. The user's previously open browser was visibly displaying v0.9, so comparisons against that older build differ from recent diagnostic baselines.
