import type { Body, Obstacle, Point } from '../world/geometry';
import { segmentCircleHit, segmentRoundedRectangleHit } from '../world/intersections';
export { segmentCircleHit, segmentSquareHit } from '../world/intersections';

export function obstacleBulletHit(from: Point, to: Point, radius: number, obstacle: Obstacle): number | undefined {
  return obstacle.shape === 'circle'
    ? segmentCircleHit(from, to, obstacle, obstacle.size / 2 + radius)
    : segmentRoundedRectangleHit(from, to, obstacle, (obstacle.width ?? obstacle.size) / 2, (obstacle.height ?? obstacle.size) / 2, radius);
}

// Separating axis test: rotated blade rectangle against an axis-aligned actor square.
export function bladeHitsBody(center: Point, angle: number, length: number, width: number, target: Body): boolean {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const half = target.size / 2;
  return Math.abs(dx) <= half + Math.abs(cos) * length / 2 + Math.abs(sin) * width / 2
    && Math.abs(dy) <= half + Math.abs(sin) * length / 2 + Math.abs(cos) * width / 2
    && Math.abs(dx * cos + dy * sin) <= length / 2 + half * (Math.abs(cos) + Math.abs(sin))
    && Math.abs(-dx * sin + dy * cos) <= width / 2 + half * (Math.abs(cos) + Math.abs(sin));
}
