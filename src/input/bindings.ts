export type Context = "field" | "brawl" | "global";
export const ACTIONS = {
  interact: { label: "Select / move / attack / revive", context: "field" },
  deselect: { label: "Deselect soldier", context: "field" },
  slot1: { label: "Select squad slot 1", context: "field" },
  slot2: { label: "Select squad slot 2", context: "field" },
  slot3: { label: "Select squad slot 3", context: "field" },
  slot4: { label: "Select squad slot 4", context: "field" },
  slot5: { label: "Select squad slot 5", context: "field" },
  previous: { label: "Previous living soldier", context: "field" },
  next: { label: "Next living soldier", context: "field" },
  medic: { label: "Medic nearest cursor", context: "field" },
  cover: { label: "Take / leave cover", context: "field" },
  hold: { label: "Hold position", context: "field" },
  rocketFire: { label: "Fire selected rocket at cursor", context: "field" },
  fireAll: { label: "Fire all stationary soldiers", context: "global" },
  punch: { label: "Punch", context: "brawl" },
  kick: { label: "Kick", context: "brawl" },
  block: { label: "Block (hold)", context: "brawl" },
  pause: { label: "Pause / resume", context: "global" },
  menu: { label: "Open / close menu", context: "global" },
} satisfies Record<string, { label: string; context: Context }>;
export type Action = keyof typeof ACTIONS;
export type Bindings = Record<Action, (string | null)[]>;
export const STORAGE_KEY = "brigadier-bedlam.bindings.v1";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const KEYS =
  /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Numpad(Add|Subtract|Multiply|Divide|Decimal|Enter)|Arrow(Up|Down|Left|Right)|Space|Escape|Shift(Left|Right)|Enter|Backspace|Delete|Insert|Home|End|Page(Up|Down)|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|Minus|Equal|Backquote|CapsLock|F[1-4]|F[6-9]|F10|F12|Mouse[0-4])$/;
