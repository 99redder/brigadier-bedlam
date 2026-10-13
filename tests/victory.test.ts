import { describe, expect, it } from "vitest";
import {
  isCelebrating,
  VictoryClock,
  VICTORY_SECONDS,
} from "../src/view/victory";

describe("post-battle celebrations", () => {
  it("includes only living members of the winning team, for either winner", () => {
    for (const winner of [0, 1]) {
      expect(
        isCelebrating({ life: "alive", side: winner as 0 | 1 }, winner),
      ).toBe(true);
      expect(
        isCelebrating({ life: "alive", side: (1 - winner) as 0 | 1 }, winner),
      ).toBe(false);
      for (const life of ["down", "dead"] as const)
        expect(isCelebrating({ life, side: winner as 0 | 1 }, winner)).toBe(
          false,
        );
    }
    expect(isCelebrating({ life: "alive", side: 0 }, null)).toBe(false);
  });
  it("delays results for the full celebration and freezes during pause", () => {
    const clock = new VictoryClock();
    clock.advance(60, null, false);
    expect(clock.elapsed).toBe(0);
    clock.advance(1, 0, false);
    clock.advance(30, 0, true);
    expect(clock.elapsed).toBe(1);
    expect(clock.complete).toBe(false);
    clock.advance(VICTORY_SECONDS - 1 - 0.01, 0, false);
    expect(clock.complete).toBe(false);
    clock.advance(0.02, 0, false);
    expect(clock.complete).toBe(true);
    clock.reset();
    expect(clock.elapsed).toBe(0);
    expect(clock.complete).toBe(false);
    clock.advance(VICTORY_SECONDS, 1, false);
    expect(clock.complete).toBe(true);
  });
});
