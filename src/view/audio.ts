import type { CombatEvent } from "../sim/battle";
import type { ClassId } from "../sim/data";
// Synthesized sound identities; no external samples or simulation RNG are used.
export const WEAPON_AUDIO: Record<
  ClassId,
  {
    frequency: number;
    end: number;
    duration: number;
    wave: OscillatorType;
    noise: number;
    filter: number;
  }
> = {
  rifleman: {
    frequency: 190,
    end: 75,
    duration: 0.075,
    wave: "square",
    noise: 0.065,
    filter: 2400,
  },
  bazooka: {
    frequency: 105,
    end: 35,
    duration: 0.38,
    wave: "sawtooth",
    noise: 0.09,
    filter: 700,
  },
  lobber: {
    frequency: 820,
    end: 440,
    duration: 0.13,
    wave: "triangle",
    noise: 0.014,
    filter: 3300,
  },
  torch: {
    frequency: 65,
    end: 48,
    duration: 0.32,
    wave: "sawtooth",
    noise: 0.1,
    filter: 1100,
  },
  sapper: {
    frequency: 1700,
    end: 1000,
    duration: 0.55,
    wave: "triangle",
    noise: 0.055,
    filter: 5200,
  },
};
export class Sound {
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<string, number>();
  muted = false;
  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
      if (!this.noise) {
        this.noise = this.context.createBuffer(
          1,
          this.context.sampleRate,
          this.context.sampleRate,
        );
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++)
          samples[i] = Math.random() * 2 - 1;
      }
    } catch {
      /* Audio is optional on browsers that reject it. */
    }
  }
  private tone(
    frequency: number,
    end: number,
    duration: number,
    wave: OscillatorType,
    gain: number,
    delay = 0,
  ) {
    const ctx = this.context!,
      now = ctx.currentTime + delay,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(frequency, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(now);
    o.stop(now + duration + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  private hiss(duration: number, gain: number, filter: number, delay = 0) {
    if (!this.noise) return;
    const ctx = this.context!,
      now = ctx.currentTime + delay,
      n = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    n.buffer = this.noise;
    f.type = "lowpass";
    f.frequency.setValueAtTime(filter, now);
    f.frequency.exponentialRampToValueAtTime(
      Math.max(180, filter * 0.35),
      now + duration,
    );
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    n.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    n.start(now);
    n.stop(now + duration + 0.02);
    n.onended = () => {
      n.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  weapon(classId: ClassId, kind: CombatEvent["kind"]) {
    if (this.muted || !this.context || this.context.state !== "running") return;
    const ctx = this.context,
      key = `${classId}:${kind}`;
    if (ctx.currentTime - (this.last.get(key) ?? -1) < 0.065) return;
    this.last.set(key, ctx.currentTime);
    if (kind === "hit") {
      // Rocket contact: a chunky crack/boom with a bright two-note confirmation.
      // Keep a separate throttle key so a nearby miss cannot suppress this cue.
      this.tone(125, 28, 0.4, "sine", 0.11);
      this.hiss(0.35, 0.12, 1800);
      this.tone(680, 480, 0.09, "triangle", 0.055, 0.025);
      this.tone(980, 740, 0.12, "triangle", 0.05, 0.115);
      return;
    }
    if (kind === "impact") {
      if (classId === "rifleman" || classId === "torch") return;
      const dynamite = classId === "sapper",
        rocket = classId === "bazooka";
      this.tone(
        dynamite ? 75 : rocket ? 95 : 150,
        25,
        dynamite ? 0.65 : 0.38,
        "sine",
        dynamite ? 0.14 : 0.085,
      );
      this.hiss(
        dynamite ? 0.75 : rocket ? 0.45 : 0.24,
        dynamite ? 0.16 : 0.1,
        dynamite ? 1200 : rocket ? 900 : 2300,
      );
      return;
    }
    const p = WEAPON_AUDIO[classId];
    this.tone(
      p.frequency,
      p.end,
      p.duration,
      p.wave,
      classId === "sapper" ? 0.018 : 0.045,
    );
    this.hiss(p.duration, p.noise, p.filter);
    if (classId === "rifleman") {
      this.tone(165, 60, 0.055, "square", 0.03, 0.055);
      this.hiss(0.055, 0.04, 2700, 0.055);
    }
    if (classId === "lobber") this.tone(540, 390, 0.07, "sine", 0.035, 0.075);
  }
  melee(kind: "punch" | "kick", blocked: boolean) {
    if (this.muted || !this.context || this.context.state !== "running") return;
    const now = this.context.currentTime;
    if (now - (this.last.get("melee") ?? -1) < 0.06) return;
    this.last.set("melee", now);
    this.tone(
      blocked ? 230 : kind === "kick" ? 75 : 145,
      blocked ? 130 : 40,
      0.14,
      "triangle",
      blocked ? 0.025 : 0.065,
    );
    this.hiss(
      blocked ? 0.06 : 0.12,
      blocked ? 0.035 : 0.07,
      blocked ? 1700 : 650,
    );
  }
  play(kind: "revive" | "brawl" | "click") {
    if (this.muted || !this.context || this.context.state !== "running") return;
    this.tone(
      kind === "revive" ? 620 : kind === "brawl" ? 110 : 360,
      kind === "revive" ? 1100 : 40,
      0.15,
      "square",
      0.035,
    );
    if (kind === "brawl") this.hiss(0.12, 0.065, 650);
  }
}
