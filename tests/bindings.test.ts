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
