import { enemyConfig } from '../config/enemies';
import { navigationConfig } from '../config/navigation';
import { canOccupy, clamp, distance, isInViewport, lineIsClear, moveBody } from '../world/geometry';
import type { Body, CollisionWorld, Point, Viewport } from '../world/geometry';
import { NavigationGrid } from './NavigationGrid';
import { getEnemyWeapon } from '../config/weapons';
import { createCombatant } from '../combat/types';
import type { Combatant } from '../combat/types';
import type { EnemyExperienceCategory } from '../config/experience';
import { assertInteger, assertNonNegative, assertPositive } from '../config/validate';
import { clearAttackLine, effectiveAttackRange } from '../combat/weaponRules';

export type EnemyKind = 'horizontal' | 'circular';
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'wait' | 'attack';
interface RingSlot { ring: number; index: number }
export interface Enemy extends Combatant {
  kind: EnemyKind;
  experienceCategory: EnemyExperienceCategory;
  state: EnemyState;
  anchor: Point;
  direction: number;
  angle: number;
  patrolRadius: number;
  stateSeconds: number;
  slot?: RingSlot;
  path: Point[];
  pathTarget?: Point;
  repathAt: number;
  blockedSeconds: number;
  outOfRangeSeconds: number;
}

export class EnemySystem {
  readonly enemies: Enemy[] = [];
  readonly initialCount: number;
  readonly maximumCount: number;
  private readonly navigation: NavigationGrid;
  private nextId = 1;
  private elapsedSeconds = 0;
  private spawnSeconds = 0;
  private assignmentSeconds = 0;
  private initialPending = 0;
  readonly world: CollisionWorld;
  private readonly random: () => number;

  constructor(world: CollisionWorld, random: () => number = Math.random) {
    const spawn = enemyConfig.spawn;
    assertPositive('enemies.spawn.referenceArea', spawn.referenceArea);
    assertPositive('enemies.spawn.intervalSeconds', spawn.intervalSeconds);
    for (const key of ['initialCount', 'maximumCount', 'minimumPerWave', 'maximumPerWave'] as const) assertInteger(`enemies.spawn.${key}`, spawn[key]);
    assertInteger('enemies.spawn.maximumAttempts', spawn.maximumAttempts, 1);
    if (spawn.initialCount > spawn.maximumCount) throw new Error('enemies.spawn.initialCount: maximumCount 이하여야 합니다.');
    if (spawn.minimumPerWave > spawn.maximumPerWave) throw new Error('enemies.spawn.minimumPerWave: maximumPerWave 이하여야 합니다.');
    assertNonNegative('enemies.spawn.clearance', spawn.clearance);
    assertNonNegative('enemies.spawn.cameraMargin', spawn.cameraMargin);
    assertNonNegative('enemies.chase.outOfRangeGraceSeconds', enemyConfig.chase.outOfRangeGraceSeconds);
    this.world = world;
    this.random = random;
    const areaRatio = world.width * world.height / enemyConfig.spawn.referenceArea;
    this.initialCount = Math.round(spawn.initialCount * areaRatio);
    this.maximumCount = Math.round(spawn.maximumCount * areaRatio);
    assertInteger('enemies.spawn.scaledInitialCount', this.initialCount);
    assertInteger('enemies.spawn.scaledMaximumCount', this.maximumCount);
    this.navigation = new NavigationGrid(world, enemyConfig.size);
  }

  initialize(player: Body, viewport: Viewport): void {
    this.initialPending = this.initialCount - this.spawn(this.initialCount, player, viewport);
  }

  private between(min: number, max: number): number { return min + this.random() * (max - min); }

