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
  airstrike(kind: "warning" | "drop" | "impact") {
    if (this.muted || !this.context || this.context.state !== "running") return;
    if (kind === "warning") {
      for (let i = 0; i < 3; i++)
        this.tone(440, 880, 0.22, "sawtooth", 0.07, i * 0.28);
      this.hiss(1.5, 0.065, 750);
    } else if (kind === "drop") {
      this.tone(1500, 150, 1.25, "triangle", 0.09);
      this.hiss(1.2, 0.05, 2300);
    } else {
      for (let i = 0; i < 4; i++) {
        this.tone(80 - i * 8, 22, 0.65, "sine", 0.14, i * 0.12);
        this.hiss(0.65, 0.13, 1800, i * 0.12);
      }
    }
  }
  weapon(classId: CombatEvent["classId"], kind: CombatEvent["kind"]) {
    if (this.muted || !this.context || this.context.state !== "running") return;
    if (classId === "sniper") {
      // Global report for either squad: sharp crack, heavy body, two distant echoes.
      // Bypass the ordinary volley throttle so simultaneous sniper shots both sound.
      if (kind !== "fire") return;
      this.hiss(0.16, 0.48, 9500);
      this.tone(155, 32, 0.48, "sine", 0.24);
      this.tone(720, 90, 0.095, "sawtooth", 0.09);
      this.hiss(0.42, 0.14, 3600, 0.16);
      this.hiss(0.5, 0.075, 2200, 0.38);
      this.tone(1450, 600, 0.055, "triangle", 0.045, 0.68);
      return;
    }
    const ctx = this.context,
      key = `${classId}:${kind}`;
    if (ctx.currentTime - (this.last.get(key) ?? -1) < 0.065) return;
    this.last.set(key, ctx.currentTime);
    if (classId === "bazooka" && kind === "fire") {
      // Heavy launch concussion, low growl and a sustained tearing exhaust roar.
      // Separate from the existing two-note contact cue and the sniper's sharp crack.
      this.tone(125, 26, .52, "sine", .23);
      this.tone(68, 22, .42, "triangle", .12);
      this.tone(170, 40, .22, "sawtooth", .065, .015);
      this.hiss(.085, .26, 4800);
      this.hiss(.5, .25, 1900, .025);
      this.hiss(.24, .09, 3400, .025);
      return;
    }
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
  deployment(seconds: number) {
    if (this.muted || !this.context || this.context.state !== "running") return;
    if (seconds === 0) {
      // An ascending start call, distinct from ticks and combat hit confirmations.
      this.tone(440, 440, 0.12, "square", 0.065);
      this.tone(554, 554, 0.12, "square", 0.06, 0.13);
      this.tone(740, 740, 0.25, "triangle", 0.075, 0.26);
      this.tone(120, 48, 0.18, "sine", 0.06);
    } else if (seconds <= 3) {
      this.tone(980, 880, 0.08, "square", 0.045);
      this.tone(980, 880, 0.065, "square", 0.035, 0.13);
    } else {
      this.tone(620, 540, 0.08, "triangle", 0.05);
    }
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
