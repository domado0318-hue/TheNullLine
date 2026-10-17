import Phaser from 'phaser';
import { enemyConfig } from '../config/enemies';
import { advanceSimulation } from './advanceSimulation';
import { playerConfig } from '../config/player';
import { worldConfig } from '../config/world';
import { EnemySystem } from '../enemies/EnemySystem';
import { PlayerController } from '../player/PlayerController';
import { createObstacleLayout } from '../world/createObstacleLayout';
import { createWorldView } from '../world/createWorldView';
import { clamp } from '../world/geometry';
import type { CollisionWorld, Viewport } from '../world/geometry';
import { combatConfig } from '../config/combat';
import { CombatSystem } from '../combat/CombatSystem';
import { CombatRenderer } from '../combat/CombatRenderer';
import type { Combatant } from '../combat/types';
import { HealthBar } from '../ui/HealthBar';
import { showDefeat, showWeaponSelection } from '../ui/GameOverlay';
import { ExperienceSystem } from '../experience/ExperienceSystem';
import { ExperienceRenderer } from '../experience/ExperienceRenderer';
import { ExperienceHud } from '../ui/ExperienceHud';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
  private enemySystem!: EnemySystem;
  private world!: CollisionWorld;
  private readonly enemyViews = new Map<number, Phaser.GameObjects.Rectangle>();
  private readonly healthBars = new Map<number, HealthBar>();
  private combat?: CombatSystem;
  private combatRenderer!: CombatRenderer;
  private defeated = false;
  private experience!: ExperienceSystem;
  private experienceRenderer!: ExperienceRenderer;
  private experienceHud!: ExperienceHud;

  constructor() { super('GameScene'); }

  create(): void {
    this.enemyViews.clear();
    this.healthBars.clear();
    this.combat = undefined;
    this.defeated = false;
    this.experience = new ExperienceSystem();
    this.experienceRenderer = new ExperienceRenderer(this);
    this.experienceHud = new ExperienceHud(this);
    this.experienceHud.update(this.experience);
    this.world = {
      width: worldConfig.width,
      height: worldConfig.height,
      obstacles: createObstacleLayout(worldConfig.width, worldConfig.height, playerConfig.size),
    };
    createWorldView(this, this.world);
    this.player = new PlayerController(this, this.world);
    const thickness = worldConfig.wallThickness;
    this.cameras.main.setBounds(-thickness, -thickness, this.world.width + thickness * 2, this.world.height + thickness * 2);
    this.cameras.main.startFollow(this.player.view);
    this.enemySystem = new EnemySystem(this.world);
    this.enemySystem.initialize(this.player.body, this.getViewport());
    this.combatRenderer = new CombatRenderer(this);
    this.renderActors();
    showWeaponSelection(this, (kind) => { this.combat = new CombatSystem(kind); });
  }

  update(_time: number, delta: number): void {
    const combat = this.combat;
    if (!combat || this.defeated) return;
    // Small steps retain frame-independent speed and prevent collision tunnelling.
    advanceSimulation(delta, (step) => {
      this.player.update(step, this.world, this.enemySystem.enemies);
      const viewport = this.getViewport();
      this.enemySystem.update(step, this.player.body, viewport);
      combat.update(step, this.player.body, this.enemySystem.enemies, this.world, viewport);
      this.experience.dropFromDefeated(this.enemySystem.removeDefeated());
      if (this.player.body.hp > 0) this.experience.update(step, this.player.body);
      return this.player.body.hp > 0;
    });
    this.renderActors();
    this.combatRenderer.sync(combat);
    this.experienceRenderer.sync(this.experience);
    this.experienceHud.update(this.experience);
    if (this.player.body.hp <= 0) {
      this.defeated = true;
      showDefeat(this);
    }
  }

  private getViewport(): Viewport {
    const camera = this.cameras.main;
    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;
    const thickness = worldConfig.wallThickness;
    // Use the current player position, including before the camera's first render.
    return {
      x: clamp(this.player.body.x - width / 2, -thickness, this.world.width + thickness - width),
      y: clamp(this.player.body.y - height / 2, -thickness, this.world.height + thickness - height),
      width, height,
    };
  }

  private renderActors(): void {
    this.player.syncView();
    this.player.view.setFillStyle(this.actorColor(this.player.body, playerConfig.color));
    this.syncHealthBar(this.player.body);
    const aliveIds = new Set<number>([this.player.body.id]);
    for (const enemy of this.enemySystem.enemies) {
      aliveIds.add(enemy.id);
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        view = this.add.rectangle(enemy.x, enemy.y, enemy.size, enemy.size, enemyConfig.colors[enemy.kind]);
        this.enemyViews.set(enemy.id, view);
      }
      view.setPosition(enemy.x, enemy.y);
      view.setFillStyle(this.actorColor(enemy, enemyConfig.colors[enemy.kind]));
      this.syncHealthBar(enemy);
    }
    for (const [id, view] of this.enemyViews) {
      if (!aliveIds.has(id)) { view.destroy(); this.enemyViews.delete(id); }
    }
    for (const [id, bar] of this.healthBars) {
      if (!aliveIds.has(id)) { bar.destroy(); this.healthBars.delete(id); }
    }
  }

  private actorColor(actor: Combatant, baseColor: number): number {
    const elapsed = combatConfig.hitFlashSeconds - actor.hitFlashSeconds;
    return actor.hitFlashSeconds > 0 && Math.floor(elapsed / combatConfig.flashIntervalSeconds) % 2 === 0 ? combatConfig.hitColor : baseColor;
  }

  private syncHealthBar(actor: Combatant): void {
    let bar = this.healthBars.get(actor.id);
    if (!bar) { bar = new HealthBar(this); this.healthBars.set(actor.id, bar); }
    bar.update(actor);
  }
}
