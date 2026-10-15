import { describe, it, expect } from "vitest";
import {
  defaults,
  loadBindings,
  saveBindings,
  rebind,
  conflicts,
  validBinding,
  STORAGE_KEY,
  type StorageLike,
} from "../src/input/bindings";
function store(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
  };
}
describe("input bindings", () => {
  it("loads defaults with WASD unbound", () => {
    const b = loadBindings(store());
    expect(b).toEqual(defaults());
    expect(Object.values(b).flat()).not.toContain("KeyW");
    expect(b.interact[0]).toBe("Mouse0");
  });
  it("rebinds, persists and reloads an alternate mouse binding", () => {
    const s = store(),
      b = defaults();
    expect(rebind(b, "medic", 1, "Mouse3")).toBe(true);
    saveBindings(s, b);
    expect(loadBindings(s).medic).toEqual(["KeyR", "Mouse3"]);
  });
  it("detects conflicts within a context and offers a swap", () => {
    const b = defaults();
    expect(conflicts(b, "hold", "KeyR")).toEqual([
      { action: "medic", slot: 0 },
    ]);
    expect(rebind(b, "hold", 0, "KeyR")).toBe(false);
    expect(rebind(b, "hold", 0, "KeyR", true)).toBe(true);
    expect(b.medic[0]).toBe("KeyF");
    expect(b.hold[0]).toBe("KeyR");
  });
  it("permits the same mouse button in different contexts", () => {
    expect(conflicts(defaults(), "punch", "Mouse0")).toEqual([]);
  });
  it("global actions conflict with either combat context", () => {
    expect(conflicts(defaults(), "pause", "Mouse0")).toHaveLength(2);
  });
  it("alternate slot swaps retain a valid binding for both actions", () => {
    const s = store(),
      b = defaults();
    expect(rebind(b, "hold", 1, "KeyR", true)).toBe(true);
    saveBindings(s, b);
    expect(loadBindings(s)).toEqual(b);
    expect(b.medic[0]).toBe("KeyF");
  });
  for (const value of ["{", "null", "{}", '{"interact":["KeyW"]}'])
    it(`invalid saved data falls back silently: ${value}`, () => {
      const s = store();
      s.setItem(STORAGE_KEY, value);
      expect(loadBindings(s)).toEqual(defaults());
    });
  it("rejects saved conflicts and browser-reserved keys", () => {
    const s = store(),
      b = defaults();
    b.hold[0] = "KeyR";
    saveBindings(s, b);
    expect(loadBindings(s)).toEqual(defaults());
    for (const code of [
      "F5",
      "F11",
      "Tab",
      "ControlLeft",
      "AltLeft",
      "MetaLeft",
      "fake",
    ])
      expect(validBinding(code)).toBe(false);
  });
  it("left-handed preset mirrors keyboard positions", () => {
    const b = defaults(true);
    expect(b.slot1[0]).toBe("Digit6");
    expect(b.slot5[0]).toBe("Digit0");
    expect(b.medic[0]).toBe("KeyP");
    expect(b.block[0]).toBe("ShiftRight");
  });
  it("storage failure is tolerated", () => {
    const s: StorageLike = {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    };
    expect(loadBindings(s)).toEqual(defaults());
    expect(saveBindings(s, defaults())).toBe(false);
  });
});

describe("Fire all bindings and saved-control upgrades", () => {
  it("has keyboard defaults, alternate mouse support, and a mirrored preset", () => {
    expect(defaults().fireAll).toEqual(["KeyG", null]);
    expect(defaults(true).fireAll).toEqual(["KeyH", null]);
    const s = store(),
      b = defaults();
    expect(rebind(b, "fireAll", 1, "Mouse4")).toBe(true);
    expect(rebind(b, "fireAll", 0, "KeyB")).toBe(true);
    saveBindings(s, b);
    expect(loadBindings(s).fireAll).toEqual(["KeyB", "Mouse4"]);
    expect(conflicts(b, "hold", "KeyB")).toEqual([
      { action: "fireAll", slot: 0 },
    ]);
  });
  it("preserves old customized controls and finds a free key when G is occupied", () => {
    const s = store(),
      old = defaults() as Partial<ReturnType<typeof defaults>>;
    delete old.fireAll;
    old.hold = ["KeyG", "Mouse3"];
    old.medic = ["KeyB", null];
    s.setItem(STORAGE_KEY, JSON.stringify(old));
    const upgraded = loadBindings(s);
    expect(upgraded.hold).toEqual(["KeyG", "Mouse3"]);
    expect(upgraded.medic).toEqual(["KeyB", null]);
    expect(upgraded.fireAll[0]).not.toBe("KeyG");
    expect(conflicts(upgraded, "fireAll", upgraded.fireAll[0]!)).toEqual([]);
    expect(["KeyW", "KeyA", "KeyS", "KeyD"]).not.toContain(upgraded.fireAll[0]);
    saveBindings(s, upgraded);
    expect(loadBindings(s)).toEqual(upgraded);
  });
});

describe("manual rocket controls", () => {
  it("offers normal and mirrored defaults", () => {
    expect(defaults().rocketFire[0]).toBe("KeyT");
    expect(defaults(true).rocketFire[0]).toBe("KeyL");
  });
  it("preserves saved controls when the new default is occupied", () => {
    const s = store(),
      old = defaults() as Partial<ReturnType<typeof defaults>>;
    delete old.rocketFire;
    old.hold = ["KeyT", null];
    s.setItem(STORAGE_KEY, JSON.stringify(old));
    const upgraded = loadBindings(s);
    expect(upgraded.hold[0]).toBe("KeyT");
    expect(upgraded.rocketFire[0]).not.toBe("KeyT");
    expect(conflicts(upgraded, "rocketFire", upgraded.rocketFire[0]!)).toEqual(
      [],
    );
  });
});

describe("take-cover controls", () => {
  it("has rebindable standard and mirrored keys", () => {
    expect(defaults().cover[0]).toBe("KeyC");
    expect(defaults(true).cover[0]).toBe("KeyK");
    const b = defaults();
    expect(rebind(b, "cover", 1, "Mouse4")).toBe(true);
  });
  it("preserves existing saves and selects a free key if C is occupied", () => {
    const s = store(),
      old = defaults() as Partial<ReturnType<typeof defaults>>;
    delete old.cover;
    old.hold = ["KeyC", null];
    s.setItem(STORAGE_KEY, JSON.stringify(old));
    const b = loadBindings(s);
    expect(b.hold[0]).toBe("KeyC");
    expect(b.cover[0]).not.toBe("KeyC");
    expect(conflicts(b, "cover", b.cover[0]!)).toEqual([]);
  });
});

it("adds a facing binding without losing custom controls or taking an occupied key", () => {
  const storage = store();
  const old = defaults() as unknown as Record<string, (string | null)[]>;
  delete old.face;
  old.hold = ["KeyV", null];
  storage.setItem(STORAGE_KEY, JSON.stringify(old));
  const upgraded = loadBindings(storage);
  expect(upgraded.hold).toEqual(["KeyV", null]);
  expect(upgraded.face[0]).not.toBe("KeyV");
  expect(upgraded.interact).toEqual(old.interact);
});
