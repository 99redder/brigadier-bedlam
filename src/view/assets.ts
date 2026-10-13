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
        shape(5, 32, 14, 39, "#bb5142", 6);
        shape(14, 29, 14, 42, "#d56848", 6);
        shape(12, 41, 12, 6, accent);
      }
      const width =
        classId === "bazooka"
          ? 38
          : classId === "rifleman"
            ? 26
            : classId === "sapper"
              ? 28
              : 32;
      shape(23 + (32 - width) / 2, 38, width, 32, accent, 8);
      shape(25, 58, 28, 7, team, 2);
      shape(19, 39, 12, 24, team, 6);
      shape(50, 38, 12, 25, team, 6);
      shape(23, 14, 31, 28, "#eac8a0", 10);
      if (classId === "sapper") {
        shape(23, 12, 31, 8, "#d86947", 3);
        c.fillStyle = "#d86947";
        c.beginPath();
        c.moveTo(23, 17);
        c.lineTo(12, 27);
        c.lineTo(23, 25);
        c.fill();
      } else if (classId === "lobber") {
        shape(19, 9, 39, 15, "#6b9b4f", 10);
        shape(22, 18, 31, 5, team, 2);
        shape(43, 4, 8, 9, "#6b9b4f", 3);
      } else {
        shape(
          21,
          classId === "bazooka" ? 3 : 6,
          35,
          classId === "bazooka" ? 23 : 19,
          team,
          12,
        );
        shape(17, 20, 44, 6, team, 3);
      }
      shape(25, 39, 12, 7, team, 2);
      shape(44, 39, 12, 7, team, 2);
      c.fillStyle = "#fff2d5";
      c.fillRect(37, 8, 8, 5);
      c.fillStyle = outline;
      c.fillRect(35, 28, 3, 4);
      c.fillRect(47, 28, 3, 4);
      c.fillStyle = "#b46d50";
      c.fillRect(46, 34, 10, 4);
      if (classId === "rifleman") {
        for (let i = 0; i < 4; i++) shape(29 + i * 5, 46, 4, 12, "#e3c154", 1);
        shape(35, 52, 41, 7, "#414d48", 2);
        shape(51, 57, 7, 9, outline, 1);
        c.fillStyle = accent;
        c.fillRect(68, 50, 6, 6);
      }
      if (classId === "bazooka") {
        shape(11, 34, 14, 28, "#d79558", 3);
        shape(30, 32, 48, 19, "#566449", 5);
        shape(48, 30, 9, 23, "#edb373", 2);
        shape(29, 36, 10, 17, "#445748", 2);
        c.fillStyle = outline;
        c.beginPath();
        c.arc(73, 44, 4, 0, 7);
        c.fill();
      }
      if (classId === "lobber") {
        for (let i = 0; i < 3; i++) shape(27 + i * 9, 47, 8, 13, "#426539", 4);
        shape(50, 30, 21, 25, "#659344", 9);
        c.fillStyle = outline;
        c.fillRect(54, 41, 5, 7);
        shape(32, 57, 9, 10, accent, 2);
      }
      if (classId === "torch") {
        shape(28, 25, 26, 12, "#343d37", 4);
        shape(31, 27, 8, 5, "#e2c990", 2);
        shape(44, 27, 8, 5, "#e2c990", 2);
        shape(36, 36, 13, 9, "#515e4c", 4);
        shape(39, 51, 32, 9, "#796342", 3);
        shape(66, 47, 12, 16, "#cb7942", 2);
        c.strokeStyle = outline;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(13, 67);
        c.quadraticCurveTo(34, 85, 51, 58);
        c.stroke();
      }
      if (classId === "sapper") {
        shape(25, 46, 26, 22, "#4d647a", 3);
        shape(45, 43, 9, 27, "#df4b43", 2);
        shape(56, 40, 9, 27, "#df4b43", 2);
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
export { Sound } from "./audio";

export { drawProjectile } from "./projectiles";
