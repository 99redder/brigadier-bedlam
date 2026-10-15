import { describe, expect, it } from "vitest";
import { interpolatePoint } from "../src/view/motion";

describe("render-only movement interpolation", () => {
  it("draws between fixed simulation positions without changing either", () => {
    const previous = Object.freeze({ x: 10, y: 40 });
    const current = Object.freeze({ x: 30, y: 20 });
    expect(interpolatePoint(current, previous, 0)).toEqual(previous);
    expect(interpolatePoint(current, previous, 0.25)).toEqual({ x: 15, y: 35 });
    expect(interpolatePoint(current, previous, 1)).toEqual(current);
    expect(current).toEqual({ x: 30, y: 20 });
    expect(previous).toEqual({ x: 10, y: 40 });
  });
  it("clamps late frames so troops cannot visually overshoot", () => {
    expect(interpolatePoint({ x: 20, y: 40 }, { x: 0, y: 0 }, 2)).toEqual({ x: 20, y: 40 });
    expect(interpolatePoint({ x: 20, y: 40 }, { x: 0, y: 0 }, -1)).toEqual({ x: 0, y: 0 });
  });
  it("places newly spawned units at their actual position", () => {
    const current = { x: 10, y: 20 };
    const result = interpolatePoint(current, undefined, 0.5);
    expect(result).toEqual(current);
    expect(result).not.toBe(current);
  });
});
