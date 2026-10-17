import Phaser from "phaser";
import { CLASSES, type ClassId } from "../sim/data";
import { drawRunner, runnerKey } from "./runner";
import { drawCharacter } from "./characters";
import {
  FIGHT_FRAMES,
  drawFighter,
  fighterKey,
  type FightPose,
} from "./fighting";
import { drawVictory, victoryKey } from "./victory";
export const ASSET_SCALE = 2;
export const WALK_FRAMES = 12;
export const walkKey = (id: ClassId, side: number, frame: number) =>
  `walk-${id}-${side}-${frame}`;
export const coverKey = (id: ClassId, side: number) => `cover-${id}-${side}`;
function crispCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width * ASSET_SCALE;
  canvas.height = height * ASSET_SCALE;
  const context = canvas.getContext("2d")!;
  context.scale(ASSET_SCALE, ASSET_SCALE);
  return { canvas, context };
}
export const assetKey = (classId: ClassId, side: number) =>
  `soldier-${classId}-${side}`;
export function loadAssets(scene: Phaser.Scene) {
  for (const classId of Object.keys(CLASSES) as ClassId[])
    for (const side of [0, 1]) {
      const key = assetKey(classId, side);
      if (scene.textures.exists(key)) continue;
      const canvas = document.createElement("canvas");
      canvas.width = 80 * ASSET_SCALE;
      canvas.height = 96 * ASSET_SCALE;
      const c = canvas.getContext("2d")!;
      c.scale(ASSET_SCALE, ASSET_SCALE);
      drawCharacter(c, classId, side);
      scene.textures.addCanvas(key, canvas);
      for (let frame = 0; frame < WALK_FRAMES; frame++) {
        const a = crispCanvas(80, 96);
        drawCharacter(
          a.context,
          classId,
          side,
          false,
          false,
          Math.sin((frame / WALK_FRAMES) * Math.PI * 2),
        );
        scene.textures.addCanvas(walkKey(classId, side, frame), a.canvas);
      }
      for(let frame=0;frame<14;frame++) {
        const light=crispCanvas(80,96);drawRunner(light.context,classId,side,frame<12?Math.sin(frame/12*Math.PI*2):0,frame===13);
        scene.textures.addCanvas(runnerKey(classId,side,frame),light.canvas);
      }
      const cover = crispCanvas(80, 96);
      drawCharacter(cover.context, classId, side, false, false, 0, true);
      scene.textures.addCanvas(coverKey(classId, side), cover.canvas);
      for(const light of [false,true]) for (let frame = 0; frame < 8; frame++) {
        const celebration = document.createElement("canvas");
        celebration.width = 128 * ASSET_SCALE;
        celebration.height = 96 * ASSET_SCALE;
        const ctx = celebration.getContext("2d")!;
        ctx.scale(ASSET_SCALE, ASSET_SCALE);
        ctx.translate(24, 0);
        drawVictory(ctx, classId, side, frame,light);
        scene.textures.addCanvas(victoryKey(classId, side, frame,light), celebration);
      }
      for(const light of [false,true]) for (const pose of Object.keys(FIGHT_FRAMES) as FightPose[])
        for (let frame = 0; frame < FIGHT_FRAMES[pose]; frame++) {
          const fightCanvas = document.createElement("canvas");
          fightCanvas.width = 128 * ASSET_SCALE;
          fightCanvas.height = 96 * ASSET_SCALE;
          const ctx = fightCanvas.getContext("2d")!;
          ctx.scale(ASSET_SCALE, ASSET_SCALE);
          ctx.translate(24, 0);
          drawFighter(ctx, classId, side, pose, frame,light);
          scene.textures.addCanvas(
            fighterKey(classId, side, pose, frame,light),
            fightCanvas,
          );
        }
    }
  for (const kind of ["skeleton", "ash", "medic", "drowned"]) {
    if (scene.textures.exists(kind)) continue;
    const canvas = document.createElement("canvas");
    canvas.width = 80 * ASSET_SCALE;
    canvas.height = 96 * ASSET_SCALE;
    const c = canvas.getContext("2d")!;
    c.scale(ASSET_SCALE, ASSET_SCALE);
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
