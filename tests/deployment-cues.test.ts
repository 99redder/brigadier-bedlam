import { describe, expect, it } from "vitest";
import { Battle } from "../src/sim/battle";
import { DeploymentCues } from "../src/view/deployment-cues";

describe("deployment audio timing", () => {
  it("ticks once per displayed second and plays GO once at the actual release", () => {
    const b = new Battle(42, 0, false, 10),
      cues = new DeploymentCues();
    cues.reset(b.planning);
    const played: number[] = [];
    for (let i = 0; i < 330; i++) {
      const cue = cues.poll(b.countdown);
      if (cue !== null) played.push(cue);
      b.step();
    }
    expect(played).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(cues.poll(0)).toBeNull();
  });
  it("does not repeat ticks when paused/resumed or when frames show the same count", () => {
    const cues = new DeploymentCues();
    cues.reset(true);
    expect(cues.poll(10)).toBe(10);
    for (let i = 0; i < 300; i++) expect(cues.poll(10)).toBeNull();
    expect(cues.poll(9)).toBe(9);
  });
  it("resets for each new match and remains silent in boot camp or without deployment", () => {
    const cues = new DeploymentCues();
    cues.reset(new Battle(42, 0, true, 10).planning);
    expect(cues.poll(0)).toBeNull();
    cues.reset(false);
    expect(cues.poll(0)).toBeNull();
    for (let match = 0; match < 2; match++) {
      cues.reset(true);
      expect(cues.poll(10)).toBe(10);
      expect(cues.poll(0)).toBe(0);
      expect(cues.poll(0)).toBeNull();
    }
  });
  it("never queues a burst of stale ticks after a skipped frame or unmuting", () => {
    const cues = new DeploymentCues();
    cues.reset(true);
    cues.poll(10); // consumed while the audio output is muted
    expect(cues.poll(10)).toBeNull();
    expect(cues.poll(3)).toBe(3);
    expect(cues.poll(3)).toBeNull();
    expect(cues.poll(0)).toBe(0);
  });
});
