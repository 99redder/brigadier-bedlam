import { CLASSES, type ClassId } from "../sim/data";
import { ACTIONS, type Action } from "../input/bindings";

export const BIOS: Record<ClassId, { name: string; story: string; advice: string }> = {
  rifleman: {
    name: 'Corporal Reginald “By the Book” Pritchard',
    story: 'A former crossing guard who enlisted after losing an argument with a roundabout. He irons his camouflage and files a complaint after every missed shot. He believes victory comes from discipline, good posture, and the enemy waiting their turn.',
    advice: 'Mid-range support. Quick, accurate fire and medium armor, but several hits are needed to finish an enemy. Stop and establish a firing position.',
  },
  bazooka: {
    name: 'Private Beatrice “Backblast” Briggs',
    story: 'Joined the army believing “heavy artillery” involved moving furniture. Now solves every problem with a rocket, including locked doors and awkward silences. Her armor was reinforced after she repeatedly forgot which end of the launcher was dangerous.',
    advice: 'Heavy armor and lethal direct hits. Automatic rockets scatter widely. Select the launcher for precise manual shots, lead moving enemies, and allow six seconds to reload. A selected Bazooka never fires automatically.',
  },
  lobber: {
    name: 'Sergeant Lionel “Butterfingers” Bell',
    story: 'An unsuccessful circus juggler who finally found an audience willing to scatter. Surprisingly accurate when throwing grenades; catastrophically clumsy when holding anything else. Counts every throw aloud, then forgets what number comes after three.',
    advice: 'Accurate, long-range grenades with a slow reload. Two hits kill most classes; heavy Bazooka armor takes three. Keep this lightly armored soldier away from close combat.',
  },
  torch: {
    name: 'Specialist Florence “Well Done” Finch',
    story: 'Former head chef at a motorway café, dismissed after declaring the salad “insufficiently cooked.” Treats every mission as a catering assignment. The gas mask conceals her expression, but everyone knows she’s disappointed in the seasoning.',
    advice: 'Get close enough to ignite an exposed enemy. Burning continues after they leave range and eventually kills most classes. Water extinguishes flames; heavy armor can survive one burn.',
  },
  sapper: {
    name: 'Private Sidney “Short Fuse” Sparks',
    story: 'A demolition apprentice fired for completing a twelve-week project in eight seconds. Wears no armor because it “slows down the inspiration.” His battle plan has two steps: get extremely close, then discover whether he remembered to light the fuse.',
    advice: 'Accurate and lethal at very short range. No armor means little room for mistakes. Approach behind cover and commit only when the route is clear.',
  },
};
export const MANUAL_CHAPTERS = ["Getting started", "Field tactics", "Personnel files", "Controls"] as const;
export type ManualChapter = 0 | 1 | 2 | 3;

