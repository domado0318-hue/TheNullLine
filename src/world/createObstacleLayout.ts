export interface ObstacleLayout {
  shape: 'rectangle' | 'circle';
  x: number;
  y: number;
  size: number;
}

// Randomize separated cells so placement always terminates and preserves passages.
export function createObstacleLayout(
  worldWidth: number,
  worldHeight: number,
  playerSize: number,
  random: () => number = Math.random,
): ObstacleLayout[] {
  const minSize = playerSize * 0.8;
  const maxSize = playerSize * 2.5;
  const gap = Math.ceil(playerSize * Math.SQRT2) + 8;
  const count = Math.max(1, Math.round(worldWidth * worldHeight / (3000 * 3000) * 8));
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
