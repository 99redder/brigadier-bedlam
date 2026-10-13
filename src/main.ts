import Phaser from "phaser";
import "./style.css";
import { Tutorial } from "./sim/tutorial";
import { Battle, type Command, type Soldier } from "./sim/battle";
import { CLASSES, SQUADS, TUNING, type ClassId } from "./sim/data";
import {
  InputLayer,
  ACTIONS,
  conflicts,
  rebind,
  type Action,
  type Context,
} from "./input/bindings";
import { Battlefield, unproject } from "./view/scene";
import { inside } from "./sim/geometry";
import { assetKey } from "./view/assets";
const ui = document.querySelector<HTMLDivElement>("#ui")!;
const scene = new Battlefield();
let tutorial: Tutorial | null = null;
function issue(c: Command) {
  if (!tutorial || tutorial.accepts(c)) scene.battle?.command(c);
}
let screen: "title" | "squad" | "battle" | "result" = "title",
  squad = 0,
  settingsOpen = false,
  settingsReturn = false,
  menuOpen = false,
  renderAt = 0;
const input = new InputLayer(
  {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
  },
  () =>
    scene.battle?.get(scene.battle.selected ?? -1)?.brawl !== null &&
    screen === "battle" &&
    scene.battle?.selected !== null
      ? "brawl"
      : "field",
  action,
);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#b3ba87",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene,
  render: { antialias: true, roundPixels: false },
  audio: { noAudio: true },
});
const esc = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const portraits = new Map<string, string>();
function portrait(id: ClassId, side = 0) {
  const key = assetKey(id, side);
  if (portraits.has(key)) return portraits.get(key)!;
  const texture = scene.textures?.get(assetKey(id, side));
  const url =
    texture?.getSourceImage() instanceof HTMLCanvasElement
      ? (texture.getSourceImage() as HTMLCanvasElement).toDataURL()
      : "";
  if (url) portraits.set(key, url);
  return url;
}
function btn(label: string, action: string, kind = "secondary") {
  return `<button class="btn ${kind}" data-do="${action}">${label}</button>`;
}
function title() {
  tutorial = null;
  scene.tutorialMarker = null;
  screen = "title";
  menuOpen = false;
  settingsOpen = false;
  scene.paused = true;
  scene.showAttract();
  render();
}
function render() {
  if (screen === "title")
    ui.innerHTML = `<section class="overlay"><div class="title-top"><span class="brand">BB / DEPARTMENT OF UNNECESSARY CONFLICT</span><span class="badge">PLAYABLE PROTOTYPE · v0.12</span></div><div class="title-content"><div class="eyebrow">Real-time tactics. Cartoon consequences.</div><h1>Brigadier<br><span>Bedlam.</span></h1><p>Five soldiers. Questionable leadership.<br>A small battlefield with a very big attitude.</p><div class="buttons">${btn("Deploy squad &nbsp; ↗", "deploy", "primary")}${btn("Boot camp", "tutorial")}${btn("Controls", "controls")}</div><p class="tiny muted">Single player · Mouse-first · No military experience required</p></div><div class="art-panel"><div class="art-grid"></div><span class="stamp">CHAOS<br>APPROVED</span>${(Object.keys(CLASSES) as ClassId[]).map((id, i) => `<img alt="${CLASSES[id].name}" class="hero-unit u${i}" src="${portrait(id)}">`).join("")}</div><div class="title-bottom"><span>ONE SQUAD. ZERO GOOD EXCUSES.</span><span>AN ORIGINAL SLAPSTICK TACTICS GAME</span></div></section>`;
  if (screen === "squad")
    ui.innerHTML = `<section class="overlay"><div class="screen-inner"><div class="screen-head"><div><div class="eyebrow">Personnel department / requisition 001</div><h2>Pick your trouble.</h2></div>${btn("← Back", "title")}</div><p class="muted">Select five volunteers. Their enthusiasm is legally assumed.</p><div class="squad-grid">${SQUADS.map((s, i) => `<button class="squad-card ${squad === i ? "selected" : ""}" data-squad="${i}" aria-pressed="${squad === i}"><span class="eyebrow">0${i + 1} / ${s.tag}</span><h3>${s.name}</h3><p>${s.description}</p><div class="squad-portraits">${s.classes.map((id) => `<img src="${portrait(id)}" alt="${CLASSES[id].name}">`).join("")}</div></button>`).join("")}</div><div class="seed-row"><label for="seed">Battle seed</label><input id="seed" inputmode="numeric" value="${newSeed()}" aria-label="Battle seed"><span class="muted">Same seed, same opposition. Your orders change the outcome.</span></div><div class="buttons">${btn("Begin operation &nbsp; ↗", "start", "primary")}<span class="tiny muted">Win by knocking down the entire enemy squad.</span></div></div></section>`;
  if (screen === "battle") renderBattle();
  if (screen === "result") renderResult();
  if (settingsOpen) renderSettings();
  wire();
}
function newSeed() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return n[0];
}
function select(id: number | null) {
  issue({ type: "select", id });
  input.clear();
  scene.sfx.play("click");
  renderBattle();
  wire();
}
function renderBattle() {
  tutorial?.update();
  scene.tutorialMarker = tutorial?.marker ?? null;
  const b = scene.battle!;
  const s = b.get(b.selected ?? -1),
    alive = (side: number) =>
      b.soldiers.filter((s) => s.side === side && s.life === "alive").length;
  const time = `${Math.floor(b.time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(b.time % 60)
    .toString()
    .padStart(2, "0")}`;
  ui.innerHTML = `<header class="hud-top"><div class="hud-brand">BRIGADIER BEDLAM<small>${tutorial ? "BOOT CAMP / NO ENEMIES" : "OPERATION: DISPUTED PICNIC"}</small></div><div class="hud-center"><span class="team-count">YOUR SQUAD &nbsp; ${alive(0)}/5</span><span class="clock">${time}</span><span class="team-count enemy">${tutorial ? "NO ENEMIES" : `OPPOSITION &nbsp; ${alive(1)}/5`}</span></div><div class="hud-actions">${btn(`Fire all · ${esc(input.hint("fireAll"))}`, "fire-all", "fire-all")}${btn(scene.sfx.muted ? "Sound off" : "Sound on", "sound")}${btn(`Pause · ${esc(input.hint("pause"))}`, "pause")}${btn(`Menu · ${esc(input.hint("menu"))}`, "menu")}</div></header><div class="radio-log">${b.log
    .slice(0, 2)
    .map((t) => `<div>${esc(t)}</div>`)
    .join(
      "",
    )}</div><div class="battle-help">${s?.brawl !== null && s?.brawl !== undefined ? `BRAWL! ${esc(input.hint("punch"))}: punch · ${esc(input.hint("kick"))}: kick · hold ${esc(input.hint("block"))}: block` : `${esc(input.hint("interact"))}: select / move / attack / demolish / revive &nbsp; · &nbsp; ${esc(input.hint("deselect"))}: deselect`}</div><footer class="hud-bottom"><div class="roster">${b.soldiers
    .filter((t) => t.side === 0)
    .map(
      (t) =>
        `<button class="unit-card ${t.id === b.selected ? "selected" : ""} ${t.life}" data-unit="${t.id}" aria-label="${CLASSES[t.classId].name} slot ${t.slot + 1}, ${t.life}, ${Math.ceil(t.hp)} health"><img alt="" src="${portrait(t.classId)}"><div><div class="slot">${esc(input.hint(`slot${t.slot + 1}` as Action))}</div><div class="unit-name">${CLASSES[t.classId].name}</div><div class="hp"><div style="width:${(t.hp / CLASSES[t.classId].hp) * 100}%"></div></div><div class="unit-status">${unitStatus(t)}</div></div></button>`,
    )
    .join(
      "",
    )}</div><div class="orders"><h3>${s ? CLASSES[s.classId].name : "Awaiting orders"}</h3><p>${s ? `${CLASSES[s.classId].description}<br>Click the bridge for a safe detour. River: ${Math.round(CLASSES[s.classId].waterSpeed * 100)}% speed · ${Math.round(CLASSES[s.classId].drowningRisk * 100)}% drowning risk<br>${esc(input.hint("hold"))}: hold · ${esc(input.hint("medic"))}: medic nearest cursor` : `Select a soldier, then order a move or attack.<br>Unselected soldiers fire at enemies in range.`}</p></div><button class="medic-button" data-do="medic"><span>✚ FIELD MEDICS</span><strong>${b.calls[0]} / ${TUNING.medicCalls} CALLS</strong><span>${esc(input.hint("medic"))} · nearest downed</span></button></footer>`;
  if (tutorial) {
    const [heading, text] = tutorial.copy((a) => input.hint(a));
    ui.insertAdjacentHTML(
      "beforeend",
      `<aside class="tutorial-card" aria-label="Tutorial coach"><div class="eyebrow">BOOT CAMP · ${tutorial.step + 1} / 15</div><h3>${esc(heading)}</h3><p>${esc(text)}</p><div class="tutorial-progress" role="status">${tutorial.complete ? "TRAINING COMPLETE" : tutorial.id === "welcome" ? "READY WHEN YOU ARE" : "Complete the action to continue"}</div><div class="buttons">${tutorial.id === "welcome" ? btn("Begin lesson", "lesson-next", "primary") : tutorial.complete ? btn("Deploy squad", "graduate", "primary") : ""}${btn(tutorial.complete ? "Repeat lesson" : "Restart lesson", "tutorial")}${btn("Exit", "title")}</div></aside>`,
    );
  }
  if (scene.paused && !menuOpen && !settingsOpen)
    ui.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-shade"><section class="modal"><div class="eyebrow">A brief administrative interruption</div><h2>Cease paperwork.</h2><p>Paused. Press ${esc(input.hint("pause"))} to resume.</p><div class="buttons">${btn("Resume operation", "pause", "primary")}${btn("Menu", "menu")}</div></section></div>`,
    );
  if (menuOpen)
    ui.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-shade"><section class="modal"><div class="eyebrow">Command desk</div><h2>At ease, commander.</h2><p>Battle paused. Press ${esc(input.hint("menu"))} to return.<br>Seed ${b.seed} · ${SQUADS[b.squad].name}</p><div class="buttons">${btn("Resume", "resume", "primary")}${btn("Controls", "controls")}${tutorial ? "" : btn("Export replay", "export")}${btn("Retreat to title", "retreat")}</div></section></div>`,
    );
}
function updateBattleHud() {
  const b = scene.battle!,
    s = b.get(b.selected ?? -1);
  const write = (selector: string, value: string) => {
    const el = ui.querySelector(selector);
    if (el && el.textContent !== value) el.textContent = value;
  };
  write(
    ".team-count",
    `YOUR SQUAD   ${b.soldiers.filter((s) => s.side === 0 && s.life === "alive").length}/5`,
  );
  write(
    ".team-count.enemy",
    tutorial
      ? "NO ENEMIES"
      : `OPPOSITION   ${b.soldiers.filter((s) => s.side === 1 && s.life === "alive").length}/5`,
  );
  write(
    ".clock",
    `${Math.floor(b.time / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor(b.time % 60)
      .toString()
      .padStart(2, "0")}`,
  );
  for (const t of b.soldiers.filter((s) => s.side === 0)) {
    const button = ui.querySelector<HTMLButtonElement>(`[data-unit="${t.id}"]`);
    if (!button) continue;
    button.className = `unit-card ${t.id === b.selected ? "selected" : ""} ${t.life}`;
    button.setAttribute(
      "aria-label",
      `${CLASSES[t.classId].name} slot ${t.slot + 1}, ${t.life}, ${Math.ceil(t.hp)} health`,
    );
    const hp = button.querySelector<HTMLElement>(".hp div");
    if (hp) hp.style.width = `${(t.hp / CLASSES[t.classId].hp) * 100}%`;
    write(`[data-unit="${t.id}"] .unit-status`, unitStatus(t));
  }
  write(".fire-all", `Fire all · ${input.hint("fireAll")}`);
  write(".medic-button strong", `${b.calls[0]} / ${TUNING.medicCalls} CALLS`);
  write(
    ".battle-help",
    s?.brawl !== null && s?.brawl !== undefined
      ? `BRAWL! ${input.hint("punch")}: punch · ${input.hint("kick")}: kick · hold ${input.hint("block")}: block`
      : `${input.hint("interact")}: select / move / attack / demolish / revive   ·   ${input.hint("deselect")}: deselect`,
  );
  const log = ui.querySelector(".radio-log"),
    markup = b.log
      .slice(0, 2)
      .map((t) => `<div>${esc(t)}</div>`)
      .join("");
  if (log && log.innerHTML !== markup) log.innerHTML = markup;
}
function unitStatus(t: Soldier) {
  return t.life === "dead"
    ? t.death === "drowned"
      ? "DROWNED"
      : "NO REVIVE"
    : t.life === "down"
      ? "MEDIC NEEDED"
      : t.drowningTime > 0
        ? "DROWNING"
        : scene.battle?.inWater(t)
          ? "CROSSING"
          : t.jam > 0
            ? "JAMMED"
            : t.brawl !== null
              ? "BRAWLING"
              : t.moving
                ? "MOVING"
                : t.hold
                  ? "HOLDING"
                  : "READY";
}

