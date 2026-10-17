import Phaser from 'phaser';
import { playerConfig } from '../config/player';
import { worldConfig } from '../config/world';
import { PlayerController } from '../player/PlayerController';
import { createObstacleLayout } from '../world/createObstacleLayout';
import { createWorldView } from '../world/createWorldView';
import type { CollisionWorld } from '../world/geometry';
import { advanceSimulation } from './advanceSimulation';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
  private world!: CollisionWorld;

  constructor() { super('GameScene'); }

  create(): void {
    this.world = { width: worldConfig.width, height: worldConfig.height, obstacles: createObstacleLayout(worldConfig.width, worldConfig.height, playerConfig.size) };
    createWorldView(this, this.world);
    this.player = new PlayerController(this, this.world);
    const thickness = worldConfig.wallThickness;
    this.cameras.main.setBounds(-thickness, -thickness, this.world.width + thickness * 2, this.world.height + thickness * 2);
    this.cameras.main.startFollow(this.player.view);
  }

  update(_time: number, delta: number): void {
    advanceSimulation(delta, step => {
      this.player.update(step, this.world, []);
    });
  }
}
