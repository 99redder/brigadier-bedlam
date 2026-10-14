# v0.20 slower movement and readable airstrikes

Movement falls about 40% across both teams: Rifleman 47→28, Bazooka 40→24, Lobber 44→26, Torch 49→29, Sapper 52→31 world units/second. Medic speed is 104→62 and reinforcement speed 175→105. Relative class roles, river modifiers and weapon cadence remain intact; recruits still expire after 18 seconds. The ten-second deployment phase is unchanged.

Airstrikes have a 4.5-second warning instead of 1.8. A prominent friendly/enemy banner and contrasting gold/red target zone precede a four-engine bomber pass and five falling bombs with trails and ground shadows. Damage occurs once at time zero, synchronized with fireballs and an expanding shockwave. Smoke persists for 2.4 seconds and finishes animating during victory. Animation reads simulation time, so pauses freeze it. No visual or audio code consumes simulation RNG.

Separate deterministic events trigger the warning siren/engine noise, falling-bomb whistle, and successive blast sounds. All respect mute and consume events once. Cover shielding, radius, friendly fire and terrain destruction retain v0.19 rules. Long-lived presentation records cannot apply damage twice.

159 tests pass, including warning timing and no premature damage, exactly-once cue phases, aftermath lifecycle, deterministic replays, and land movement for every class on both teams. Existing medic and movement completion checks allow the longer travel times. Browser QA inspected bomber/bomb and explosion/smoke frames and verified all three timed events.

The matched diagnostic ran nine squad pairings across four seeds, 36 games total. All finished: mean 32.1 combat seconds (21–52), versus v0.19 mean 21.6 (13–38). Player-side AI won 16/36. Add ten seconds of deployment for normal matches. Human orders and tactical choices change duration; these are deterministic AI diagnostics, not a human difficulty rating.
