import Phaser from "phaser";
import { CLASSES, type ClassId } from "../sim/data";
// All placeholder art lives here. Replace generated textures with atlas frames later.
export const assetKey = (classId: ClassId, side: number) =>
  `soldier-${classId}-${side}`;
export function loadAssets(scene: Phaser.Scene) {
  for (const classId of Object.keys(CLASSES) as ClassId[])
    for (const side of [0, 1]) {
      const key = assetKey(classId, side);
      if (scene.textures.exists(key)) continue;
      const canvas = document.createElement("canvas");
      canvas.width = 80;
      canvas.height = 96;
      const c = canvas.getContext("2d")!;
      const outline = "#26332c",
        team = side === 0 ? "#658b78" : "#c47355",
        accent = `#${CLASSES[classId].color.toString(16).padStart(6, "0")}`;
      const shape = (
        x: number,
        y: number,
        w: number,
        h: number,
        color: string,
        r = 4,
      ) => {
        c.fillStyle = color;
        c.strokeStyle = outline;
        c.lineWidth = 3;
        c.beginPath();
        c.roundRect(x, y, w, h, r);
        c.fill();
        c.stroke();
      };
      shape(23, 65, 13, 20, team);
      shape(42, 65, 13, 20, team);
      shape(20, 80, 19, 8, outline);
      shape(41, 80, 19, 8, outline);
      if (classId === "torch") {
        shape(10, 38, 16, 31, "#9b9273", 7);
        shape(12, 41, 12, 6, accent);
      }
      shape(23, 38, 32, 32, team, 8);
      shape(25, 47, 28, 9, accent, 2);
      shape(19, 39, 12, 24, team, 6);
      shape(50, 38, 12, 25, team, 6);
      shape(23, 14, 31, 28, "#eac8a0", 10);
      shape(21, 6, 35, 19, team, 12);
      shape(17, 20, 44, 6, team, 3);
      c.fillStyle = "#fff2d5";
      c.fillRect(37, 8, 8, 5);
      c.fillStyle = outline;
      c.fillRect(35, 28, 3, 4);
      c.fillRect(47, 28, 3, 4);
      c.fillStyle = "#b46d50";
      c.fillRect(46, 34, 10, 4);
      if (classId === "rifleman") {
        shape(38, 50, 35, 8, "#596059", 2);
        shape(51, 57, 7, 9, outline, 1);
        c.fillStyle = accent;
        c.fillRect(68, 50, 6, 6);
      }
      if (classId === "bazooka") {
        shape(33, 38, 43, 13, "#8d9976", 4);
        shape(29, 36, 10, 17, "#445748", 2);
        c.fillStyle = outline;
        c.beginPath();
        c.arc(73, 44, 4, 0, 7);
        c.fill();
      }
      if (classId === "lobber") {
        shape(49, 47, 16, 17, "#849270", 7);
        c.fillStyle = outline;
        c.fillRect(54, 41, 5, 7);
        shape(32, 57, 9, 10, accent, 2);
      }
      if (classId === "torch") {
        shape(42, 50, 32, 8, "#887965", 3);
        c.strokeStyle = outline;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(13, 67);
        c.quadraticCurveTo(34, 85, 51, 58);
        c.stroke();
      }
      if (classId === "sapper") {
        shape(47, 49, 7, 22, "#d87356", 2);
        shape(56, 46, 7, 22, "#d87356", 2);
        c.strokeStyle = "#eec57c";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(59, 46);
        c.quadraticCurveTo(65, 32, 72, 43);
        c.stroke();
        shape(26, 58, 20, 10, "#ae8c56", 2);
      }
      scene.textures.addCanvas(key, canvas);
    }
  for (const kind of ["skeleton", "ash", "medic"]) {
    if (scene.textures.exists(kind)) continue;
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 96;
    const c = canvas.getContext("2d")!;
    c.strokeStyle = "#ece6c9";
    c.lineWidth = 4;
    if (kind === "skeleton") {
      c.fillStyle = "#ece6c9";
      c.beginPath();
      c.ellipse(39, 51, 13, 12, 0, 0, 7);
      c.fill();
      c.fillStyle = "#344337";
      c.fillRect(31, 48, 5, 5);
      c.fillRect(42, 48, 5, 5);
      c.beginPath();
      c.moveTo(40, 63);
      c.lineTo(41, 80);
      c.moveTo(26, 68);
      c.lineTo(55, 71);
      c.moveTo(31, 78);
      c.lineTo(52, 78);
      c.stroke();
    }
    if (kind === "ash") {
      c.fillStyle = "#444d42";
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.ellipse(20 + i * 7, 80 - (i % 2) * 5, 11, 5, 0, 0, 7);
        c.fill();
      }
      c.fillStyle = "#c9c7ac";
      c.fillRect(38, 62, 3, 18);
    }
    if (kind === "medic") {
      c.fillStyle = "#efe7cc";
      c.strokeStyle = "#26332c";
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(24, 29, 33, 42, 9);
      c.fill();
      c.stroke();
      c.fillStyle = "#e8bf98";
      c.beginPath();
      c.arc(41, 24, 14, 0, 7);
      c.fill();
      c.fillStyle = "#efe7cc";
      c.fillRect(22, 8, 39, 16);
      c.fillStyle = "#c96250";
      c.fillRect(36, 8, 8, 15);
      c.fillRect(31, 12, 18, 7);
      c.fillRect(36, 39, 8, 20);
      c.fillRect(30, 45, 20, 8);
      c.fillStyle = "#27382e";
      c.fillRect(24, 68, 13, 20);
      c.fillRect(44, 68, 13, 20);
    }
    scene.textures.addCanvas(kind, canvas);
  }
}
export class Sound {
  private context: AudioContext | null = null;
  muted = false;
  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
    } catch {
      /* audio is optional */
    }
  }
  play(kind: "fire" | "boom" | "revive" | "brawl" | "click") {
    if (this.muted || !this.context || this.context.state !== "running") return;
    const ctx = this.context,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = kind === "boom" ? "sawtooth" : "square";
    const now = ctx.currentTime,
      f =
        kind === "fire"
          ? 170
          : kind === "boom"
            ? 75
            : kind === "revive"
              ? 620
              : kind === "brawl"
                ? 110
                : 360;
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(
      kind === "revive" ? 1100 : 40,
      now + 0.12,
    );
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(now + 0.16);
  }
}
