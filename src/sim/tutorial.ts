import { Battle, type Command } from "./battle";
import { TUNING, type Cover } from "./data";
import { distance, inside, type Point } from "./geometry";
import { type Action } from "../input/bindings";
type Hint = (action: Action) => string;
export const LESSONS = [
  "welcome",
  "select",
  "move",
  "hold",
  "slots",
  "bullets",
  "rockets",
  "dynamite",
  "bridge",
  "water",
  "medic",
  "spar",
  "pause",
  "settings",
  "complete",
] as const;
export class Tutorial {
  readonly battle = new Battle(717, 0, true);
  step = 0;
  private commandStart = 0;
  private eventStart = 0;
  private meleeStart = 0;
  private crossedWater = false;
  private paused = false;
  private resumed = false;
  private settingsOpened = false;
  private settingsClosed = false;
  private blockTime = 0;
  private lastTime = 0;
  readonly rock: Cover = this.battle.cover[0];
  readonly crate: Cover = this.battle.cover[1];
  constructor() {
    const b = this.battle;

    b.note("Boot camp: no enemies. Your drill instructor has a clipboard.");
  }
  get id() {
    return LESSONS[this.step];
  }
  get complete() {
    return this.id === "complete";
  }
  get marker(): { point: Point; label: string } | null {
    const b = this.battle;
    switch (this.id) {
      case "select":
        return { point: b.get(0)!, label: "SELECT RIFLEMAN" };
      case "move":
        return { point: { x: 180, y: 235 }, label: "MOVE HERE" };
      case "bullets":
      case "rockets":
        return {
          point: { x: 295, y: 270 },
          label: this.id === "bullets" ? "RIFLE PRACTICE" : "DEMOLISH ROCK",
        };
      case "dynamite":
        return { point: { x: 400, y: 410 }, label: "DYNAMITE PRACTICE" };
      case "bridge":
        return { point: { x: 550, y: 68 }, label: "SAFE BRIDGE" };
      case "water":
        return { point: { x: 450, y: 180 }, label: "CROSS BACK THROUGH WATER" };
      case "medic":
        return { point: b.get(2)!, label: "CALL A MEDIC" };
      default:
        return null;
    }
  }
  copy(h: Hint) {
    switch (this.id) {
      case "welcome":
        return [
          "Welcome to boot camp",
          "No enemies, no time limit. You will give real orders to a five-class squad. Practice prevents permanent damage and drowning. In battles, both are real risks. Select Begin lesson when ready.",
        ];
      case "select":
        return [
          "Meet your squad",
          `Use ${h("interact")} on the highlighted Rifleman or his roster card. Each uniform identifies a weapon class. The five cards show health and status.`,
        ];
      case "move":
        return [
          "Give a movement order",
          `With the Rifleman selected, use ${h("interact")} on the glowing destination. Wait for him to arrive. The path shows his route; solid scenery makes him walk around it.`,
        ];
      case "hold":
        return [
          "Stand your ground",
          `With the Rifleman selected (${h("slot1")}), use ${h("hold")} to hold position. Hold cancels pursuit and movement but keeps automatic fire. With no enemy in range, units aim at the closest enemy and miss; the circle shows effective range. Fire all (${h("fireAll")}) orders stationary soldiers to fire at available targets; moving soldiers continue their routes. ${h("deselect")} deselects; it does not cancel an order.`,
        ];
      case "slots":
        return [
          "Select with a shortcut",
          `Use ${h("slot2")} or the second roster card to select the Bazooka. ${h("previous")} / ${h("next")} cycle living soldiers. All hints follow your saved bindings.`,
        ];
      case "bullets":
        return [
          "Cover stops bullets",
          `Select the Rifleman (${h("slot1")}), then use ${h("interact")} on the highlighted rock. Fire a practice shot. Guns cannot damage scenery; intact cover shields soldiers from projectiles and blasts.`,
        ];
      case "rockets":
        return [
          "Make a new route",
          `Select the Bazooka (${h("slot2")}) and click the same rock. Wait for three rockets to demolish it. Cracks show damage; rubble is passable. The blast that destroys cover still shields soldiers behind it.`,
        ];
      case "dynamite":
        return [
          "Short range, big consequence",
          `Select the Sapper (${h("slot5")}) and click the crate. He will approach and throw dynamite. One bundle destroys cover. In battles, one rocket or dynamite hit kills; two grenades kill a full-health soldier. Explosions hurt allies. Torch ignites an eight-second burn; water extinguishes it. Riflemen sometimes jam.`,
        ];
      case "bridge":
        return [
          "Take the safe detour",
          `Select the Rifleman (${h("slot1")}) and click the highlighted bridge. Wait until he reaches the opposite bank. The bridge is out of the way, but uses land speed and avoids drowning.`,
        ];
      case "water":
        return [
          "Try the river shortcut",
          `Keep the Rifleman selected and click the marker on the left bank. He will wade across safely in this lesson. In battles, each entry rolls drowning risk once: Rifleman 10%, Lobber 25%, Sapper 35%, Bazooka 40%, Torch 45%. Heavy classes move slower; Torch cannot fire in water.`,
        ];
      case "medic":
        return [
          "A staged medical emergency",
          `The instructor has downed your Lobber for practice. Click his highlighted body, or point near him and use ${h("medic")}; the Field Medics button works too. Wait for the medic to revive him. Each team has two calls. In battle, medics can be killed; a failed rescue still spends the call. Cover protects them; skeletons, ash, and drowned soldiers cannot return.`,
        ];
      case "spar":
        return [
          "Friendly sparring",
          `Your Rifleman and Torch are placed in a practice ring, with no damage. Use ${h("punch")} to punch, ${h("kick")} to kick, and hold ${h("block")} for a moment to block. Try all three. In battle, close opponents brawl automatically; movement cannot interrupt a brawl.`,
        ];
      case "pause":
        return [
          "Stop and think",
          `Use ${h("pause")} or the Pause button, then resume. ${h("menu")} opens the menu. Battles also pause when the game loses focus.`,
        ];
      case "settings":
        return [
          "Make the controls yours",
          `Open Menu (${h("menu")}), then Controls. Inspect the bindings and select Done. You can rebind keys or mouse buttons, add alternate bindings, or choose the left-handed preset. Changes save in this browser.`,
        ];
      case "complete":
        return [
          "Cleared for questionable duty",
          "Boot camp complete. A real battle starts with ten seconds to inspect the map and queue movement orders. Both teams stay frozen until GO. Then click an enemy to pursue and attack; units fire automatically, but shots outside the range circle miss. Knock down all five opponents to win. Choose Deploy squad for a real operation, repeat the lesson, or keep practicing here without enemies.",
        ];
    }
  }
  accepts(c: Command) {
    const required =
      this.id === "bullets"
        ? 0
        : this.id === "rockets"
          ? 1
          : this.id === "dynamite"
            ? 4
            : null;
    if (c.type === "demolish" && required !== null) {
      const target = this.id === "dynamite" ? this.crate : this.rock;
      if (c.id !== required || !inside(c.point, target)) {
        this.battle.note(
          "Follow the highlighted practice target with the requested class.",
        );
        return false;
      }
    }
    return true;
  }
  ui(kind: "pause" | "resume" | "settings-open" | "settings-close") {
    if (this.id === "pause") {
      if (kind === "pause") this.paused = true;
      if (kind === "resume" && this.paused) this.resumed = true;
    }
    if (this.id === "settings") {
      if (kind === "settings-open") this.settingsOpened = true;
      if (kind === "settings-close" && this.settingsOpened)
        this.settingsClosed = true;
    }
  }
  advance() {
    if (this.complete) return;
    const b = this.battle;
    // Stop the completed exercise's orders before starting the next one.
    for (const s of b.soldiers) {
      s.path = [];
      s.goal = null;
      s.terrainTarget = null;
      s.target = null;
      s.hold = false;
      s.brawl = null;
      s.blocking = false;
      s.fightMoveTime = 0;
      s.recoilTime = 0;
    }
    b.shots = [];
    this.step++;
    this.commandStart = b.commands.length;
    this.eventStart = b.combatEventId;
    this.meleeStart = b.meleeEventId;
    this.lastTime = b.time;
    if (this.id === "bullets" || this.id === "dynamite") {
      const prop = this.id === "bullets" ? this.rock : this.crate;
      prop.hp = 100;
      if (!b.cover.includes(prop)) b.cover.push(prop);
      b.rubble = b.rubble.filter((r) => r.x !== prop.x || r.y !== prop.y);
      b.terrainRevision++;
    }
    if (this.id === "bridge" && b.get(0)!.x >= 505) {
      Object.assign(b.get(0)!, { x: 180, y: 235, wasInWater: false });
      b.note("Rifleman returned to the left bank for the bridge drill.");
    }
    if (this.id === "medic") {
      const s = b.get(2)!;
      Object.assign(s, { x: 180, y: 410, hp: 0, life: "down", death: null });
      b.calls[0] = TUNING.medicCalls;
    }
    if (this.id === "spar") {
      const a = b.get(0)!,
        t = b.get(3)!;
      Object.assign(a, { x: 335, y: 325 });
      Object.assign(t, { x: 355, y: 325 });
      b.selected = a.id;
      b.startBrawl(a, t);
      a.brawlCd = 0;
      t.brawlCd = 1e6;
    }
  }
  update() {
    const b = this.battle,
      a = b.get(0)!;
    const commands = b.commands.slice(this.commandStart).map((c) => c.command);
    let done = false;
    switch (this.id) {
      case "select":
        done =
          b.selected === 0 &&
          commands.some((c) => c.type === "select" && c.id === 0);
        break;
      case "move":
        done =
          commands.some((c) => c.type === "move" && c.id === 0) &&
          distance(a, { x: 180, y: 235 }) < 15;
        break;
      case "hold":
        done = a.hold && commands.some((c) => c.type === "hold" && c.id === 0);
        break;
      case "slots":
        done =
          b.selected === 1 &&
          commands.some((c) => c.type === "select" && c.id === 1);
        break;
      case "bullets":
        done =
          b.combatEvents.some(
            (e) =>
              e.id >= this.eventStart &&
              e.kind === "impact" &&
              e.classId === "rifleman",
          ) && this.rock.hp === 100;
        break;
      case "rockets":
        done = !b.cover.includes(this.rock);
        break;
      case "dynamite":
        done = !b.cover.includes(this.crate);
        break;
      case "bridge":
        done =
          commands.some((c) => c.type === "bridge" && c.id === 0) &&
          a.x > 595 &&
          a.y <= 100 &&
          a.path.length === 0;
        break;
      case "water":
        this.crossedWater ||= b.inWater(a);
        done =
          this.crossedWater &&
          a.x < 505 &&
          distance(a, { x: 450, y: 180 }) < 15;
        break;
      case "medic":
        done =
          b.get(2)!.life === "alive" &&
          commands.some((c) => c.type === "medic" && c.target === 2);
        break;
      case "spar": {
        const moves = b.meleeEvents.filter((e) => e.id >= this.meleeStart);
        if (a.blocking) this.blockTime += b.time - this.lastTime;
        done =
          moves.some((e) => e.kind === "punch") &&
          moves.some((e) => e.kind === "kick") &&
          this.blockTime >= 0.25;
        break;
      }
      case "pause":
        done = this.paused && this.resumed;
        break;
      case "settings":
        done = this.settingsOpened && this.settingsClosed;
        break;
    }
    this.lastTime = b.time;
    if (done) {
      this.advance();
      return true;
    }
    return false;
  }
}