export const validBinding = (code: string) => KEYS.test(code);
export function defaults(leftHanded = false): Bindings {
  const raw: Record<Action, string> = {
    interact: "Mouse0",
    deselect: "Mouse2",
    slot1: "Digit1",
    slot2: "Digit2",
    slot3: "Digit3",
    slot4: "Digit4",
    slot5: "Digit5",
    previous: "KeyQ",
    next: "KeyE",
    medic: "KeyR",
    hold: "KeyF",
    cover: "KeyC",
    fireAll: "KeyG",
    rocketFire: "KeyT",
    punch: "Mouse0",
    kick: "Mouse2",
    block: "ShiftLeft",
    pause: "Space",
    menu: "Escape",
  };
  if (leftHanded)
    Object.assign(raw, {
      slot1: "Digit6",
      slot2: "Digit7",
      slot3: "Digit8",
      slot4: "Digit9",
      slot5: "Digit0",
      previous: "KeyU",
      next: "KeyO",
      medic: "KeyP",
      hold: "KeyJ",
      cover: "KeyK",
      fireAll: "KeyH",
      rocketFire: "KeyL",
      block: "ShiftRight",
    });
  return Object.fromEntries(
    Object.entries(raw).map(([a, b]) => [a, [b, null]]),
  ) as Bindings;
}
export function conflicts(
  bindings: Bindings,
  action: Action,
  code: string,
): { action: Action; slot: number }[] {
  return (Object.keys(ACTIONS) as Action[]).flatMap((a) => {
    const ca = ACTIONS[a].context,
      cb = ACTIONS[action].context;
    return a !== action && (ca === cb || ca === "global" || cb === "global")
      ? bindings[a].flatMap((b, slot) =>
          b === code ? [{ action: a, slot }] : [],
        )
      : [];
  });
}
export function loadBindings(storage: StorageLike): Bindings {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (!raw || typeof raw !== "object") return defaults();
    // Upgrade pre-Fire-all saves without discarding a player's custom controls.
    if (!("fireAll" in raw)) {
      const preferred = raw.hold?.includes?.("KeyJ") ? "KeyH" : "KeyG";
      const candidates = [
        preferred,
        ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"
          .split("")
          .filter((k) => !"WASD".includes(k))
          .map((k) => `Key${k}`),
        ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
        ...Array.from({ length: 5 }, (_, i) => `Mouse${i}`),
        "F1",
        "F2",
        "F3",
        "F4",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "F12",
      ];
      const available = candidates.find(
        (code) =>
          !Object.values(raw).some(
            (value) => Array.isArray(value) && value.includes(code),
          ),
      );
      raw.fireAll = [available ?? preferred, null];
    }
    if (!("rocketFire" in raw)) {
      const preferred = raw.hold?.includes?.("KeyJ") ? "KeyL" : "KeyT";
      const key = [
        preferred,
        ..."BCIJKLMNOPRTUVXYZ".split("").map((k) => `Key${k}`),
        "F6",
        "F7",
      ].find(
        (code) =>
          !Object.values(raw).some(
            (value) => Array.isArray(value) && value.includes(code),
          ),
      );
      raw.rocketFire = [key ?? preferred, null];
    }
    if (!("cover" in raw)) {
      const preferred = raw.hold?.includes?.("KeyJ") ? "KeyK" : "KeyC";
      const key = [
        preferred,
        ..."BCIJKLMNOPRTUVXYZ".split("").map((k) => `Key${k}`),
        "F6",
        "F7",
      ].find(
        (code) =>
          !Object.values(raw).some(
            (value) => Array.isArray(value) && value.includes(code),
          ),
      );
      raw.cover = [key ?? preferred, null];
    }
    for (const a of Object.keys(ACTIONS) as Action[]) {
      if (
        !Array.isArray(raw[a]) ||
        raw[a].length !== 2 ||
        !raw[a].some((v: unknown) => typeof v === "string") ||
        raw[a].some(
          (b: unknown) =>
            b !== null && (typeof b !== "string" || !validBinding(b)),
        )
      )
        return defaults();
      if (raw[a][0] !== null && raw[a][0] === raw[a][1]) return defaults();
    }
    for (const a of Object.keys(ACTIONS) as Action[])
      for (const code of raw[a])
        if (code && conflicts(raw, a, code).length) return defaults();
    return Object.fromEntries(
      (Object.keys(ACTIONS) as Action[]).map((a) => [a, [...raw[a]]]),
    ) as Bindings;
  } catch {
    return defaults();
  }
}
export function saveBindings(storage: StorageLike, bindings: Bindings) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(bindings));
    return true;
  } catch {
    return false;
  }
}
export function rebind(
  bindings: Bindings,
  action: Action,
  slot: number,
  code: string,
  swap = false,
) {
  if (!validBinding(code)) return false;
  const others = conflicts(bindings, action, code);
  if (others.length && !swap) return false;
  let old = bindings[action][slot];
  if (others.length && old === null) {
    const otherSlot = slot === 0 ? 1 : 0;
    old = bindings[action][otherSlot];
    bindings[action][otherSlot] = null;
  }
  for (const other of others) bindings[other.action][other.slot] = old;
  const same = bindings[action].indexOf(code);
  if (same !== -1 && same !== slot) bindings[action][same] = old;
  bindings[action][slot] = code;
  return true;
}
export class InputLayer {
  bindings: Bindings;
  layout = new Map<string, string>();
  held = new Set<string>();
  capture: ((code: string | null, error?: string) => void) | null = null;
  constructor(
    private storage: StorageLike,
    private context: () => Context,
    private trigger: (action: Action, held: boolean, event?: Event) => void,
  ) {
    this.bindings = loadBindings(storage);
    const keyboard = (
      navigator as Navigator & {
        keyboard?: { getLayoutMap(): Promise<Map<string, string>> };
      }
    ).keyboard;
    keyboard
      ?.getLayoutMap()
      .then((map) => {
        this.layout = new Map(map);
        window.dispatchEvent(new Event("bindinglabels"));
      })
      .catch(() => {});
    window.addEventListener("keydown", (e) => this.key(e, true));
    window.addEventListener("keyup", (e) => this.key(e, false));
    window.addEventListener("blur", () => this.clear());
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType !== "mouse") return;
        if (this.capture) {
          e.preventDefault();
          e.stopPropagation();
          this.capture(`Mouse${e.button}`);
          return;
        }
        if ((e.target as HTMLElement).tagName === "CANVAS")
          this.raw(`Mouse${e.button}`, true, e);
      },
      true,
    );
    document.addEventListener("pointerup", (e) => {
      if (this.held.has(`Mouse${e.button}`))
        this.raw(`Mouse${e.button}`, false, e);
    });
    document
      .querySelector("#app")!
      .addEventListener("contextmenu", (e) => e.preventDefault());
  }
  key(e: KeyboardEvent, down: boolean) {
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey)
      this.layout.set(e.code, e.key);
    if (this.capture) {
      if (!down) return;
      e.preventDefault();
      if (e.code === "Escape") {
        this.capture(null);
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey || !validBinding(e.code)) {
        this.capture(
          e.code,
          "That key is reserved by the browser. Choose another.",
        );
        return;
      }
      this.capture(e.code);
      return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey || !validBinding(e.code)) return;
    if ((e.target as HTMLElement)?.matches("input,textarea,select")) return;
    if (down && e.repeat) return;
    this.raw(e.code, down, e);
  }
  raw(code: string, down: boolean, e?: Event) {
    const context = this.context();
    const actions = (Object.keys(ACTIONS) as Action[]).filter(
      (a) =>
        (ACTIONS[a].context === context || ACTIONS[a].context === "global") &&
        this.bindings[a].includes(code),
    );
    if (actions.length) e?.preventDefault();
    if (down) this.held.add(code);
    else this.held.delete(code);
    for (const action of actions)
      if (down || action === "block") this.trigger(action, down, e);
  }
  clear() {
    this.held.clear();
    this.trigger("block", false);
  }
  reset(left = false) {
    this.bindings = defaults(left);
    this.persist();
  }
  persist() {
    return saveBindings(this.storage, this.bindings);
  }
  label(code: string | null) {
    if (!code) return "+ Add";
    if (code.startsWith("Mouse"))
      return [
        "Left mouse",
        "Middle mouse",
        "Right mouse",
        "Mouse 4",
        "Mouse 5",
      ][Number(code.slice(5))];
    if (code === "Space") return "Space";
    if (code === "Escape") return "Esc";
    if (code.startsWith("Shift"))
      return code === "ShiftLeft" ? "Left Shift" : "Right Shift";
    const own = this.layout.get(code);
    if (own) return own.length === 1 ? own.toUpperCase() : own;
    return code
      .replace(/^Key|^Digit/, "")
      .replace("Arrow", "")
      .replace("Numpad", "Num ");
  }
  hint(action: Action) {
    return this.bindings[action]
      .filter(Boolean)
      .map((c) => this.label(c))
      .join(" / ");
  }
}