  private spawn(count: number, player: Body, viewport: Viewport): number {
    let created = 0;
    for (let attempt = 0; attempt < enemyConfig.spawn.maximumAttempts && created < count && this.enemies.length < this.maximumCount; attempt++) {
      const half = enemyConfig.size / 2;
      const point = {
        x: this.between(half, this.world.width - half),
        y: this.between(half, this.world.height - half),
      };
      const margin = enemyConfig.spawn.cameraMargin + half;
      const visible = point.x > viewport.x - margin && point.x < viewport.x + viewport.width + margin
        && point.y > viewport.y - margin && point.y < viewport.y + viewport.height + margin;
      if (visible || !canOccupy(point, enemyConfig.size + enemyConfig.spawn.clearance * 2, this.world, [player, ...this.enemies])) continue;
      const kind: EnemyKind = (this.nextId - 1) % 2 === 0 ? 'horizontal' : 'circular';
      const stats = enemyConfig.stats[kind];
      const enemy: Enemy = {
        ...createCombatant({ ...point, id: this.nextId++, size: enemyConfig.size }, 'enemy',
          stats.maxHp, stats.attackDamage),
        kind, experienceCategory: stats.experienceCategory,
        state: 'idle', anchor: { ...point }, direction: this.random() < 0.5 ? -1 : 1,
        angle: 0, patrolRadius: enemyConfig.patrol.circleRadius, stateSeconds: 0,
        path: [], repathAt: this.elapsedSeconds, blockedSeconds: 0, outOfRangeSeconds: 0,
      };
      this.resetPatrol(enemy);
      if (enemyConfig.chase.alwaysChasePlayer) enemy.state = 'chase';
      this.enemies.push(enemy);
      created++;
    }
    return created;
  }

  private resetPatrol(enemy: Enemy): void {
    enemy.state = 'idle';
    enemy.stateSeconds = this.between(enemyConfig.patrol.idleSeconds.min, enemyConfig.patrol.idleSeconds.max);
    enemy.anchor = { x: enemy.x, y: enemy.y };
    enemy.angle = 0;
    if (enemy.kind === 'circular') {
      const half = enemy.size / 2 + navigationConfig.clearance;
      enemy.patrolRadius = Math.max(navigationConfig.clearance, Math.min(
        enemyConfig.patrol.circleRadius, (enemy.x - half) / 2,
        this.world.width - half - enemy.x, enemy.y - half, this.world.height - half - enemy.y,
      ));
      enemy.anchor.x -= enemy.patrolRadius;
    }
    enemy.slot = undefined;
    enemy.outOfRangeSeconds = 0;
    enemy.path = [];
    enemy.pathTarget = undefined;
  }

