import { obstacleConfig } from '../config/obstacles';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';
import type { Obstacle } from './geometry';

export type ObstacleLayout = Obstacle;

// Randomize separated cells so placement always terminates and preserves passages.
export function createObstacleLayout(
  worldWidth: number,
  worldHeight: number,
  playerSize: number,
  random: () => number = Math.random,
): ObstacleLayout[] {
  assertPositive('world.width', worldWidth);
  assertPositive('world.height', worldHeight);
  assertPositive('player.size', playerSize);
  assertPositive('obstacles.referenceArea', obstacleConfig.referenceArea);
  assertInteger('obstacles.countAtReferenceArea', obstacleConfig.countAtReferenceArea);
  assertPositive('obstacles.minSizeRatio', obstacleConfig.minSizeRatio);
  assertPositive('obstacles.maxSizeRatio', obstacleConfig.maxSizeRatio);
  assertNonNegative('obstacles.extraPassageWidth', obstacleConfig.extraPassageWidth);
  if (obstacleConfig.minSizeRatio > obstacleConfig.maxSizeRatio) throw new Error('obstacles.minSizeRatio: maxSizeRatio 이하여야 합니다.');
  const minSize = playerSize * obstacleConfig.minSizeRatio;
  const maxSize = playerSize * obstacleConfig.maxSizeRatio;
  const gap = Math.ceil(playerSize * Math.SQRT2) + obstacleConfig.extraPassageWidth;
  const count = Math.round(worldWidth * worldHeight / obstacleConfig.referenceArea * obstacleConfig.countAtReferenceArea);
  assertInteger('obstacles.scaledCount', count);
  if (count === 0) return [];
  const columns = Math.floor((worldWidth - gap * 2) / (maxSize + gap));
  const rows = Math.floor((worldHeight - gap * 2) / (maxSize + gap));

  if (columns < 1 || rows < 1) {
    throw new Error('World is too small to place obstacles with safe passages.');
  }

  const cellWidth = (worldWidth - gap * 2) / columns;
  const cellHeight = (worldHeight - gap * 2) / rows;
  const spawnClearance = playerSize / 2 + gap;
  const cells: { left: number; top: number }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const left = gap + column * cellWidth;
      const top = gap + row * cellHeight;
      const nearSpawn = left < worldWidth / 2 + spawnClearance
        && left + cellWidth > worldWidth / 2 - spawnClearance
        && top < worldHeight / 2 + spawnClearance
        && top + cellHeight > worldHeight / 2 - spawnClearance;

      if (!nearSpawn) {
        cells.push({ left, top });
      }
    }
  }

  if (cells.length < count) {
    throw new Error('Not enough space to place the requested obstacles safely.');
  }

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const firstShape = random() < 0.5 ? 0 : 1;

  return cells.slice(0, count).map((cell, index) => {
    const size = minSize + random() * (maxSize - minSize);
    const inset = (gap + size) / 2;

    return {
      shape: (index + firstShape) % 2 === 0 ? 'rectangle' : 'circle',
      x: cell.left + inset + random() * (cellWidth - inset * 2),
      y: cell.top + inset + random() * (cellHeight - inset * 2),
      size,
    };
  });
}
