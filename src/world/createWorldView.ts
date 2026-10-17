import type Phaser from 'phaser';
import { obstacleConfig } from '../config/obstacles';
import { worldConfig } from '../config/world';
import { assertNonNegative, assertPositive } from '../config/validate';
import type { CollisionWorld } from './geometry';

export function createWorldView(scene: Phaser.Scene, world: CollisionWorld): void {
  assertPositive('world.gridSpacing', worldConfig.gridSpacing);
  assertPositive('world.width', world.width);
  assertPositive('world.height', world.height);
  assertNonNegative('world.wallThickness', worldConfig.wallThickness);
  const grid = scene.add.graphics().setDepth(-1);
  grid.lineStyle(1, worldConfig.gridColor, worldConfig.gridAlpha);
  for (let x = 0; x <= world.width; x += worldConfig.gridSpacing) grid.lineBetween(x, 0, x, world.height);
  for (let y = 0; y <= world.height; y += worldConfig.gridSpacing) grid.lineBetween(0, y, world.width, y);

  const walls = scene.add.graphics();
  const thickness = worldConfig.wallThickness;
  walls.fillStyle(worldConfig.wallColor);
  walls.fillRect(-thickness, -thickness, world.width + thickness * 2, thickness);
  walls.fillRect(-thickness, world.height, world.width + thickness * 2, thickness);
  walls.fillRect(-thickness, 0, thickness, world.height);
  walls.fillRect(world.width, 0, thickness, world.height);

  for (const obstacle of world.obstacles) {
    if (obstacle.shape === 'rectangle') {
      scene.add.rectangle(obstacle.x, obstacle.y, obstacle.size, obstacle.size, obstacleConfig.rectangleColor);
    } else {
      scene.add.circle(obstacle.x, obstacle.y, obstacle.size / 2, obstacleConfig.circleColor);
    }
  }
}