  update(deltaSeconds: number, player: Body, viewport: Viewport): void {
    assertNonNegative('enemies.deltaSeconds', deltaSeconds);
    assertPositive('enemies.spawn.intervalSeconds', enemyConfig.spawn.intervalSeconds);
    this.elapsedSeconds += deltaSeconds;
    this.spawnSeconds += deltaSeconds;
    while (this.spawnSeconds >= enemyConfig.spawn.intervalSeconds) {
      this.spawnSeconds -= enemyConfig.spawn.intervalSeconds;
      const ratio = this.world.width * this.world.height / enemyConfig.spawn.referenceArea;
      const wave = Math.round(Math.floor(this.between(enemyConfig.spawn.minimumPerWave, enemyConfig.spawn.maximumPerWave + 1)) * ratio);
      const requested = this.initialPending || wave;
      const spawned = this.spawn(requested, player, viewport);
      this.initialPending = Math.max(0, this.initialPending - spawned);
    }

    let awarenessChanged = false;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const length = distance(enemy, player);
      if ((enemy.state === 'idle' || enemy.state === 'patrol')
        && (enemyConfig.chase.alwaysChasePlayer || length <= enemyConfig.chase.detectionRadius)) {
        enemy.state = 'chase';
        enemy.path = [];
        enemy.repathAt = this.elapsedSeconds;
        awarenessChanged = true;
      } else if (!enemyConfig.chase.alwaysChasePlayer
        && (enemy.state === 'chase' || enemy.state === 'wait' || enemy.state === 'attack') && length > enemyConfig.chase.releaseRadius) {
        this.resetPatrol(enemy);
        awarenessChanged = true;
      }
      // Idle/patrolling actors outside detection do not need per-frame firing LOS scans.
      if (enemy.state === 'idle' || enemy.state === 'patrol') continue;
      const weapon = getEnemyWeapon(enemy.kind);
      if (weapon.kind === 'bullet' && !isInViewport(enemy, enemy.size, viewport)) {
        if (enemy.state !== 'chase' || enemy.slot) awarenessChanged = true;
        enemy.state = 'chase';
        enemy.slot = undefined;
        enemy.outOfRangeSeconds = 0;
        continue;
      }
      const range = effectiveAttackRange(weapon, player.size);
      const clearShot = length <= range + enemyConfig.chase.resumeDistance && clearAttackLine(enemy, player, weapon, this.world);
      if ((enemy.state === 'chase' || enemy.state === 'wait') && length <= range && clearShot) {
        enemy.state = 'attack';
        enemy.outOfRangeSeconds = 0;
        enemy.slot = undefined;
        enemy.path = [];
        awarenessChanged = true;
      } else if (enemy.state === 'attack') {
        enemy.outOfRangeSeconds = length > range ? (enemy.outOfRangeSeconds ?? 0) + deltaSeconds : 0;
        if (length > range + enemyConfig.chase.resumeDistance || !clearShot
          || enemy.outOfRangeSeconds >= enemyConfig.chase.outOfRangeGraceSeconds && length > range) {
          enemy.state = 'chase';
          enemy.repathAt = this.elapsedSeconds;
          awarenessChanged = true;
        }
      }
    }
    this.assignmentSeconds -= deltaSeconds;
    if (this.assignmentSeconds <= 0 || awarenessChanged) {
      this.assignSlots(player, viewport);
      this.assignmentSeconds = enemyConfig.chase.assignmentIntervalSeconds;
    }

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || enemy.state === 'attack' || enemy.attackLockSeconds > 0) continue;
      const blockers = [player, ...this.enemies.filter((other) => other !== enemy)];
      if (enemy.state === 'chase' || enemy.state === 'wait') {
        if (this.needsDirectApproach(enemy, player, viewport)) {
          enemy.state = 'chase';
          enemy.slot = undefined;
          this.moveToward(enemy, this.approachTarget(enemy, player, viewport), enemyConfig.chase.speed, deltaSeconds, blockers);
          continue;
        }
        if (!enemy.slot) { enemy.state = 'wait'; continue; }
        const target = this.slotPosition(enemy.slot, player, enemy.kind);
        const remaining = distance(enemy, target);
        if (enemy.state === 'wait') {
          if (remaining <= enemyConfig.chase.resumeDistance) continue;
          enemy.state = 'chase';
        }
        if (remaining <= enemyConfig.chase.arrivalDistance) {
          enemy.state = 'wait';
          enemy.path = [];
          continue;
        }
        this.moveToward(enemy, target, enemyConfig.chase.speed, deltaSeconds, blockers);
      } else {
        this.updatePatrol(enemy, deltaSeconds, blockers);
      }
    }
  }

  removeDefeated(): Enemy[] {
    const defeated: Enemy[] = [];
    for (let index = this.enemies.length - 1; index >= 0; index--) {
      if (this.enemies[index].hp <= 0) defeated.push(...this.enemies.splice(index, 1));
    }
    return defeated.reverse();
  }

  private ringRadius(ring: number, player: Body, kind: EnemyKind): number {
    const minimumRadius = (player.size + enemyConfig.size) * Math.SQRT2 / 2 + enemyConfig.chase.minimumGap;
    const approachRadius = effectiveAttackRange(getEnemyWeapon(kind), player.size) - enemyConfig.chase.arrivalDistance - navigationConfig.clearance;
    return Math.max(minimumRadius, approachRadius)
      + ring * (enemyConfig.size * 2 + enemyConfig.chase.ringGap);
  }

  private needsDirectApproach(enemy: Enemy, player: Body, viewport: Viewport): boolean {
    return (getEnemyWeapon(enemy.kind).kind === 'bullet' && !isInViewport(enemy, enemy.size, viewport))
      || distance(enemy, player) > this.ringRadius(enemyConfig.chase.maximumRings - 1, player, enemy.kind) + enemy.size;
  }

  private approachTarget(enemy: Enemy, player: Body, viewport: Viewport): Point {
    const half = enemy.size / 2 + navigationConfig.clearance;
    if (getEnemyWeapon(enemy.kind).kind === 'bullet' && !isInViewport(enemy, enemy.size, viewport)) {
      // Aim inside the camera, rather than stopping at an offscreen weapon-range ring.
      return {
        x: clamp(clamp(enemy.x, viewport.x + half, viewport.x + viewport.width - half), half, this.world.width - half),
        y: clamp(clamp(enemy.y, viewport.y + half, viewport.y + viewport.height - half), half, this.world.height - half),
      };
    }
    // A reachable outer-ring waypoint avoids asking A* to enter the Player's occupied cell.
    const length = distance(enemy, player);
    const radius = this.ringRadius(enemyConfig.chase.maximumRings - 1, player, enemy.kind);
    return { x: player.x + (enemy.x - player.x) / length * radius, y: player.y + (enemy.y - player.y) / length * radius };
  }

  private ringCapacity(ring: number, player: Body, kind: EnemyKind): number {
    // Chord distance, rather than arc length, keeps square enemies separated.
    // Leave a full enemy-width passage, so an outer waiter cannot seal an inner reservation.
    const spacing = enemyConfig.size * 2 + enemyConfig.chase.ringGap;
    const radius = this.ringRadius(ring, player, kind);
    return Math.max(1, Math.floor(Math.PI / Math.asin(Math.min(1, spacing / (2 * radius)))));
  }

  private slotPosition(slot: RingSlot, player: Body, kind: EnemyKind = 'horizontal'): Point {
    const angle = slot.index / this.ringCapacity(slot.ring, player, kind) * Math.PI * 2;
    const radius = this.ringRadius(slot.ring, player, kind);
    return { x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius };
  }

  private assignSlots(player: Body, viewport: Viewport): void {
    const followers = this.enemies.filter((enemy) => (enemy.state === 'chase' || enemy.state === 'wait')
      && !this.needsDirectApproach(enemy, player, viewport));
    const reserved = new Map<string, Enemy>();
    const key = (slot: RingSlot, enemy: Enemy) => `${enemy.kind}:${slot.ring}:${slot.index}`;
    const usable = (slot: RingSlot, enemy: Enemy) => {
      const target = this.slotPosition(slot, player, enemy.kind);
      if (getEnemyWeapon(enemy.kind).kind === 'bullet' && !isInViewport(target, enemy.size, viewport)) return false;
      const attackers = this.enemies.filter((other) => other !== enemy && other.state === 'attack');
      const needsRouteCheck = enemy.blockedSeconds >= navigationConfig.stuckRepathSeconds
        || (enemy.slot !== undefined && slot.ring < enemy.slot.ring);
      const blockers = needsRouteCheck ? [player, ...this.enemies.filter(other => other !== enemy)] : [];
      return canOccupy(target, enemyConfig.size + navigationConfig.clearance * 2, this.world, attackers)
        && clearAttackLine(target, player, getEnemyWeapon(enemy.kind), this.world)
        && ![...reserved.values()].some((other) => other !== enemy && other.slot
          && distance(target, this.slotPosition(other.slot, player, other.kind)) < enemyConfig.size * Math.SQRT2 + enemyConfig.chase.ringGap)
        && (!needsRouteCheck || lineIsClear(enemy, target, enemy.size, this.world, blockers)
          || this.navigation.findPath(enemy, target, blockers).length > 0);
    };
    // Preserve reservations across ticks; never push an existing waiter to make room.
    for (const enemy of followers) {
      if (enemy.slot && usable(enemy.slot, enemy) && !reserved.has(key(enemy.slot, enemy))) reserved.set(key(enemy.slot, enemy), enemy);
      else enemy.slot = undefined;
    }
    followers.sort((a, b) => {
      const difference = distance(a, player) - distance(b, player);
      return Math.abs(difference) < 1e-6 ? a.id - b.id : difference;
    });
    for (const enemy of followers) {
      const lastRing = enemy.slot?.ring ?? enemyConfig.chase.maximumRings - 1;
      for (let ring = 0; ring <= lastRing; ring++) {
        const options: RingSlot[] = [];
        for (let index = 0; index < this.ringCapacity(ring, player, enemy.kind); index++) {
          const slot = { ring, index };
          if ((!reserved.has(key(slot, enemy)) || reserved.get(key(slot, enemy)) === enemy) && usable(slot, enemy)) options.push(slot);
        }
        if (!options.length) continue;
        // Keep the same angle until an inner ring becomes available.
        if (enemy.slot?.ring === ring) break;
        options.sort((a, b) => distance(enemy, this.slotPosition(a, player, enemy.kind)) - distance(enemy, this.slotPosition(b, player, enemy.kind)));
        if (enemy.slot) reserved.delete(key(enemy.slot, enemy));
        enemy.slot = options[0];
        reserved.set(key(enemy.slot, enemy), enemy);
        enemy.path = [];
        enemy.repathAt = this.elapsedSeconds;
        break;
      }
    }
  }

  private updatePatrol(enemy: Enemy, deltaSeconds: number, blockers: readonly Body[]): void {
    enemy.stateSeconds -= deltaSeconds;
    if (enemy.stateSeconds <= 0) {
      if (enemy.state === 'idle') {
        enemy.state = 'patrol';
        enemy.stateSeconds = this.between(enemyConfig.patrol.moveSeconds.min, enemyConfig.patrol.moveSeconds.max);
      } else {
        enemy.state = 'idle';
        enemy.stateSeconds = this.between(enemyConfig.patrol.idleSeconds.min, enemyConfig.patrol.idleSeconds.max);
      }
    }
    if (enemy.state === 'idle') return;
    let target: Point;
    if (enemy.kind === 'horizontal') {
      target = {
        x: clamp(enemy.anchor.x + enemy.direction * enemyConfig.patrol.horizontalRange, enemy.size / 2, this.world.width - enemy.size / 2),
        y: enemy.anchor.y,
      };
      if (distance(enemy, target) <= navigationConfig.waypointDistance) enemy.direction *= -1;
    } else {
      enemy.angle += enemyConfig.patrol.speed / enemy.patrolRadius * deltaSeconds;
      target = {
        x: enemy.anchor.x + Math.cos(enemy.angle) * enemy.patrolRadius,
        y: enemy.anchor.y + Math.sin(enemy.angle) * enemy.patrolRadius,
      };
    }
    this.moveToward(enemy, target, enemyConfig.patrol.speed, deltaSeconds, blockers);
  }

  private moveToward(enemy: Enemy, target: Point, speed: number, deltaSeconds: number, blockers: readonly Body[]): void {
    let goal = target;
    if (!lineIsClear(enemy, target, enemy.size, this.world, blockers)) {
      if (this.elapsedSeconds >= enemy.repathAt && (
        !enemy.path.length || !enemy.pathTarget || distance(enemy.pathTarget, target) >= navigationConfig.targetRepathDistance
        || enemy.blockedSeconds >= navigationConfig.stuckRepathSeconds
        || !lineIsClear(enemy, enemy.path[0], enemy.size, this.world, blockers)
      )) {
        enemy.path = this.navigation.findPath(enemy, target, blockers);
        enemy.pathTarget = { ...target };
        enemy.repathAt = this.elapsedSeconds + navigationConfig.repathIntervalSeconds;
      }
      while (enemy.path.length && distance(enemy, enemy.path[0]) <= navigationConfig.waypointDistance) enemy.path.shift();
      // Smooth the next few nodes, while checking both obstacles and other enemies.
      for (let i = Math.min(enemy.path.length - 1, navigationConfig.smoothingLookahead); i > 0; i--) {
        if (lineIsClear(enemy, enemy.path[i], enemy.size, this.world, blockers)) { enemy.path.splice(0, i); break; }
      }
      goal = enemy.path[0] ?? target;
    } else {
      enemy.path = [];
    }
    const length = distance(enemy, goal);
    if (!length) return;
    const travel = Math.min(speed * deltaSeconds, length);
    const angle = Math.atan2(goal.y - enemy.y, goal.x - enemy.x);
    const start = { ...enemy };
    const primary = { ...enemy };
    let moved = moveBody(primary, Math.cos(angle) * travel, Math.sin(angle) * travel, this.world, blockers);
    let best = primary;
    if (moved < travel * navigationConfig.minimumForwardTravelRatio) {
      let bestScore = moved + (length - distance(primary, goal)) * navigationConfig.progressScoreWeight;
      const side = enemy.id % 2 === 0 ? 1 : -1;
      for (const offset of navigationConfig.avoidanceAngles) {
        const candidate = { ...start };
        const candidateTravel = moveBody(candidate, Math.cos(angle + offset * side) * travel, Math.sin(angle + offset * side) * travel, this.world, blockers);
        const score = candidateTravel + (length - distance(candidate, goal)) * navigationConfig.progressScoreWeight;
        if (score > bestScore) { best = candidate; bestScore = score; }
      }
      moved = distance(start, best);
    }
    enemy.x = best.x;
    enemy.y = best.y;
    const progress = length - distance(best, goal);
    // Sideways oscillation is also blocked progress, even if the body moves each frame.
    enemy.blockedSeconds = moved < travel * navigationConfig.stuckTravelRatio
      || progress < travel * navigationConfig.stuckTravelRatio ? enemy.blockedSeconds + deltaSeconds : 0;
  }
}
