# v0.19 cover and contested supplies

Removed the central X-braced crate. Each bank has five large destructible rocks/sandbag shelters. The northern bridge retains a clear navigation corridor. River and bridge geometry are unchanged. Three shared, single-use drops occupy the river and two edge alcoves; each awards a seeded random airstrike, sniper shot or reinforcement charge to the first living regular squad member within 23 units. Downed, drowning, brawling and auxiliary troops cannot collect them. Planning and training do not collect supplies.

Players arm a reward using its button, then click a location or enemy. Right-click cancels without consumption. Sniper rejects empty ground without spending a charge. Airstrikes warn for 1.8 seconds and kill exposed units within 105 units, including allies; the intact cover snapshot shields the destroying blast. Snipers kill exactly one chosen living enemy through cover. Reinforcements spawn three unarmed 18-HP recruits at the friendly edge and charge at 175 units/second; contact within 22 units without intervening cover kills an enemy. They expire after 18 seconds, cannot fire or receive commands/medics, and never extend the regular squad victory count.

AI assigns the lowest estimated travel time among healthy living squad members to an available drop, yielding to nearby threats. Enemy rewards use the same inventory and activation rules. All collections and effects are deterministic and replayable. Optional reinforcement fields retain the existing regular-soldier rules.

## Verification

145 tests passed before the final presentation-only adjustments. New checks cover bank shelter counts, removal of crates, water drops, reachable alcoves and bridge paths, every reward roll, exclusive collection, deployment/training/downed/drowning exclusions, sniper invalid clicks and cover penetration, delayed airstrike friendly fire and cover shielding/destruction, contact-only recruitment damage, fragility/expiry, and player/AI replays. Browser QA exercised the reward buttons, reticles, warning zone, a sniper kill, reinforcement spawning and the unchanged five-slot roster.

The extended diagnostic ran nine squad matchups across four seeds (36 games), with AI controlling both teams. All finished without deadlock, averaging 21.6 combat seconds (13–38), and player-side AI won 17/36. Normal matches add ten seconds of deployment. This is a simulation progress check, not a substitute for human playtesting. See balance-v0.19.json for the observations.
