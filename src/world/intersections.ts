import type { Point } from './geometry';

// First contact along a finite segment, including tangency and initial overlap.
export function segmentRectangleHit(from: Point, to: Point, center: Point, halfWidth: number, halfHeight: number): number | undefined {
  let enter = 0;
  let exit = 1;
  for (const axis of ['x', 'y'] as const) {
    const delta = to[axis] - from[axis];
    const half = axis === 'x' ? halfWidth : halfHeight;
    const low = center[axis] - half;
    const high = center[axis] + half;
    if (Math.abs(delta) < Number.EPSILON) {
      if (from[axis] < low || from[axis] > high) return undefined;
      continue;
    }
    const a = (low - from[axis]) / delta;
    const b = (high - from[axis]) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return undefined;
  }
  return enter;
}

export function segmentSquareHit(from: Point, to: Point, center: Point, halfSize: number): number | undefined {
  return segmentRectangleHit(from, to, center, halfSize, halfSize);
}

export function segmentCircleHit(from: Point, to: Point, center: Point, radius: number): number | undefined {
  const x = from.x - center.x;
  const y = from.y - center.y;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return undefined;
  const b = 2 * (x * dx + y * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return undefined;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : undefined;
}

// Exact Minkowski sum of a rectangle and a circle: two strips and four rounded corners.
export function segmentRoundedRectangleHit(from: Point, to: Point, center: Point, halfWidth: number, halfHeight: number, radius: number): number | undefined {
  if (segmentRectangleHit(from, to, center, halfWidth + radius, halfHeight + radius) === undefined) return undefined;
  if (radius <= 0) return segmentRectangleHit(from, to, center, halfWidth, halfHeight);
  let first = Infinity;
  const consider = (hit: number | undefined) => { if (hit !== undefined) first = Math.min(first, hit); };
  consider(segmentRectangleHit(from, to, center, halfWidth + radius, halfHeight));
  consider(segmentRectangleHit(from, to, center, halfWidth, halfHeight + radius));
  for (const x of [-halfWidth, halfWidth]) {
    for (const y of [-halfHeight, halfHeight]) consider(segmentCircleHit(from, to, { x: center.x + x, y: center.y + y }, radius));
  }
  return first === Infinity ? undefined : first;
}
