import { navigationConfig } from '../config/navigation';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';
import { canOccupy, distance, lineIsClear } from '../world/geometry';
import type { Body, CollisionWorld, Point } from '../world/geometry';

class MinHeap {
  private items: { id: number; score: number }[] = [];
  get length(): number { return this.items.length; }
  push(id: number, score: number): void {
    const item = { id, score };
    let index = this.items.length;
    this.items.push(item);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].score <= score) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }
  pop(): number {
    const first = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].score < this.items[child].score) child++;
        if (last.score <= this.items[child].score) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return first.id;
  }
}

// A* uses actual floor geometry and current actor occupancy, without a physics dependency.
export class NavigationGrid {
  private readonly columns: number;
  private readonly rows: number;
  private readonly walkable: Uint8Array;
  private readonly world: CollisionWorld;
  private readonly actorSize: number;

  constructor(world: CollisionWorld, actorSize: number) {
    assertPositive('navigation.cellSize', navigationConfig.cellSize);
    assertNonNegative('navigation.clearance', navigationConfig.clearance);
    assertInteger('navigation.nearestCellSearchRadius', navigationConfig.nearestCellSearchRadius);
    assertInteger('navigation.maximumExpandedNodes', navigationConfig.maximumExpandedNodes, 1);
    assertPositive('world.width', world.width);
    assertPositive('world.height', world.height);
    assertPositive('actor.size', actorSize);
    this.world = world;
    this.actorSize = actorSize;
    this.columns = Math.ceil(world.width / navigationConfig.cellSize);
    this.rows = Math.ceil(world.height / navigationConfig.cellSize);
    this.walkable = new Uint8Array(this.columns * this.rows);
    for (let id = 0; id < this.walkable.length; id++) {
      this.walkable[id] = Number(canOccupy(this.point(id), actorSize + navigationConfig.clearance * 2, world));
    }
  }

  private point(id: number): Point {
    return {
      x: (id % this.columns + 0.5) * navigationConfig.cellSize,
      y: (Math.floor(id / this.columns) + 0.5) * navigationConfig.cellSize,
    };
  }

  findPath(from: Point, to: Point, blockers: readonly Body[]): Point[] {
    if (lineIsClear(from, to, this.actorSize, this.world, blockers)) return [{ ...to }];
    const occupancy = new Int8Array(this.walkable.length).fill(-1);
    const isOpen = (id: number): boolean => {
      if (!this.walkable[id]) return false;
      if (occupancy[id] < 0) {
        occupancy[id] = Number(canOccupy(this.point(id), this.actorSize + navigationConfig.clearance * 2, this.world, blockers));
      }
      return occupancy[id] === 1;
    };
    const nearest = (position: Point): number => {
      const centerX = Math.floor(position.x / navigationConfig.cellSize);
      const centerY = Math.floor(position.y / navigationConfig.cellSize);
      let best = -1;
      let bestDistance = Infinity;
      const radius = navigationConfig.nearestCellSearchRadius;
      for (let y = Math.max(0, centerY - radius); y <= Math.min(this.rows - 1, centerY + radius); y++) {
        for (let x = Math.max(0, centerX - radius); x <= Math.min(this.columns - 1, centerX + radius); x++) {
          const id = y * this.columns + x;
          const point = this.point(id);
          const length = distance(position, point);
          if (length < bestDistance && isOpen(id) && lineIsClear(position, point, this.actorSize, this.world, blockers)) {
            best = id;
            bestDistance = length;
          }
        }
      }
      return best;
    };
    const start = nearest(from);
    const goal = nearest(to);
    if (start < 0 || goal < 0) return [];
    const cost = new Float64Array(this.walkable.length).fill(Infinity);
    const parent = new Int32Array(this.walkable.length).fill(-1);
    const closed = new Uint8Array(this.walkable.length);
    const open = new MinHeap();
    cost[start] = 0;
    open.push(start, distance(this.point(start), to));
    let expanded = 0;
    while (open.length && expanded < navigationConfig.maximumExpandedNodes) {
      const current = open.pop();
      if (closed[current]) continue;
      if (current === goal) {
        const path: Point[] = [{ ...to }];
        let id = goal;
        while (id !== -1) {
          path.push(this.point(id));
          id = parent[id];
        }
        return path.reverse();
      }
      closed[current] = 1;
      expanded++;
      const x = current % this.columns;
      const y = Math.floor(current / this.columns);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || x + dx < 0 || x + dx >= this.columns || y + dy < 0 || y + dy >= this.rows) continue;
          const next = (y + dy) * this.columns + x + dx;
          if (closed[next] || !isOpen(next)) continue;
          if (dx && dy && (!isOpen(y * this.columns + x + dx) || !isOpen((y + dy) * this.columns + x))) continue;
          if (!lineIsClear(this.point(current), this.point(next), this.actorSize, this.world, [])) continue;
          const nextCost = cost[current] + navigationConfig.cellSize * (dx && dy ? Math.SQRT2 : 1);
          if (nextCost >= cost[next]) continue;
          cost[next] = nextCost;
          parent[next] = current;
          open.push(next, nextCost + distance(this.point(next), to));
        }
      }
    }
    return [];
  }
}
