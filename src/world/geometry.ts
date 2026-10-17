import { navigationConfig } from '../config/navigation';
import { assertPositive } from '../config/validate';
import { segmentCircleHit, segmentRoundedRectangleHit, segmentSquareHit } from './intersections';

export interface Point { x: number; y: number }
export interface Body extends Point { id: number; size: number }
export interface Obstacle extends Point { shape: 'rectangle' | 'circle'; size: number }
export interface WorldSize { width: number; height: number }
export interface Viewport extends Point { width: number; height: number }
export interface CollisionWorld extends WorldSize { obstacles: readonly Obstacle[] }

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

// A body is on screen only when a positive area overlaps the actual camera view.
export function isInViewport(point: Point, size: number, viewport: Viewport): boolean {
  const half = size / 2;
  return point.x + half > viewport.x && point.x - half < viewport.x + viewport.width
    && point.y + half > viewport.y && point.y - half < viewport.y + viewport.height;
}

export function overlapsSquare(a: Point, aSize: number, b: Point, bSize: number): boolean {
  const extent = (aSize + bSize) / 2;
  return Math.abs(a.x - b.x) < extent && Math.abs(a.y - b.y) < extent;
}

export function overlapsObstacle(point: Point, size: number, obstacle: Obstacle): boolean {
  if (obstacle.shape === 'rectangle') return overlapsSquare(point, size, obstacle, obstacle.size);
  const half = size / 2;
  const nearestX = clamp(obstacle.x, point.x - half, point.x + half);
  const nearestY = clamp(obstacle.y, point.y - half, point.y + half);
  return Math.hypot(obstacle.x - nearestX, obstacle.y - nearestY) < obstacle.size / 2;
}

export function canOccupy(
  point: Point, size: number, world: CollisionWorld, blockers: readonly Body[] = [],
): boolean {
  const half = size / 2;
  return point.x >= half && point.y >= half
    && point.x <= world.width - half && point.y <= world.height - half
    && !world.obstacles.some((obstacle) => overlapsObstacle(point, size, obstacle))
    && !blockers.some((body) => overlapsSquare(point, size, body, body.size));
}

// Substeps prevent crossing thin objects. Independent axes allow sliding without pushing actors.
export function moveBody(body: Body, dx: number, dy: number, world: CollisionWorld, blockers: readonly Body[]): number {
  assertPositive('navigation.collisionStep', navigationConfig.collisionStep);
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / navigationConfig.collisionStep));
  const start = { x: body.x, y: body.y };
  for (let step = 0; step < steps; step++) {
    const x = clamp(body.x + dx / steps, body.size / 2, world.width - body.size / 2);
    const y = clamp(body.y + dy / steps, body.size / 2, world.height - body.size / 2);
    if (canOccupy({ x, y }, body.size, world, blockers)) {
      body.x = x;
      body.y = y;
    } else {
      if (canOccupy({ x, y: body.y }, body.size, world, blockers)) body.x = x;
      if (canOccupy({ x: body.x, y }, body.size, world, blockers)) body.y = y;
    }
  }
  return distance(start, body);
}

export function lineIsClear(
  from: Point, to: Point, size: number, world: CollisionWorld, blockers: readonly Body[], shape: 'square' | 'circle' = 'square',
): boolean {
  const half = size / 2;
  for (const point of [from, to]) {
    if (point.x < half || point.y < half || point.x > world.width - half || point.y > world.height - half) return false;
  }
  // Physical bodies may slide along a touching surface. Projectiles include tangency.
  const epsilon = shape === 'square' ? 1e-7 : 0;
  const hitsSquare = (center: Point, targetHalf: number) => shape === 'circle'
    ? segmentRoundedRectangleHit(from, to, center, targetHalf, targetHalf, half)
    : segmentSquareHit(from, to, center, Math.max(0, targetHalf + half - epsilon));
  for (const obstacle of world.obstacles) {
    const hit = obstacle.shape === 'rectangle' ? hitsSquare(obstacle, obstacle.size / 2)
      : shape === 'circle' ? segmentCircleHit(from, to, obstacle, obstacle.size / 2 + half)
        : segmentRoundedRectangleHit(from, to, obstacle, half, half, Math.max(0, obstacle.size / 2 - epsilon));
    if (hit !== undefined) return false;
  }
  return !blockers.some(body => hitsSquare(body, body.size / 2) !== undefined);
}
