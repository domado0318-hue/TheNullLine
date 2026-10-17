import Phaser from 'phaser';
import { playerConfig } from '../config/player';
import { worldConfig } from '../config/world';
import { PlayerController } from '../player/PlayerController';
import { createObstacleLayout } from '../world/createObstacleLayout';
import { createWorldView } from '../world/createWorldView';
import type { CollisionWorld, Viewport } from '../world/geometry';
import { advanceSimulation } from './advanceSimulation';
import { EnemySystem } from '../enemies/EnemySystem';
import { enemyConfig } from '../config/enemies';
import { clamp } from '../world/geometry';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
  private world!: CollisionWorld;
  private enemySystem!: EnemySystem;
  private readonly enemyViews = new Map<number, Phaser.GameObjects.Rectangle>();

  constructor() { super('GameScene'); }

  create(): void {
    this.enemyViews.clear();
    this.world = { width: worldConfig.width, height: worldConfig.height, obstacles: createObstacleLayout(worldConfig.width, worldConfig.height, playerConfig.size) };
    createWorldView(this, this.world);
    this.player = new PlayerController(this, this.world);
    const thickness = worldConfig.wallThickness;
    this.cameras.main.setBounds(-thickness, -thickness, this.world.width + thickness * 2, this.world.height + thickness * 2);
    this.cameras.main.startFollow(this.player.view);
    this.enemySystem = new EnemySystem(this.world);
    this.enemySystem.initialize(this.player.body, this.getViewport());
    this.renderActors();
  }

  update(_time: number, delta: number): void {
    advanceSimulation(delta, step => {
      this.player.update(step, this.world, this.enemySystem.enemies);
      this.enemySystem.update(step, this.player.body, this.getViewport());
    });
    this.renderActors();
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
    for (const enemy of this.enemySystem.enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        view = this.add.rectangle(enemy.x, enemy.y, enemy.size, enemy.size, enemyConfig.colors[enemy.kind]);
        this.enemyViews.set(enemy.id, view);
      }
      view.setPosition(enemy.x, enemy.y);
    }
  }
}
