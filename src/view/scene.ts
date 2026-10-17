import { MAPS } from "../sim/maps";
import { AIRSTRIKE_ACCURACY } from "../sim/airstrike";
import { headingOf, VIEW_ARC } from "../sim/vision";
import Phaser from "phaser";
import { Battle, type SuperWeapon, type Soldier } from "../sim/battle";
import {
  CLASSES,
  FIELD,
  TUNING,
  TERRAIN,
  COVER,
  WATER,
  BRIDGES,
  type ClassId,
} from "../sim/data";
import { type Point, distance, waterOutlines } from "../sim/geometry";
import {
  ASSET_SCALE,
  WALK_FRAMES,
  walkKey,
  coverKey,
  loadAssets,
  assetKey,
  Sound,
  drawProjectile,
  CLASS_POSES,
  fighterKey,
  fightFrame,
} from "./assets";
import {
  VictoryClock,
  EMOTES,
  isCelebrating,
  victoryKey,
  victoryMotion,
} from "./victory";
import { interpolatePoint } from "./motion";
import { drawAirstrike } from "./airstrike";
import { DeploymentCues } from "./deployment-cues";
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
  private previousPositions = new Map<number, Point>();
  private visualPoint(unit: Point & { id: number }) {
    return !this.battle ||
      this.paused ||
      this.battle.planning ||
      this.battle.winner !== null
      ? unit
      : interpolatePoint(
          unit,
          this.previousPositions.get(unit.id),
          this.accumulator / TUNING.step,
        );
  }
  victory = new VictoryClock();
  private deploymentCues = new DeploymentCues();
  private airstrikeBanner!: Phaser.GameObjects.Text;
  private lastAirstrikeEvent = -1;
  private victoryBanner!: Phaser.GameObjects.Text;
  tutorialMarker: { point: Point; label: string } | null = null;
  aimPoint(): Point {
    const near = this.pick(this.cursor);
    return near && near.side === 1 && near.life === "alive"
      ? { x: near.x, y: near.y }
      : { ...this.cursor };
  }
  squadMovePreview = false;
  superAim: SuperWeapon | null = null;
  private supplyLabels: Phaser.GameObjects.Text[] = [];
  facePreview = false;
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
  private medicLabels: Phaser.GameObjects.Text[] = [];
  private terrainRevision = -1;
  private coverNodes: Phaser.GameObjects.Container[] = [];
  private lastCombatEvent = -1;
  private lastMeleeEvent = -1;
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
    this.victoryBanner = this.add
      .text(640, 112, "", {
        fontFamily: "monospace",
        fontSize: "25px",
        color: "#fff0b5",
        backgroundColor: "#2b453b",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(10001)
      .setVisible(false);
    this.airstrikeBanner = this.add
      .text(640, 91, "", {
        fontFamily: "monospace",
        fontSize: "19px",
        fontStyle: "bold",
        color: "#fff1bc",
        backgroundColor: "#8c3429",
        padding: { x: 18, y: 9 },
      })
      .setOrigin(0.5, 0)
      .setDepth(10005)
      .setVisible(false);
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
    const map=this.battle?.operation ? MAPS[this.battle.operation.mapId] : null;
    g.fillStyle(map?.ground ?? 0xbfc08e);
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
    const water = this.battle?.water ?? WATER;
    for (const outline of waterOutlines(water)) {
      const corners = outline.map(project);
      g.lineStyle(12, 0x869378);
      g.strokePoints(corners, true, true);
      g.fillStyle(map?.waterColor ?? 0x6a9e9a);
      g.fillPoints(corners, true);
      g.lineStyle(2, 0xc2d7bc, 0.7);
      g.strokePoints(corners, true, true);
    }
    for (const r of water) {
      g.lineStyle(2, 0xc8e5d5, 0.5);
      for (let y = r.y + 20; y < r.y + r.h; y += 30) {
        for (let x = r.x + 12; x < r.x + r.w - 20; x += 32) {
          const p = project({ x, y });
          g.lineBetween(p.x, p.y, p.x + 18, p.y);
          g.lineBetween(p.x + 4, p.y + 4, p.x + 13, p.y + 4);
        }
      }
    }
    for (const r of this.battle?.bridges ?? BRIDGES) {
      const corners = [
        project(r),
        project({ x: r.x + r.w, y: r.y }),
        project({ x: r.x + r.w, y: r.y + r.h }),
        project({ x: r.x, y: r.y + r.h }),
      ];
      g.fillStyle(0x8b6848);
      g.fillPoints(corners, true);
      g.lineStyle(2, 0xc4a473);
      for (let x = r.x + 6; x < r.x + r.w; x += 13) {
        const a = project({ x, y: r.y }),
          b = project({ x, y: r.y + r.h });
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      g.lineStyle(5, 0x4d503c);
      for (const y of [r.y, r.y + r.h]) {
        const a = project({ x: r.x, y }),
          b = project({ x: r.x + r.w, y });
        g.lineBetween(a.x, a.y - 5, b.x, b.y - 5);
      }
    }
    for (const node of this.coverNodes) node.destroy();
    this.coverNodes = [];
    this.terrainRevision = this.battle?.terrainRevision ?? -1;
    for (const r of this.battle?.rubble ?? []) {
      const p = project({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
      g.fillStyle(r.material === "crate" ? 0x927451 : 0x7d806f, 0.6);
      for (let i = 0; i < 9; i++)
        g.fillEllipse(
          p.x + (((i % 5) - 2) * r.w) / 5,
          p.y + Math.floor(i / 5) * 9 - 5,
          12 + (i % 3) * 4,
          5,
        );
    }
    for (const r of this.battle?.cover ?? COVER) {
      const p = project({ x: r.x, y: r.y + r.h }),
        node = this.add.container(p.x, p.y).setDepth(p.y),
        cg = this.add.graphics();
      node.add(cg);
      cg.fillStyle(0x586344, 0.3);
      cg.fillEllipse(r.w / 2 + 9, 8, r.w + 30, 18);
      if (r.material === "rock") {
        cg.fillStyle(0x747b75);
        cg.fillPoints(
          [
            { x: 0, y: -5 },
            { x: 7, y: -30 },
            { x: r.w * 0.35, y: -48 },
            { x: r.w * 0.72, y: -43 },
            { x: r.w, y: -24 },
            { x: r.w + 2, y: -4 },
          ],
          true,
        );
        cg.lineStyle(3, 0x4f5e58);
        cg.strokePoints(
          [
            { x: 0, y: -5 },
            { x: 7, y: -30 },
            { x: r.w * 0.35, y: -48 },
            { x: r.w * 0.72, y: -43 },
            { x: r.w, y: -24 },
            { x: r.w + 2, y: -4 },
          ],
          true,
          true,
        );
        cg.lineStyle(2, 0xa2aaa0);
        cg.lineBetween(12, -28, r.w * 0.35, -41);
        cg.lineBetween(r.w * 0.35, -41, r.w * 0.6, -30);
      } else if (r.material === "crate") {
        cg.fillStyle(0xa87949);
        cg.fillRect(0, -43, r.w, 40);
        cg.lineStyle(3, 0x624e34);
        cg.strokeRect(0, -43, r.w, 40);
        for (let x = 8; x < r.w; x += 22) cg.lineBetween(x, -42, x, -4);
        cg.lineStyle(5, 0xc39e6a);
        cg.lineBetween(4, -38, r.w - 4, -8);
        cg.lineBetween(4, -8, r.w - 4, -38);
      } else {
        cg.fillStyle(0x837c51);
        cg.fillRoundedRect(-3, -38, r.w + 6, 35, 8);
        cg.lineStyle(2, 0x626644);
        cg.strokeRoundedRect(-3, -38, r.w + 6, 35, 8);
        for (let row = 0; row < 2; row++)
          for (let j = 0; j < Math.ceil(r.w / 27); j++) {
            cg.fillStyle(row ? 0xb0a374 : 0xc2b486);
            cg.fillRoundedRect(
              j * 27 + (row ? 6 : 0),
              -43 + row * 16,
              25,
              15,
              5,
            );
            cg.lineStyle(1, 0x827b50);
            cg.strokeRoundedRect(
              j * 27 + (row ? 6 : 0),
              -43 + row * 16,
              25,
              15,
              5,
            );
          }
      }
      const hp = r.hp ?? TERRAIN.hp;
      if (hp < TERRAIN.hp) {
        cg.lineStyle(3, 0x3b4238);
        cg.strokePoints([
          { x: r.w * 0.55, y: -40 },
          { x: r.w * 0.4, y: -27 },
          { x: r.w * 0.58, y: -22 },
          { x: r.w * 0.35, y: -7 },
        ]);
        if (hp <= 40)
          cg.strokePoints([
            { x: r.w * 0.4, y: -27 },
            { x: r.w * 0.2, y: -24 },
            { x: r.w * 0.1, y: -10 },
          ]);
        cg.fillStyle(0x313c32);
        cg.fillRoundedRect(0, 12, r.w, 5, 2);
        cg.fillStyle(hp > 40 ? 0xf3d184 : 0xe97a5c);
        cg.fillRoundedRect(0, 12, (r.w * hp) / TERRAIN.hp, 5, 2);
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
    const name=this.children.getByName("map-name") as Phaser.GameObjects.Text | null;
    const caption=map ? `${map.name.toUpperCase()} / STAGE ${this.battle!.operation!.level} OF 10` : "THE DISPUTED PICNIC GROUNDS / SECTOR 01";
    if(name)name.setText(caption);else makeText(76,574,caption).setName("map-name");
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
    this.victory.reset();
    this.deploymentCues.reset(battle.planning);
    this.battle = battle;
    this.terrainRevision = -1;
    this.paused = false;
    this.accumulator = 0;
    this.previousPositions.clear();
    this.lastCombatEvent = -1;
    this.lastAirstrikeEvent = -1;
    this.lastMeleeEvent = -1;
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
        this.previousPositions = new Map(
          this.battle
            .combatants()
            .map((unit) => [unit.id, { x: unit.x, y: unit.y }]),
        );
        this.battle.step();
        this.accumulator -= 1 / 30;
      }
      const cue = this.deploymentCues.poll(this.battle.countdown);
      if (cue !== null) this.sfx.deployment(cue);
      for (const event of this.battle.combatEvents) {
        if (event.id > this.lastCombatEvent) {
          this.sfx.weapon(event.classId, event.kind);
          this.lastCombatEvent = event.id;
        }
      }
      for (const event of this.battle.airstrikeEvents)
        if (event.id > this.lastAirstrikeEvent) {
          this.sfx.airstrike(event.kind);
          this.lastAirstrikeEvent = event.id;
        }
      for (const event of this.battle.meleeEvents)
        if (event.id > this.lastMeleeEvent) {
          this.sfx.melee(event.kind, event.blocked);
          this.lastMeleeEvent = event.id;
        }
      if (this.battle.stats.revives > this.previousRevives)
        this.sfx.play("revive");
      if (this.battle.stats.brawls > this.previousBrawls)
        this.sfx.play("brawl");

      this.previousRevives = this.battle.stats.revives;
      this.previousBrawls = this.battle.stats.brawls;
    }
    this.victory.advance(
      Math.min(delta / 1000, 0.2),
      this.battle.winner,
      this.paused,
    );
    if (!this.paused) this.onTick();
    this.render();
  }
  render() {
    const b = this.battle;
    if (!b) return;
    const visualTime =
      b.time + (!this.paused && b.winner === null ? this.accumulator : 0);
    if (this.terrainRevision !== b.terrainRevision) this.drawTerrain();
    for (const [id, sprite] of this.units) {
      const present = b.get(id) !== undefined;
      sprite.setVisible(present);
      this.labels.get(id)?.setVisible(present);
    }
    this.victoryBanner
      .setVisible(b.winner !== null)
      .setText(
        b.winner === 0
          ? "VICTORY!  TAKE A BOW, SQUAD."
          : "ENEMY VICTORY!  THEY'RE SHOWING OFF.",
      );
    const g = this.effects;
    g.clear();
    for (let i = 0; i < b.supplies.length; i++) {
      const drop = b.supplies[i],
        p = project(drop),
        active = drop.claimedBy === null;
      this.supplyLabels[i] ??= this.add
        .text(0, 0, "", {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#fff4bd",
          backgroundColor: "#354c3e",
          padding: { x: 4, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(10002);
      this.supplyLabels[i]
        .setVisible(active)
        .setPosition(p.x, p.y - 32)
        .setText(`${drop.label} · ?`);
      if (!active) continue;
      g.fillStyle(0xffd45f, 0.16 + 0.07 * Math.sin(b.time * 4));
      g.fillEllipse(p.x, p.y + 2, 54, 28);
      g.lineStyle(2, 0xffe599);
      g.strokeEllipse(p.x, p.y + 2, 43, 22);
      g.fillStyle(0x304c42);
      g.fillRoundedRect(p.x - 14, p.y - 22, 28, 24, 4);
      g.lineStyle(2, 0xffd45f);
      g.strokeRoundedRect(p.x - 14, p.y - 22, 28, 24, 4);
      g.fillStyle(0xffd45f);
      g.fillTriangle(p.x + 3, p.y - 20, p.x - 7, p.y - 9, p.x + 2, p.y - 9);
      g.fillTriangle(p.x - 3, p.y, p.x + 7, p.y - 12, p.x - 2, p.y - 12);
    }
    for (let i = b.supplies.length; i < this.supplyLabels.length; i++)
      this.supplyLabels[i].setVisible(false);
    const visibleStrikes = b.strikes.filter(
      (s) => b.winner === null || s.impacted,
    );
    const activeStrike =
      visibleStrikes.find((s) => s.remaining > 0) ??
      visibleStrikes.find(
        (s) =>
          s.remaining - (b.winner === null ? 0 : this.victory.elapsed) >
          -TUNING.airstrikeAftermath,
      );
    this.airstrikeBanner.setVisible(!!activeStrike);
    if (activeStrike)
      this.airstrikeBanner
        .setText(
          activeStrike.remaining > 0
            ? `${activeStrike.side === 0 ? "FRIENDLY" : "ENEMY"} AIRSTRIKE · ${AIRSTRIKE_ACCURACY[activeStrike.accuracy]}\nCLEAR THE ${activeStrike.side === 0 ? "GOLD" : "RED"} ZONE! ${activeStrike.remaining.toFixed(1)}s`
            : "AIRSTRIKE IMPACT — BOMBS AWAY!",
        )
        .setBackgroundColor(activeStrike.side === 0 ? "#695324" : "#8c3429");
    for (const strike of visibleStrikes) {
      if (strike.remaining > 0) {
        const aim = project(strike.requested), actual = project(strike.point);
        g.lineStyle(1, 0xffffff, 0.4);
        g.lineBetween(aim.x - 7, aim.y, aim.x + 7, aim.y);
        g.lineBetween(aim.x, aim.y - 5, aim.x, aim.y + 5);
        g.lineBetween(aim.x, aim.y, actual.x, actual.y);
      }
      drawAirstrike(
        g,
        project(strike.point),
        strike.remaining - (b.winner === null ? 0 : this.victory.elapsed),
        strike.side,
      );
    }
    if (this.squadMovePreview && b.winner === null) {
      for (let i = 0; i < 5; i++) {
        const p = project({
          x: this.cursor.x + (i % 2) * 22,
          y: this.cursor.y + (i - 2) * 48,
        });
        g.lineStyle(2, 0xffdf84, 0.9);
        g.strokeEllipse(p.x, p.y, 30, 16);
      }
    }
    if (this.superAim && b.winner === null && !b.planning) {
      const p = project(this.cursor),
        radius = this.superAim === "airstrike" ? TUNING.airstrikeMaxScatter : 22;
      g.lineStyle(2, 0xffd15f, 0.9);
      g.strokeEllipse(p.x, p.y, radius * 2, radius * 1.48);
      g.lineBetween(p.x - 12, p.y, p.x + 12, p.y);
      g.lineBetween(p.x, p.y - 10, p.x, p.y + 10);
    }
    const selected = b.selected === null ? null : b.get(b.selected);
    if (
      b.winner === null &&
      selected &&
      selected.life === "alive" &&
      selected.brawl === null &&
      selected.fightMoveTime <= 0
    ) {
      const p = project(selected);
      const origin = selected.path.length && selected.watchAngle !== undefined || this.facePreview && selected.goal
        ? selected.goal ?? selected : selected;
      const angle = this.facePreview
        ? Math.atan2(this.cursor.y - origin.y, this.cursor.x - origin.x)
        : origin !== selected ? selected.watchAngle! : headingOf(selected);
      const range = CLASSES[selected.classId].range;
      const center = project(origin);
      const fan = [center, ...Array.from({ length: 33 }, (_, i) => {
        const a = angle - VIEW_ARC / 2 + VIEW_ARC * i / 32;
        return project({ x: origin.x + Math.cos(a) * range, y: origin.y + Math.sin(a) * range });
      }), center];
      g.fillStyle(this.facePreview ? 0xffd16f : 0xffefd0, 0.09);
      g.fillPoints(fan, true);
      g.lineStyle(2, this.facePreview ? 0xffd16f : 0xffefd0, 0.65);
      g.strokePoints(fan, true);
      const tip = project({x: origin.x + Math.cos(angle) * 44, y: origin.y + Math.sin(angle) * 44});
      g.lineBetween(center.x, center.y, tip.x, tip.y);
      if (b.isManualRocket(selected) && !b.planning) {
        const aim = this.aimPoint(),
          d = distance(selected, aim),
          range = CLASSES.bazooka.range;
        const end = project(
          d > range
            ? {
                x: selected.x + ((aim.x - selected.x) / d) * range,
                y: selected.y + ((aim.y - selected.y) / d) * range,
              }
            : aim,
        );
        g.lineStyle(2, d > range ? 0x93896d : 0xe87852, 0.85);
        g.lineBetween(p.x, p.y, end.x, end.y);
        g.strokeEllipse(
          end.x,
          end.y,
          CLASSES.bazooka.radius * 2,
          CLASSES.bazooka.radius * 1.48,
        );
        g.lineBetween(end.x - 8, end.y, end.x + 8, end.y);
        g.lineBetween(end.x, end.y - 6, end.x, end.y + 6);
      }
      if (selected.goal) {
        const goal = project(selected.goal);
        g.lineStyle(2, 0xffe5a1, 0.65);
        g.strokePoints([p, ...selected.path.map(project)]);
        g.strokeEllipse(goal.x, goal.y, 18, 10);
        g.lineBetween(goal.x - 5, goal.y, goal.x + 5, goal.y);
        g.lineBetween(goal.x, goal.y - 4, goal.x, goal.y + 4);
      }
    }
    if (b.planning || b.soldiers.some((s) => s.formationSpeed !== undefined))
      for (const unit of b.soldiers) {
        if (unit.side !== 0 || !unit.goal || unit.id === b.selected) continue;
        const p = project(unit),
          goal = project(unit.goal);
        g.lineStyle(2, 0xffe5a1, 0.6);
        g.strokePoints([p, ...unit.path.map(project)]);
        g.strokeEllipse(goal.x, goal.y, 18, 10);
      }
    if (this.tutorialMarker) {
      const p = project(this.tutorialMarker.point),
        pulse = Math.sin(b.time * 5) * 4;
      g.lineStyle(4, 0xffed9d, 0.9);
      g.strokeEllipse(p.x, p.y, 56 + pulse, 28 + pulse);
      g.fillStyle(0xffed9d);
      g.fillTriangle(p.x - 7, p.y - 92, p.x + 7, p.y - 92, p.x, p.y - 80);
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
      const celebrating = isCelebrating(s, b.winner);
      const victoryPose = victoryMotion(s.classId, this.victory.elapsed, s.id);
      const fighting =
        !celebrating &&
        (s.brawl !== null ||
          s.fightMoveTime > 0 ||
          s.recoilTime > 0 ||
          (s.life === "down" && s.brawlKnockdown));
      const anchor = project(s.fightAnchor ?? s),
        facing = fighting
          ? s.fightFacing
          : b.isManualRocket(s) && !b.planning
            ? this.aimPoint().x >= s.x
              ? 1
              : -1
            : s.facing;
      const p =
          fighting && s.fightAnchor
            ? { x: anchor.x - facing * 30, y: anchor.y }
            : project(this.visualPoint(s)),
        alive = s.life === "alive",
        wet = b.inWater(s) && alive,
        sinking = s.drowningTime > 0,
        sink = sinking ? 1 - s.drowningTime / TUNING.drowningDuration : 0,
        down = s.life === "down",
        pose = CLASS_POSES[s.classId],
        anim = alive
          ? Math.sin(visualTime * (s.moving ? 12 : pose.pace) + s.id) *
            (s.moving ? 0.7 : pose.bob)
          : 0;
      if (alive && s.side === 0 && !fighting) {
        const a = headingOf(s), tip = project({x: s.x + Math.cos(a) * 24, y: s.y + Math.sin(a) * 24});
        g.lineStyle(2, 0xffdf87, 0.85);
        g.lineBetween(p.x, p.y + 5, tip.x, tip.y + 5);
        const back = project({x: s.x + Math.cos(a) * 18, y: s.y + Math.sin(a) * 18});
        const wing = project({x: s.x - Math.sin(a) * 4, y: s.y + Math.cos(a) * 4});
        const base = project(s);
        g.lineBetween(tip.x, tip.y + 5, back.x + wing.x - base.x, back.y + wing.y - base.y + 5);
        g.lineBetween(tip.x, tip.y + 5, back.x - wing.x + base.x, back.y - wing.y + base.y + 5);
      }
      const frame = fightFrame(s, b.time);
      const fall =
        down && s.brawlKnockdown
          ? b.winner !== null
            ? 1
            : 1 - s.knockdownTime / TUNING.knockdownAnimation
          : 1;
      const strike =
        !celebrating && s.fightMoveTime > 0
          ? 8 *
            Math.min(
              1,
              s.fightMoveTime /
                (s.fightMove === "kick"
                  ? TUNING.kickAnimation
                  : TUNING.punchAnimation),
            )
          : 0;
      const recoil =
        !celebrating && s.recoilTime > 0 && !s.recoilBlocked
          ? (-5 * s.recoilTime) / TUNING.recoilAnimation
          : 0;
      sprite.setTexture(
        s.life === "dead"
          ? s.death!
          : celebrating
            ? victoryKey(s.classId, s.side, victoryPose.frame)
            : fighting
              ? fighterKey(s.classId, s.side, frame.pose, frame.frame)
              : s.takingCover
                ? coverKey(s.classId, s.side)
                : s.moving
                  ? walkKey(
                      s.classId,
                      s.side,
                      Math.floor(visualTime * 12 + s.id * 2) % WALK_FRAMES,
                    )
                  : assetKey(s.classId, s.side),
      );
      sprite
        .setPosition(
          p.x + facing * (strike + recoil),
          p.y +
            (celebrating ? victoryPose.hop : s.takingCover ? 0 : anim) +
            (wet ? 9 + sink * 18 : 0),
        )
        .setDepth(p.y)
        .setFlipX(facing < 0)
        .setScale(
          (0.79 / ASSET_SCALE) * (1 - sink * 0.45),
        )
        .setTint(0xffffff)
        .setAlpha(sinking ? 1 - sink * 0.85 : down ? 0.64 : 1)
        .setAngle(
          celebrating
            ? victoryPose.angle
            : down
              ? s.brawlKnockdown
                ? -facing * 82 * fall
                : s.side === 0
                  ? -82
                  : 82
              : fighting
                ? facing *
                  (frame.pose === "hurt"
                    ? -10
                    : frame.pose === "kick"
                      ? -7
                      : frame.pose === "punch"
                        ? 5
                        : Math.sin(b.time * 6 + s.id) * 1.5)
                : s.flash > 0
                  ? -6
                  : alive
                    ? pose.lean +
                      Math.sin(b.time * pose.pace + s.id) * pose.sway
                    : 0,
        );
      if (down)
        sprite.setOrigin(0.5, s.brawlKnockdown ? 0.93 - 0.33 * fall : 0.6);
      else sprite.setOrigin(0.5, 0.93);
      g.fillStyle(0x354638, 0.19);
      g.fillEllipse(p.x, p.y + 3, 33, 13);
      if (wet) {
        const ripple = Math.sin(b.time * 7 + s.id) * 3;
        g.fillStyle(0x6a9e9a, 0.9);
        g.fillEllipse(p.x, p.y + 6, 31, 12);
        g.lineStyle(2, 0xc8e5d5, 0.8);
        g.strokeEllipse(p.x, p.y + 5, 38 + ripple, 15 + ripple * 0.3);
        if (sinking)
          for (let i = 0; i < 3; i++)
            g.strokeCircle(
              p.x + (i - 1) * 12,
              p.y - 12 - ((b.time * 24 + i * 9) % 28),
              2 + (i % 2),
            );
      }
      if (alive && s.takingCover) {
        g.lineStyle(3, 0xa4e6d2, 0.9);
        g.strokeEllipse(p.x, p.y + 3, 43, 21);
        g.fillStyle(0xa4e6d2, 0.9);
        g.fillTriangle(
          p.x + 18,
          p.y - 42,
          p.x + 32,
          p.y - 42,
          p.x + 25,
          p.y - 26,
        );
      }
      if (alive) {
        g.lineStyle(1.5, s.side === 0 ? 0x477963 : 0xc45e48, 0.8);
        g.strokeEllipse(p.x, p.y + 3, 34, 15);
      }
      if (b.winner === null && b.selected === s.id && alive) {
        g.lineStyle(3, 0xffe5a1);
        g.strokeEllipse(p.x, p.y + 3, 45, 21);
        g.fillStyle(0xffe5a1);
        g.fillTriangle(p.x - 5, p.y - 85, p.x + 5, p.y - 85, p.x, p.y - 79);
      }
      if (alive) {
        g.fillStyle(0x314a3b);
        g.fillRoundedRect(p.x - 16, p.y - 75, 32, 5, 2);
        g.fillStyle(s.side === 0 ? 0xc7e0ac : 0xe2a47e);
        g.fillRoundedRect(
          p.x - 16,
          p.y - 75,
          (32 * s.hp) / b.maxHp(s),
          5,
          2,
        );
        if (s.burnRemaining > 0) {
          this.drawBurning(p, s.id);
          label!.setText("ON FIRE!");
        } else if (celebrating) label!.setText(EMOTES[s.classId]);
        else if (s.takingCover) label!.setText("IN COVER");
        else if (sinking) label!.setText("DROWNING!");
        else if (wet) label!.setText("CROSSING");
        else if (s.jam > 0) {
          label!.setText("JAM!");
        } else if (s.brawl !== null) {
          label!.setText(s.blocking ? "BLOCK" : "BRAWL");
        } else
          label!.setText(
            `${s.side === 0 ? s.slot + 1 : "×"} ${CLASSES[s.classId].short}`,
          );
      } else
        label!.setText(
          down
            ? "✚ MEDIC"
            : s.death === "drowned"
              ? "DROWNED"
              : s.death === "ash"
                ? "ASH"
                : "R.I.P.",
        );
      label!
        .setBackgroundColor(
          s.takingCover && alive
            ? "#2d665e"
            : s.side === 0
              ? "#2b5845"
              : "#874536",
        )
        .setPosition(p.x, p.y + (s.takingCover && alive ? -57 : 16))
        .setDepth(p.y + 1)
        .setAlpha(alive ? 1 : 0.8);
      if (
        b.winner === null &&
        s.flash > 0 &&
        alive &&
        s.brawl === null &&
        s.fightMoveTime <= 0 &&
        s.jam <= 0
      ) {
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
        p = project(this.visualPoint(m));
      this.medics[i] ??= this.add
        .image(0, 0, "medic")
        .setOrigin(0.5, 0.93)
        .setScale(0.66 / ASSET_SCALE);
      this.medics[i]
        .setTexture(m.life === "dead" ? m.death! : "medic")
        .setVisible(true)
        .setPosition(
          p.x,
          p.y + (m.life === "alive" ? Math.sin(visualTime * 14) * 1 : 0),
        )
        .setDepth(p.y)
        .setFlipX(m.side === 1);
      this.medicLabels[i] ??= this.add
        .text(0, 0, "", {
          fontSize: "10px",
          fontFamily: "monospace",
          color: "#fff5d5",
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5);
      this.medicLabels[i]
        .setVisible(true)
        .setText(m.life === "dead" ? "MEDIC LOST" : "✚ MEDIC")
        .setBackgroundColor(m.side === 0 ? "#2b5845" : "#874536")
        .setPosition(p.x, p.y + 32)
        .setDepth(p.y + 1);
      if (m.life === "alive") {
        if (m.burnRemaining > 0) this.drawBurning(p, m.id);
        g.lineStyle(1.5, m.side === 0 ? 0x477963 : 0xc45e48, 0.8);
        g.strokeEllipse(p.x, p.y + 3, 27, 13);
        g.fillStyle(0x314a3b);
        g.fillRect(p.x - 14, p.y - 64, 28, 4);
        g.fillStyle(m.side === 0 ? 0xc7e0ac : 0xe2a47e);
        g.fillRect(p.x - 14, p.y - 64, (28 * m.hp) / TUNING.medicHealth, 4);
      }
    }
    for (let i = b.medics.length; i < this.medics.length; i++) {
      this.medics[i].setVisible(false);
      this.medicLabels[i].setVisible(false);
    }
    for (const shot of b.winner === null ? b.shots : [])
      drawProjectile(g, shot, project(shot.from), project(shot.to));
    for (const e of b.winner === null ? b.effects : []) {
      const p = project(e);
      if (e.kind === "splash") {
        g.lineStyle(2, 0xd7efe5, e.time);
        g.strokeEllipse(
          p.x,
          p.y,
          e.size * (2 - e.time),
          e.size * (1 - e.time * 0.4),
        );
      }
      if (e.kind === "debris") {
        const progress = 1 - e.time / 0.7;
        g.fillStyle(0xb9af89, e.time / 0.7);
        g.fillEllipse(
          p.x,
          p.y - 10,
          30 + progress * e.size * 3,
          20 + progress * 40,
        );
        g.fillStyle(0x686a57, e.time / 0.7);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          g.fillRect(
            p.x + Math.cos(a) * progress * e.size * 1.5,
            p.y -
              20 +
              Math.sin(a) * progress * 24 -
              Math.sin(progress * Math.PI) * 25,
            6,
            5,
          );
        }
      }
      if (e.kind === "boom" && e.classId === "torch") {
        g.fillStyle(0xf38c4b, e.time);
        g.fillCircle(p.x, p.y - 22, 3 + e.time * 8);
        continue;
      }
      if (e.kind === "boom") {
        if (e.classId === "sapper") {
          g.fillStyle(0xfff0ce, e.time);
          g.fillEllipse(
            p.x,
            p.y,
            CLASSES.sapper.lethalRadius * 2,
            CLASSES.sapper.lethalRadius * 1.48,
          );
          g.lineStyle(3, 0xf8a05b, e.time);
          g.strokeEllipse(
            p.x,
            p.y,
            CLASSES.sapper.lethalRadius * 2,
            CLASSES.sapper.lethalRadius * 1.48,
          );
        }
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
      if (e.kind === "punch" || e.kind === "kick" || e.kind === "block") {
        const x = p.x + (e.impactFacing ?? 1) * 18,
          y = p.y - (e.kind === "kick" ? 32 : 46),
          radius = (1 - e.time / 0.28) * 12 + 6;
        g.fillStyle(e.kind === "block" ? 0xc8e3dd : 0xffe6a0, e.time / 0.28);
        const points = [];
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8,
            r = i % 2 ? radius * 0.4 : radius;
          points.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
        }
        g.fillPoints(points, true);
        g.lineStyle(2, e.kind === "block" ? 0x90b7ae : 0xe8a362, e.time / 0.28);
        g.strokeCircle(x, y, radius + 3);
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
  private drawBurning(p: Point, id: number) {
    const g = this.effects,
      time = this.battle!.time;
    for (let i = 0; i < 4; i++) {
      const x = p.x - 13 + i * 8,
        rise = 9 + Math.sin(time * 13 + i + id) * 5;
      g.fillStyle(0xe56735, 0.9);
      g.fillTriangle(x - 6, p.y - 18, x + 6, p.y - 18, x + 2, p.y - 40 - rise);
      g.fillStyle(0xffdb71, 0.9);
      g.fillTriangle(x - 3, p.y - 19, x + 3, p.y - 19, x + 1, p.y - 32 - rise);
    }
    g.fillStyle(0x4b4c3f, 0.3);
    g.fillCircle(
      p.x + Math.sin(time * 4 + id) * 6,
      p.y - 57 - ((time * 12) % 16),
      7,
    );
  }
  pick(point: Point) {
    const cursor = project(point);
    return this.battle
      ?.combatants()
      .filter((s) => s.life !== "dead")
      .filter((s) => {
        const p = project(s);
        return s.life === "down"
          ? Math.abs(cursor.x - p.x) < 38 && Math.abs(cursor.y - p.y) < 28
          : Math.abs(cursor.x - p.x) < 34 &&
              cursor.y >= p.y - 79 &&
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
