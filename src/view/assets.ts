import Phaser from "phaser";
import { CLASSES, type ClassId } from "../sim/data";
import { drawCharacter } from "./characters";
import {
  FIGHT_FRAMES,
  drawFighter,
  fighterKey,
  type FightPose,
} from "./fighting";
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
      drawCharacter(c, classId, side);
      scene.textures.addCanvas(key, canvas);
      for (const pose of Object.keys(FIGHT_FRAMES) as FightPose[])
        for (let frame = 0; frame < FIGHT_FRAMES[pose]; frame++) {
          const fightCanvas = document.createElement("canvas");
          fightCanvas.width = 128;
          fightCanvas.height = 96;
          const ctx = fightCanvas.getContext("2d")!;
          ctx.translate(24, 0);
          drawFighter(ctx, classId, side, pose, frame);
          scene.textures.addCanvas(
            fighterKey(classId, side, pose, frame),
            fightCanvas,
          );
        }
    }
  for (const kind of ["skeleton", "ash", "medic", "drowned"]) {
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
    if (kind === "drowned") {
      c.strokeStyle = "#cae9dd";
      c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.ellipse(40, 85, 12 + i * 8, 3 + i * 2, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = "#52766e";
      c.beginPath();
      c.ellipse(40, 83, 9, 4, -0.2, 0, Math.PI * 2);
      c.fill();
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
export { Sound } from "./audio";

export { drawProjectile } from "./projectiles";

export { CLASS_POSES } from "./characters";

export { fighterKey, fightFrame } from "./fighting";
