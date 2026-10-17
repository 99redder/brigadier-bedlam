# v0.37 — Enemy fortune

Human feedback found the previous Hard tour too forgiving. This pass adds explicit favorable enemy rolls and fixes firing behavior rather than relying on basic-bot win rates alone.

| Enemy advantage | Easy stage 1 → 10 | Medium stage 1 → 10 | Hard stage 1 → 10 |
| --- | --- | --- | --- |
| Fortune strength | .02 → .30 | .15 → .65 | .40 → 1.00 |
| Maximum-health multiplier | .55 → 1.20 | .80 → 1.65 | 1.15 → 2.10 |
| Base reload multiplier | 1.75 → .90 | 1.35 → .58 | .95 → .38 |
| Angular scatter multiplier | 1.90 → 1.20 | 1.40 → .65 | .95 → .40 |

Fortune determines a chance to select the most centered of three scatter samples. It also grants a randomly shortened reload (up to 35% at maximum fortune), reduces rifle jams by up to 90%, reduces river-entry drowning risk by up to 75%, and increases projectile damage by up to 50%. Critical projectiles have up to a 30% chance to multiply that damage by a further 1.75. These are enemy-only, seeded rolls. A projectile carries its rolled damage through impact; missing cannot reroll a hit. Physical cover, range, reloads, aim settling and direct rocket/dynamite lethality still apply. Player odds remain unchanged.

Enemy bomber probabilities progress from the usual 25% near / 45% off / 30% wild toward 75% near / 20% off / 5% wild. Near/moderate drift also shrinks. Actual landing zones remain visible during the full warning. Enemy friendly fire retains its normal consequences.

Enemies now hold a valid firing lane before considering a supply/chest run, and do not continually restart their aim timer when a target moves inside their existing firing arc. Blocked lanes do not count as valid firing opportunities. Late Hard squads contain three Bazookas and two Lobbers. Movement speeds remain unchanged from v0.35. The HUD displays the current enemy luck tier; the picker, briefings and manual explain the rules. Tours without a mode retain Original rules.

## Validation

356 automated tests cover monotonic fortune, scatter distributions, actual rocket accuracy, real critical hits, player invariance, permanent shielding, jam/reload/drowning behavior, bomber probabilities, firing against moving targets, loot distraction and replay determinism. Build, Worker types, browser HUD/layout and console checks pass.

The diagnostic script supports a stronger player doctrine: `hard '' defend` uses Long Distance, stationary defensive firing lanes, repeated Fire all, facing corrections and medic calls. This is still a scripted baseline, not a claim about skilled human win rates.

Same four seeds/maps at stage 10, capped at 180 combat seconds:

| Version | Enemy wins | Player wins | Unfinished | Mean enemy survivors | Mean duration |
| --- | --- | --- | --- | --- | --- |
| v0.36 | 1/4 | 1/4 | 2/4 | 1.5 | 124s |
| v0.37 | 4/4 | 0/4 | 0/4 | 5.0 | 33s |

Stage 5 enemy wins remained 4/4, with mean survivors increasing from 3.25 to 4.5 and mean duration falling from 60s to 46s. Opening-stage samples still favored the player. Human playtesting remains the balance standard; this diagnostic establishes stronger pressure against sustained volleys and does not guarantee a particular win rate.