export function manualContent(chapter: ManualChapter, portrait: (id: ClassId) => string, hint: (action: Action) => string, escape: (text: string) => string) {
  if (chapter === 0) return `
    <div class="manual-intro"><div class="eyebrow">Welcome to the disputed picnic grounds</div><h3>Five volunteers. One questionable plan.</h3><p>Command five cartoon soldiers in a real-time skirmish. Win by knocking down the entire opposing squad. A downed enemy can return if a medic reaches them, so keep an eye on rescue attempts.</p></div>
    <div class="manual-grid"><article><h3>01 / Learn by doing</h3><p>Start with <strong>Boot camp</strong> on the main menu. It has no enemies and walks you through selecting, moving, shooting, cover, rivers, and rescues with actions you perform yourself.</p></article>
    <article><h3>02 / Pick your trouble</h3><p>Choose one of three five-soldier squads. Mixed Bag includes every class. The battle seed reproduces the starting opposition; your orders change the outcome.</p></article>
    <article><h3>03 / Plan before GO</h3><p>Every normal match begins with a <strong>ten-second deployment</strong>. Inspect cover, the bridge, and supply drops. Select soldiers and click destinations to queue opening moves. Nobody moves or shoots until GO. Beeps warn you as deployment ends.</p></article>
    <article><h3>04 / Give orders</h3><p>Click a living friendly soldier, then a destination to move or an enemy to attack. Use <strong>Move squad</strong> for a spaced formation with coordinated arrival on clear ground. Hold stops one troop. Right-click deselects or cancels targeting.</p></article>
    <article><h3>05 / Stop, aim, fire</h3><p>Regular soldiers stop firing while moving and take a brief moment to aim after stopping. Most then shoot automatically only within a 120° arc in the direction they face. Use Face direction, then click a point to watch a lane. Movement changes facing; set a direction after issuing a move to watch it on arrival. <strong>A selected Bazooka requires manual fire.</strong> Passive fire pauses between shots. Repeat Fire all to command volleys at up to twice that pace inside each troop’s facing arc. It skips the passive pause, never a weapon’s reload. Moving troops and the selected manual Bazooka are excluded. Out-of-range shots can miss.</p></article>
    <article><h3>06 / Pause and reconsider</h3><p>Pause whenever you need a breather. Open the battle menu to read this manual or change controls. The battle stays paused while you read. Winning survivors celebrate before the after-action report.</p></article></div>`;
  if (chapter === 1) return `<div class="manual-grid">
    <article><h3>Watch your firing lane</h3><p>Selection shows a 120° field-of-fire sector; small gold arrows show your troops’ directions. Press ${escape(hint("face"))} or Face direction, then click the map to turn or queue a direction on arrival. Turning requires a moment to aim and preserves your reload. Repeated Fire all commands can double passive fire rate, but cannot shorten reloads. Troops cannot automatically shoot behind or beside their arc. Explicit attack orders and manual rockets turn toward the commanded point. Enemies also face their firing lanes, so flanking matters.</p></article><article><h3>Solid cover</h3><p>Rocks and sandbags shield soldiers from bullets and explosions. Guns cannot destroy them. Rockets wear them down; dynamite can demolish cover in one blast. Destroying a shelter opens a new firing lane.</p></article>
    <article><h3>Take cover stance</h3><p>Select one soldier and press <strong>Take cover</strong> beside their name or ${escape(hint("cover"))}. They crouch, cannot move, and reload twice as slowly, but are much harder to hit with rifles at range. Use Leave cover before moving. Explosions, fire, snipers, and fists remain dangerous. This stance requires dry ground.</p></article>
    <article><h3>River or bridge?</h3><p>Water slows movement and can drown a soldier when they enter. Risk depends on class; heavy equipment makes crossing worse. The out-of-the-way bridge offers a safer detour. Order a soldier onto the bridge to use it. Water also puts out burning troops.</p></article>
    <article><h3>Manual rockets</h3><p>Select a Bazooka, then click an enemy, or point at the map and press ${escape(hint("rocketFire"))}. Manual rockets have no random scatter, but fly to a fixed point: lead moving targets. Firing braces the soldier and starts a longer reload. Deselect to resume inaccurate automatic fire.</p></article>
    <article><h3>Medics and casualties</h3><p>You have <strong>two medic calls</strong>. Click a downed teammate or call the field medics to attempt a rescue. Medics can be killed. Burned, drowned, and other permanent casualties cannot be revived. Protect the route to your patient.</p></article>
    <article><h3>Close encounters</h3><p>Soldiers who meet at close quarters enter a fist fight. Select a brawler to punch, kick, or hold block using the bindings in Controls. Leave room between squads if you want their weapons to do the talking.</p></article>
    <article><h3>Risk a supply run</h3><p>Walk onto a glowing <strong>?</strong> drop to claim one random, single-use reward. Both teams compete for them. One sits in the river and two occupy awkward alcoves. Click a claimed reward, then its target. Right-click cancels without spending it.</p></article>
    <article><h3>Airstrike</h3><p>Marks a blast zone, sounds a warning, then sends a bomber to drop five bombs after 4.5 seconds. Move away from the marker: <strong>friendly fire applies</strong>. Solid cover can shield troops, but exposed shelters are destroyed.</p></article>
    <article><h3>Sniper shot</h3><p>Click one enemy for a guaranteed kill, even behind cover. You get one shot. An empty click keeps the reward ready.</p></article>
    <article><h3>Reinforcements</h3><p>Pick a lane to summon three fast, fragile recruits. They charge enemies and kill by contact, but have no ranged weapons. They expire after a short time, cannot be controlled or revived, and do not count toward squad victory.</p></article>
    </div>`;
  if (chapter === 2) return `<p class="manual-note">Personnel department / approved for morale purposes. Tactical notes below each file describe the class in play.</p><div class="bio-list">${(Object.keys(CLASSES) as ClassId[]).map(id => `<article class="bio-card"><img src="${portrait(id)}" alt="${CLASSES[id].name}"><div><div class="eyebrow">${CLASSES[id].name} / ${CLASSES[id].armor === "None" ? "No armor" : `${CLASSES[id].armor} armor`}</div><h3>${escape(BIOS[id].name)}</h3><p>${escape(BIOS[id].story)}</p><p class="bio-advice"><strong>In the field:</strong> ${escape(BIOS[id].advice)}</p></div></article>`).join("")}</div>`;
  return `<p class="manual-note">Your current bindings are shown below, including custom changes. Open Controls from the main or pause menu to rebind them. Mouse orders work on the battlefield; buttons handle menu actions.</p><div class="manual-controls">${(["field", "brawl", "global"] as const).map(context => `<article><h3>${context === "field" ? "Battlefield" : context === "brawl" ? "Fist fights" : "Squad & menus"}</h3><dl>${(Object.keys(ACTIONS) as Action[]).filter(a => ACTIONS[a].context === context).map(a=>`<div><dt>${ACTIONS[a].label}</dt><dd>${escape(hint(a))}</dd></div>`).join("")}</dl></article>`).join("")}</div>`;
}