function renderResult() {
  const b = scene.battle!,
    won = b.winner === 0;
  ui.innerHTML = `<div class="modal-shade"><section class="modal"><div class="eyebrow">After-action report / seed ${b.seed}</div><h2>${won ? "Victory.<br>Surprisingly." : "Defeat.<br>Officially a drill."}</h2><p>${won ? "The picnic grounds are yours. Please clean up the craters." : "Your squad has been excused from further heroism."}</p><div class="result-stat"><span>${Math.floor(b.time)}s<br><small>ON DUTY</small></span><span>${b.stats.shots}<br><small>SHOTS FIRED</small></span><span>${b.stats.revives}<br><small>REVIVALS</small></span></div><p class="tiny">${esc(input.hint("menu"))}: return to title</p><div class="buttons">${btn("Back to title", "title", "primary")}${btn("Fight again", "again")}${btn("Export replay", "export")}</div></section></div>`;
}
function action(a: Action, held = true, event?: Event) {
  if (
    event instanceof PointerEvent &&
    (event.target as HTMLElement).tagName === "CANVAS"
  ) {
    const r = (event.target as HTMLCanvasElement).getBoundingClientRect();
    scene.cursor = unproject({
      x: ((event.clientX - r.left) / r.width) * 1280,
      y: ((event.clientY - r.top) / r.height) * 720,
    });
  }
  if (settingsOpen) return;
  if (a === "menu" && held) {
    if (screen === "result") {
      title();
      return;
    }
    if (screen === "battle") {
      menuOpen = !menuOpen;
      scene.paused = menuOpen;
      input.clear();
      render();
    }
    return;
  }
  if (a === "pause" && held && screen === "battle" && !menuOpen) {
    scene.paused = !scene.paused;
    tutorial?.ui(scene.paused ? "pause" : "resume");
    input.clear();
    render();
    return;
  }
  if (a === "block" && !held) {
    const selected = scene.battle?.get(scene.battle.selected ?? -1);
    if (selected && selected.blocking)
      scene.battle?.command({ type: "block", id: selected.id, held: false });
    return;
  }
  if (screen !== "battle" || scene.paused || scene.battle?.winner !== null)
    return;
  const b = scene.battle!,
    s = b.get(b.selected ?? -1);
  if (a === "block") {
    if (s) issue({ type: "block", id: s.id, held });
    return;
  }
  if (!held) return;
  if (a === "punch" || a === "kick") {
    if (s) issue({ type: a, id: s.id });
    return;
  }
  if (a === "fireAll") {
    issue({ type: "fire-all" });
    return;
  }
  if (a === "interact") {
    const near = scene.pick(scene.cursor);
    if (near?.side === 0) {
      if (!("classId" in near)) return;
      if (near.life === "down")
        issue({ type: "medic", target: near.id, side: 0 });
      else select(near.id);
    } else if (s?.life === "alive") {
      if (near?.side === 1)
        issue({ type: "attack", id: s.id, target: near.id });
      else if (b.bridges.some((r) => inside(scene.cursor, r)))
        issue({ type: "bridge", id: s.id, point: { ...scene.cursor } });
      else if (b.cover.some((r) => inside(scene.cursor, r)))
        issue({ type: "demolish", id: s.id, point: { ...scene.cursor } });
      else issue({ type: "move", id: s.id, point: { ...scene.cursor } });
    }
    return;
  }
  if (a === "deselect") {
    select(null);
    return;
  }
  if (a.startsWith("slot")) {
    const soldier = b.soldiers.find(
      (t) =>
        t.side === 0 && t.slot === Number(a.slice(4)) - 1 && t.life === "alive",
    );
    if (soldier) select(soldier.id);
    return;
  }
  if (a === "next" || a === "previous") {
    const living = b.soldiers.filter((t) => t.side === 0 && t.life === "alive"),
      i = living.findIndex((t) => t.id === b.selected);
    if (living.length)
      select(
        living[(i + (a === "next" ? 1 : -1) + living.length) % living.length]
          .id,
      );
    return;
  }
  if (a === "hold" && s) issue({ type: "hold", id: s.id });
  if (a === "medic") {
    const down = scene.nearest(
      scene.cursor,
      (t) => t.side === 0 && t.life === "down",
      Infinity,
    );
    if (down) issue({ type: "medic", target: down.id, side: 0 });
    else b.note("No downed soldier needs a medic.");
  }
}
function startTutorial() {
  tutorial = new Tutorial();
  renderAt = 0;
  screen = "battle";
  menuOpen = false;
  settingsOpen = false;
  input.clear();
  scene.start(tutorial.battle);
  scene.sfx.unlock();
  render();
}
function start(seed: number) {
  tutorial = null;
  scene.tutorialMarker = null;
  renderAt = 0;
  screen = "battle";
  menuOpen = false;
  settingsOpen = false;
  scene.start(new Battle(seed, squad));
  scene.sfx.unlock();
  render();
}
function exportReplay() {
  const blob = new Blob([JSON.stringify(scene.battle!.replay(), null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `bedlam-replay-${scene.battle!.seed}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function wire() {
  ui.querySelectorAll<HTMLButtonElement>("[data-do]").forEach(
    (button) =>
      (button.onclick = () => {
        scene.sfx.unlock();
        const what = button.dataset.do;
        if (what === "tutorial") startTutorial();
        if (what === "lesson-next") {
          tutorial?.advance();
          render();
        }
        if (what === "graduate") {
          tutorial = null;
          scene.tutorialMarker = null;
          scene.paused = true;
          screen = "squad";
          render();
        }
        if (what === "deploy") {
          screen = "squad";
          render();
        }
        if (what === "title") title();
        if (what === "start") {
          const raw = (ui.querySelector("#seed") as HTMLInputElement).value;
          start(Number(raw) >>> 0);
        }
        if (what === "again") start(newSeed());
        if (what === "fire-all") action("fireAll");
        if (what === "pause") action("pause");
        if (what === "menu") action("menu");
        if (what === "resume") {
          menuOpen = false;
          scene.paused = false;
          tutorial?.ui("resume");
          render();
        }
        if (what === "retreat") {
          ui.insertAdjacentHTML(
            "beforeend",
            `<div class="conflict"><section class="modal"><h2>Leave this battle?</h2><p>Your current operation will be lost.</p><div class="buttons">${btn("Keep fighting", "resume", "primary")}${btn("Return to title", "title")}</div></section></div>`,
          );
          wire();
        }
        if (what === "sound") {
          scene.sfx.muted = !scene.sfx.muted;
          render();
        }
        if (what === "medic") action("medic");
        if (what === "controls") {
          tutorial?.ui("settings-open");
          settingsReturn = scene.paused;
          settingsOpen = true;
          scene.paused = true;
          input.clear();
          render();
        }
        if (what === "export") exportReplay();
      }),
  );
  ui.querySelectorAll<HTMLButtonElement>("[data-squad]").forEach(
    (button) =>
      (button.onclick = () => {
        const seed = (ui.querySelector("#seed") as HTMLInputElement)?.value;
        squad = Number(button.dataset.squad);
        render();
        if (seed) (ui.querySelector("#seed") as HTMLInputElement).value = seed;
      }),
  );
  ui.querySelectorAll<HTMLButtonElement>("[data-unit]").forEach(
    (button) =>
      (button.onclick = () => {
        if (scene.paused) return;
        const s = scene.battle!.get(Number(button.dataset.unit))!;
        if (s.life === "alive") select(s.id);
        if (s.life === "down")
          scene.battle!.command({ type: "medic", target: s.id, side: 0 });
      }),
  );
  if (settingsOpen) wireSettings();
}
let capturing: { action: Action; slot: number } | null = null,
  settingsMessage = "";
function renderSettings() {
  const markup = `<section class="settings"><div class="screen-head"><div><div class="eyebrow">Personal equipment / controls</div><h2>Give your own orders.</h2></div><button class="btn secondary" id="close-settings">Done</button></div><p class="settings-note">Click a binding, then press a key or mouse button. Two bindings per action. Battlefield and brawl bindings can overlap.<br>Keys follow physical position. Browser shortcuts are reserved. Esc cancels a change.</p><div class="bindings-scroll">${(
    ["field", "brawl", "global"] as Context[]
  )
    .map(
      (context) =>
        `<div class="context-title">${context === "field" ? "Battlefield" : context === "brawl" ? "Close combat" : "Squad orders & menus"}</div>${(
          Object.keys(ACTIONS) as Action[]
        )
          .filter((a) => ACTIONS[a].context === context)
          .map(
            (a) =>
              `<div class="binding-row"><span>${ACTIONS[a].label}</span>${input.bindings[a].map((code, slot) => `<button data-binding="${a}" data-slot="${slot}" class="${capturing?.action === a && capturing.slot === slot ? "capturing" : ""}">${capturing?.action === a && capturing.slot === slot ? "Press a key / mouse…" : esc(input.label(code))}</button>`).join("")}</div>`,
          )
          .join("")}`,
    )
    .join(
      "",
    )}</div><div class="settings-message" role="status">${esc(settingsMessage)}</div><div class="settings-footer"><span class="tiny muted">Saved automatically in this browser.</span><div class="buttons"><button class="btn secondary" id="left-handed">Left-handed mouse</button><button class="btn secondary" id="reset-bindings">Reset to defaults</button></div></div></section>`;
  ui.insertAdjacentHTML("beforeend", markup);
}
function refreshSettings() {
  const scroll = ui.querySelector(".bindings-scroll")?.scrollTop ?? 0;
  ui.querySelector(".settings")?.remove();
  renderSettings();
  wireSettings();
  const el = ui.querySelector(".bindings-scroll");
  if (el) el.scrollTop = scroll;
}
function wireSettings() {
  ui.querySelector<HTMLButtonElement>("#close-settings")!.onclick = () => {
    settingsOpen = false;
    tutorial?.ui("settings-close");
    capturing = null;
    input.capture = null;
    scene.paused = settingsReturn;
    render();
  };
  ui.querySelector<HTMLButtonElement>("#reset-bindings")!.onclick = () => {
    input.reset();
    settingsMessage = "Default controls restored.";
    capturing = null;
    input.capture = null;
    refreshSettings();
  };
  ui.querySelector<HTMLButtonElement>("#left-handed")!.onclick = () => {
    input.reset(true);
    settingsMessage =
      "Left-handed preset applied. Mouse buttons keep their usual roles.";
    capturing = null;
    input.capture = null;
    refreshSettings();
  };
  ui.querySelectorAll<HTMLButtonElement>("[data-binding]").forEach(
    (button) =>
      (button.onclick = () => {
        capturing = {
          action: button.dataset.binding as Action,
          slot: Number(button.dataset.slot),
        };
        settingsMessage = "Waiting for your new binding…";
        refreshSettings();
        input.capture = (code, error) => {
          if (error) {
            settingsMessage = error;
            refreshSettings();
            return;
          }
          const cap = capturing!;
          input.capture = null;
          capturing = null;
          if (code === null) {
            settingsMessage = "Change cancelled.";
            refreshSettings();
            return;
          }
          const collision = conflicts(input.bindings, cap.action, code);
          if (collision.length) {
            settingsMessage = "Binding conflict — choose whether to swap.";
            refreshSettings();
            ui.querySelector(".settings")!.insertAdjacentHTML(
              "beforeend",
              `<div class="conflict"><section class="modal"><h2>Orders crossed.</h2><p>${esc(input.label(code))} is already used by ${collision.map((o) => esc(ACTIONS[o.action].label)).join(", ")}.</p><div class="buttons"><button class="btn primary" id="swap-binding">Swap bindings</button><button class="btn secondary" id="cancel-swap">Cancel</button></div></section></div>`,
            );
            ui.querySelector<HTMLButtonElement>("#swap-binding")!.onclick =
              () => {
                rebind(input.bindings, cap.action, cap.slot, code, true);
                persistSettings();
              };
            ui.querySelector<HTMLButtonElement>("#cancel-swap")!.onclick =
              () => {
                settingsMessage = "Bindings unchanged.";
                refreshSettings();
              };
          } else {
            rebind(input.bindings, cap.action, cap.slot, code);
            persistSettings();
          }
        };
      }),
  );
}
function persistSettings() {
  settingsMessage = input.persist()
    ? "Binding saved."
    : "Binding changed for this session; browser storage is unavailable.";
  refreshSettings();
}
scene.onTick = () => {
  if (screen !== "battle") return;
  if (scene.battle?.winner !== null) {
    input.clear();
    if (renderAt !== scene.battle!.time) {
      renderAt = scene.battle!.time;
      updateBattleHud();
    }
    if (!scene.victory.complete) return;
    screen = "result";
    scene.paused = true;
    input.clear();
    render();
    return;
  }
  if (tutorial?.update()) {
    scene.tutorialMarker = tutorial.marker;
    renderBattle();
    wire();
  }
  if (scene.battle!.time - renderAt > 0.2) {
    renderAt = scene.battle!.time;
    updateBattleHud();
  }
};
document.addEventListener(
  "pointerdown",
  (e) => {
    if ((e.target as HTMLElement).tagName === "CANVAS") {
      const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
      scene.cursor = unproject({
        x: ((e.clientX - r.left) / r.width) * 1280,
        y: ((e.clientY - r.top) / r.height) * 720,
      });
    }
  },
  true,
);
window.addEventListener("blur", () => {
  if (screen === "battle" && !scene.paused) {
    scene.paused = true;
    render();
  }
});
window.addEventListener("bindinglabels", () => {
  if (!settingsOpen) render();
  else refreshSettings();
});
// Read-only inspection in development helps browser QA without changing simulation rules.
if (import.meta.env.DEV)
  Object.defineProperty(window, "bedlam", {
    value: {
      get battle() {
        return scene.battle;
      },
      scene,
      input,
      get screen() {
        return screen;
      },
      game,
    },
  });
scene.onReady = () => render();
