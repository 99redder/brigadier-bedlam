import Phaser from "phaser";
import { Battle, type Soldier } from "../sim/battle";
import { CLASSES, FIELD, type ClassId } from "../sim/data";
import { type Point, distance } from "../sim/geometry";
import { loadAssets, assetKey, Sound } from "./assets";
export const project = (p: Point) => ({
  x: 90 + p.x + (p.y - 280) * 0.12,
  y: 124 + p.y * 0.74,
});
export const unproject = (p: Point) => ({
  y: (p.y - 124) / 0.74,
  x: p.x - 90 - ((p.y - 124) / 0.74 - 280) * 0.12,
});
export class Battlefield extends Phaser.Scene {
  battle: Battle | null = null;
  paused = true;
  accumulator = 0;
  cursor: Point = { x: 100, y: 280 };
  onTick = () => {};
  onReady = () => {};
  sfx = new Sound();
  private world!: Phaser.GameObjects.Container;
  private ground!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private units = new Map<number, Phaser.GameObjects.Image>();
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private medics: Phaser.GameObjects.Image[] = [];
  private coverNodes: Phaser.GameObjects.Container[] = [];
  private previousShots = 0;
  private previousRevives = 0;
  private previousBrawls = 0;
  constructor() {
    super("Battlefield");
  }
  create() {
    loadAssets(this);
    this.cameras.main.setBackgroundColor("#b9ba88");
    this.world = this.add.container(0, 0);
    this.ground = this.add.graphics();
    this.world.add(this.ground);
    this.effects = this.add.graphics().setDepth(10000);
    this.drawTerrain();
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.cursor = unproject(p);
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.cursor = unproject(p);
      this.sfx.unlock();
    });
    this.showAttract();
    this.onReady();
  }
  drawTerrain() {
    const g = this.ground;
    g.clear();
    g.fillStyle(0x969d73);
    g.fillRect(0, 0, 1280, 720);
    g.fillStyle(0xbfc08e);
    g.fillPoints(
      [
        project({ x: 0, y: 0 }),
        project({ x: 1100, y: 0 }),
        project({ x: 1100, y: 560 }),
        project({ x: 0, y: 560 }),
      ],
      true,
    );
    g.lineStyle(3, 0x798567);
    g.strokePoints(
      [
        project({ x: 0, y: 0 }),
        project({ x: 1100, y: 0 }),
        project({ x: 1100, y: 560 }),
        project({ x: 0, y: 560 }),
      ],
      true,
      true,
    );
    let seed = 831;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 450; i++) {
      const p = project({ x: random() * 1100, y: random() * 560 });
      g.fillStyle(i % 3 === 0 ? 0xd2cc9d : 0x8f9e72, 0.3);
      g.fillEllipse(p.x, p.y, 3 + random() * 8, 2 + random() * 4);
    }
    g.fillStyle(0xd5c899, 0.55);
    const a = project({ x: 0, y: 260 }),
      b = project({ x: 1100, y: 265 });
    g.fillPoints(
      [
        { x: a.x, y: a.y - 30 },
        { x: b.x, y: b.y - 25 },
        { x: b.x, y: b.y + 40 },
        { x: a.x, y: a.y + 30 },
      ],
      true,
    );
    for (const r of this.battle?.water ?? [
      { x: 445, y: 55, w: 180, h: 94 },
      { x: 590, y: 345, w: 134, h: 73 },
    ]) {
      const p = project(r);
      g.fillStyle(0x778e85);
      g.fillEllipse(p.x + r.w / 2, p.y + r.h * 0.37, r.w + 18, r.h * 0.8 + 10);
      g.fillStyle(0x96b4aa);
      g.fillEllipse(p.x + r.w / 2, p.y + r.h * 0.37, r.w, r.h * 0.74);
      g.lineStyle(2, 0xc9d8bf, 0.65);
      for (let j = 0; j < 4; j++)
        g.lineBetween(
          p.x + 25 + j * 12,
          p.y + 15 + j * 12,
          p.x + 85 + j * 15,
          p.y + 15 + j * 12,
        );
    }
    for (const node of this.coverNodes) node.destroy();
    this.coverNodes = [];
    for (const r of this.battle?.cover ?? [
      { x: 230, y: 100, w: 100, h: 40 },
      { x: 260, y: 370, w: 90, h: 44 },
      { x: 492, y: 225, w: 112, h: 46 },
      { x: 760, y: 110, w: 95, h: 42 },
      { x: 790, y: 375, w: 80, h: 44 },
      { x: 500, y: 460, w: 80, h: 34 },
    ]) {
      const p = project({ x: r.x, y: r.y + r.h }),
        node = this.add.container(p.x, p.y).setDepth(p.y),
        cg = this.add.graphics();
      node.add(cg);
      cg.fillStyle(0x586344, 0.3);
      cg.fillEllipse(r.w / 2 + 9, 8, r.w + 30, 18);
      cg.fillStyle(0x837c51);
      cg.fillRoundedRect(-3, -38, r.w + 6, 35, 8);
      cg.lineStyle(2, 0x626644);
      cg.strokeRoundedRect(-3, -38, r.w + 6, 35, 8);
      for (let row = 0; row < 2; row++)
        for (let j = 0; j < Math.ceil(r.w / 27); j++) {
          cg.fillStyle(row ? 0xb0a374 : 0xc2b486);
          cg.fillRoundedRect(j * 27 + (row ? 6 : 0), -43 + row * 16, 25, 15, 5);
          cg.lineStyle(1, 0x827b50);
          cg.strokeRoundedRect(
            j * 27 + (row ? 6 : 0),
            -43 + row * 16,
            25,
            15,
            5,
          );
        }
      this.coverNodes.push(node);
    }
    const makeText = (x: number, y: number, text: string) =>
      this.add
        .text(x, y, text, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#52644a",
          letterSpacing: 2,
        })
        .setAlpha(0.65);
    if (!this.children.getByName("map-name"))
      makeText(
        76,
        574,
        "THE DISPUTED PICNIC GROUNDS    /    SECTOR 01",
      ).setName("map-name");
  }
  showAttract() {
    if (!this.sys.isActive()) return;
    this.battle = new Battle(831, 0);
    this.paused = true;
    this.battle.soldiers.forEach((s, i) => {
      s.x = 640 + (i % 5) * 84;
      s.y = 260 + (s.side === 0 ? 0 : 190);
    });
    this.render();
  }
  start(battle: Battle) {
    this.battle = battle;
    this.paused = false;
    this.accumulator = 0;
    this.previousShots = 0;
    this.previousRevives = 0;
    this.previousBrawls = 0;
    this.drawTerrain();
    this.render();
  }
  update(_time: number, delta: number) {
    if (!this.battle) return;
    if (!this.paused && this.battle.winner === null) {
      this.accumulator += Math.min(delta / 1000, 0.2);
      while (this.accumulator >= 1 / 30) {
        this.battle.step();
        this.accumulator -= 1 / 30;
      }
      if (this.battle.stats.shots > this.previousShots) this.sfx.play("fire");
      if (this.battle.stats.revives > this.previousRevives)
        this.sfx.play("revive");
      if (this.battle.stats.brawls > this.previousBrawls)
        this.sfx.play("brawl");
      this.previousShots = this.battle.stats.shots;
      this.previousRevives = this.battle.stats.revives;
      this.previousBrawls = this.battle.stats.brawls;
      this.onTick();
    }
    this.render();
  }
  render() {
    const b = this.battle;
    if (!b) return;
    const g = this.effects;
    g.clear();
    const selected = b.selected === null ? null : b.get(b.selected);
    if (selected && selected.life === "alive") {
      const p = project(selected);
      g.lineStyle(2, 0xffefd0, 0.3);
      g.strokeEllipse(
        p.x,
        p.y,
        CLASSES[selected.classId].range * 2,
        CLASSES[selected.classId].range * 1.48,
      );
      if (selected.goal) {
        const goal = project(selected.goal);
        g.lineStyle(2, 0xffe5a1, 0.65);
        g.lineBetween(p.x, p.y, goal.x, goal.y);
        g.strokeEllipse(goal.x, goal.y, 18, 10);
        g.lineBetween(goal.x - 5, goal.y, goal.x + 5, goal.y);
        g.lineBetween(goal.x, goal.y - 4, goal.x, goal.y + 4);
      }
    }
    for (const s of b.soldiers) {
      let sprite = this.units.get(s.id),
        label = this.labels.get(s.id);
      if (!sprite) {
        sprite = this.add
          .image(0, 0, assetKey(s.classId, s.side))
          .setOrigin(0.5, 0.93);
        this.units.set(s.id, sprite);
        label = this.add
          .text(0, 0, "", {
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#fff5d5",
            backgroundColor: "#354638",
            padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5);
        this.labels.set(s.id, label);
      }
      const p = project(s),
        alive = s.life === "alive",
        down = s.life === "down",
        anim = s.moving ? Math.sin(b.time * 14 + s.id) * 2 : 0;
      sprite.setTexture(
        s.life === "dead" ? s.death! : assetKey(s.classId, s.side),
      );
      sprite
        .setPosition(p.x, p.y + anim)
        .setDepth(p.y)
        .setFlipX(s.facing < 0)
        .setScale(0.67)
        .setAlpha(down ? 0.64 : 1)
        .setAngle(
          down
            ? s.side === 0
              ? -82
              : 82
            : s.brawl !== null
              ? Math.sin(b.time * 18) * 9
              : s.flash > 0
                ? -6
                : 0,
        );
      if (down) sprite.setOrigin(0.5, 0.6);
      else sprite.setOrigin(0.5, 0.93);
      g.fillStyle(0x354638, 0.19);
      g.fillEllipse(p.x, p.y + 3, 33, 13);
      if (b.selected === s.id && alive) {
        g.lineStyle(3, 0xffe5a1);
        g.strokeEllipse(p.x, p.y + 3, 45, 21);
        g.fillStyle(0xffe5a1);
        g.fillTriangle(p.x - 5, p.y - 70, p.x + 5, p.y - 70, p.x, p.y - 64);
      }
      if (alive) {
        g.fillStyle(0x314a3b);
        g.fillRoundedRect(p.x - 16, p.y - 62, 32, 5, 2);
        g.fillStyle(s.side === 0 ? 0xc7e0ac : 0xe2a47e);
        g.fillRoundedRect(
          p.x - 16,
          p.y - 62,
          (32 * s.hp) / CLASSES[s.classId].hp,
          5,
          2,
        );
        if (s.jam > 0) {
          label!.setText("JAM!");
        } else if (s.brawl !== null) {
          label!.setText(s.blocking ? "BLOCK" : "BRAWL");
        } else
          label!.setText(
            `${s.side === 0 ? s.slot + 1 : "×"} ${CLASSES[s.classId].short}`,
          );
      } else
        label!.setText(down ? "✚ MEDIC" : s.death === "ash" ? "ASH" : "R.I.P.");
      label!
        .setPosition(p.x, p.y + 16)
        .setDepth(p.y + 1)
        .setAlpha(alive ? 1 : 0.8);
      if (s.flash > 0 && alive && s.brawl === null && s.jam <= 0) {
        g.fillStyle(s.classId === "torch" ? 0xee8450 : 0xffdf86, 0.9);
        g.fillTriangle(
          p.x + s.facing * 23,
          p.y - 29,
          p.x + s.facing * 44,
          p.y - 39,
          p.x + s.facing * 41,
          p.y - 22,
        );
      }
    }
    for (let i = 0; i < b.medics.length; i++) {
      const m = b.medics[i],
        p = project(m);
      this.medics[i] ??= this.add
        .image(0, 0, "medic")
        .setOrigin(0.5, 0.93)
        .setScale(0.66);
      this.medics[i]
        .setVisible(true)
        .setPosition(p.x, p.y + Math.sin(b.time * 18) * 2)
        .setDepth(p.y)
        .setFlipX(m.side === 1);
    }
    for (let i = b.medics.length; i < this.medics.length; i++)
      this.medics[i].setVisible(false);
    for (const shot of b.shots) {
      const f = project(shot.from),
        t = project(shot.to),
        progress = shot.time / shot.duration,
        w = CLASSES[shot.classId],
        x = f.x + (t.x - f.x) * progress,
        y =
          f.y +
          (t.y - f.y) * progress -
          26 -
          (w.arc ? Math.sin(progress * Math.PI) * 90 : 0);
      g.fillStyle(shot.classId === "torch" ? 0xf09a50 : 0xffeab0);
      g.fillCircle(x, y, w.arc ? 5 : shot.classId === "bazooka" ? 5 : 2);
      if (w.arc) {
        g.lineStyle(1, 0xffe5a1, 0.4);
        g.lineBetween(x, y, x - 4, y + 12);
      } else {
        g.lineStyle(2, 0xffe5a1, 0.7);
        g.lineBetween(x, y, x - (t.x - f.x) * 0.035, y - (t.y - f.y) * 0.035);
      }
    }
    for (const e of b.effects) {
      const p = project(e);
      if (e.kind === "boom") {
        g.lineStyle(3, 0xffdc8d, e.time * 1.5);
        g.strokeEllipse(
          p.x,
          p.y,
          e.size * (1 - e.time) * 2,
          e.size * (1 - e.time) * 1.4,
        );
        g.fillStyle(0xebad69, e.time * 0.35);
        g.fillEllipse(p.x, p.y, e.size, e.size * 0.74);
      }
      if (e.kind === "hit") {
        g.lineStyle(2, 0xffefd0, e.time * 3);
        g.lineBetween(p.x - 9, p.y - 30, p.x + 9, p.y - 48);
        g.lineBetween(p.x + 9, p.y - 30, p.x - 9, p.y - 48);
      }
      if (e.kind === "revive") {
        g.lineStyle(3, 0xe5f4bc, e.time);
        g.lineBetween(p.x - 8, p.y - 42, p.x + 8, p.y - 42);
        g.lineBetween(p.x, p.y - 50, p.x, p.y - 34);
      }
    }
  }
  pick(point: Point) {
    const cursor = project(point);
    return this.battle?.soldiers
      .filter((s) => s.life !== "dead")
      .filter((s) => {
        const p = project(s);
        return s.life === "down"
          ? Math.abs(cursor.x - p.x) < 38 && Math.abs(cursor.y - p.y) < 28
          : Math.abs(cursor.x - p.x) < 29 &&
              cursor.y >= p.y - 65 &&
              cursor.y <= p.y + 17;
      })
      .sort((a, b) => project(b).y - project(a).y)[0];
  }
  nearest(point: Point, predicate: (s: Soldier) => boolean, max = 40) {
    return this.battle?.soldiers
      .filter(predicate)
      .filter((s) => distance(point, s) < max)
      .sort((a, b) => distance(point, a) - distance(point, b))[0];
  }
}
