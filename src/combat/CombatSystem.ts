import { combatConfig } from '../config/combat';
import { getEnemyWeapon, getPlayerWeapon } from '../config/weapons';
import type { BulletConfig, SwordConfig, WeaponConfig, WeaponKind } from '../config/weapons';
import type { Enemy } from '../enemies/EnemySystem';
import { distance, isInViewport, lineIsClear, moveBody } from '../world/geometry';
import type { CollisionWorld, Point, Viewport } from '../world/geometry';
import { bladeHitsBody, obstacleBulletHit } from './hitDetection';
import { segmentRoundedRectangleHit } from '../world/intersections';
import { clearAttackLine, effectiveAttackRange, swordSweep, validateWeapon } from './weaponRules';
import { assertNonNegative } from '../config/validate';
import type { Combatant, Faction } from './types';
import { receivedDamage } from './types';

export interface SwordAttack extends Point {
  id: number;
  ownerId: number;
  faction: Faction;
  damage: number;
  age: number;
  angle: number;
  weapon: SwordConfig;
  hitIds: Set<number>;
}
export interface BulletAttack extends Point {
  id: number;
  ownerId: number;
  faction: Faction;
  damage: number;
  age: number;
  travelled: number;
  velocityX: number;
  velocityY: number;
  weapon: BulletConfig;
}

export class CombatSystem {
  readonly swords: SwordAttack[] = [];
  readonly bullets: BulletAttack[] = [];
  private readonly cooldowns = new Map<number, number>();
  private nextAttackId = 1;
  private readonly playerWeapon: WeaponKind | undefined;
  private readonly defendPlayer?: (damage: number) => number;

  constructor(playerWeapon: WeaponKind | undefined, defendPlayer?: (damage: number) => number) {
    if (playerWeapon) validateWeapon(getPlayerWeapon(playerWeapon));
    this.playerWeapon = playerWeapon;
    this.defendPlayer = defendPlayer;
  }

  update(deltaSeconds: number, player: Combatant, enemies: readonly Enemy[], world: CollisionWorld, viewport: Viewport): void {
    assertNonNegative('combat.deltaSeconds', deltaSeconds);
    const actors: Combatant[] = [player, ...enemies];
    const alive = actors.filter((actor) => actor.hp > 0);
    const liveIds = new Set(alive.map((actor) => actor.id));
    for (const id of this.cooldowns.keys()) if (!liveIds.has(id)) this.cooldowns.delete(id);
    for (const actor of actors) {
      actor.hitFlashSeconds = Math.max(0, actor.hitFlashSeconds - deltaSeconds);
      actor.invulnerableSeconds = Math.max(0, actor.invulnerableSeconds - deltaSeconds);
      actor.attackLockSeconds = Math.max(0, actor.attackLockSeconds - deltaSeconds);
      if (actor.hp > 0 && actor.knockbackSeconds > 0) {
        const step = Math.min(deltaSeconds, actor.knockbackSeconds);
        const speed = combatConfig.knockbackSpeed * actor.knockbackSeconds / combatConfig.knockbackSeconds;
        moveBody(actor, actor.knockbackX * speed * step, actor.knockbackY * speed * step, world, alive.filter((other) => other !== actor));
        actor.knockbackSeconds = Math.max(0, actor.knockbackSeconds - deltaSeconds);
      }
      this.cooldowns.set(actor.id, Math.max(0, (this.cooldowns.get(actor.id) ?? 0) - deltaSeconds));
    }

    if (player.hp > 0 && this.playerWeapon) {
      const weapon = getPlayerWeapon(this.playerWeapon);
      const nearest = this.nearestTarget(player, enemies.filter((enemy) => enemy.hp > 0
        && (weapon.kind !== 'bullet' || isInViewport(enemy, enemy.size, viewport))), weapon.attackRange);
      if (weapon.kind === 'sword' || nearest) this.tryAttack(player, weapon, nearest);
    }
    for (const enemy of enemies) {
      if (enemy.archetype) continue; // 문서 기반 적은 전조와 개별 패턴으로 공격한다.
      const weapon = getEnemyWeapon(enemy.kind);
      if (enemy.hp > 0 && player.hp > 0 && enemy.state === 'attack'
        && (weapon.kind !== 'bullet' || isInViewport(enemy, enemy.size, viewport))
        && distance(enemy, player) <= effectiveAttackRange(weapon, player.size)
        && clearAttackLine(enemy, player, weapon, world)) {
        this.tryAttack(enemy, weapon, player);
      }
    }
    this.updateSwords(deltaSeconds, actors, world);
    this.updateBullets(deltaSeconds, actors, world);
    for (let index = this.swords.length - 1; index >= 0; index--) {
      if (!actors.some((actor) => actor.id === this.swords[index].ownerId && actor.hp > 0)) this.swords.splice(index, 1);
    }
  }

  private nearestTarget(owner: Combatant, targets: readonly Combatant[], range: number): Combatant | undefined {
    let nearest: Combatant | undefined;
    let nearestDistance = range;
    for (const target of targets) {
      const length = distance(owner, target);
      if (length <= nearestDistance) { nearest = target; nearestDistance = length; }
    }
    return nearest;
  }

  private tryAttack(owner: Combatant, weapon: WeaponConfig, target?: Combatant): void {
    validateWeapon(weapon);
    if ((this.cooldowns.get(owner.id) ?? 0) > Number.EPSILON || owner.attackLockSeconds > 0) return;
    const angle = target ? Math.atan2(target.y - owner.y, target.x - owner.x) : 0;
    const damage = owner.attackDamage * weapon.damageMultiplier;
    if (weapon.kind === 'sword') {
      this.swords.push({
        id: this.nextAttackId++, ownerId: owner.id, faction: owner.faction, damage,
        age: 0, angle, x: owner.x + Math.cos(angle) * weapon.orbitRadius,
        y: owner.y + Math.sin(angle) * weapon.orbitRadius, weapon, hitIds: new Set(),
      });
      if (owner.faction === 'enemy') owner.attackLockSeconds = weapon.lifetimeSeconds;
    } else if (target) {
      const offset = owner.size / 2 + weapon.radius + weapon.spawnGap;
      this.bullets.push({
        id: this.nextAttackId++, ownerId: owner.id, faction: owner.faction, damage,
        x: owner.x + Math.cos(angle) * offset, y: owner.y + Math.sin(angle) * offset,
        velocityX: Math.cos(angle) * weapon.speed, velocityY: Math.sin(angle) * weapon.speed,
        age: 0, travelled: 0, weapon,
      });
      if (owner.faction === 'enemy') owner.attackLockSeconds = weapon.attackLockSeconds;
    } else return;
    this.cooldowns.set(owner.id, weapon.intervalSeconds);
  }

  private hit(target: Combatant, faction: Faction, damage: number, from: Point): boolean {
    if (target.faction === faction || target.hp <= 0 || target.invulnerableSeconds > 0) return false;
    const appliedDamage = target.faction === 'player' && this.defendPlayer ? this.defendPlayer(damage) : receivedDamage(target, from, damage);
    target.hp = Math.max(0, target.hp - appliedDamage);
    target.hitFlashSeconds = combatConfig.hitFlashSeconds;
    target.invulnerableSeconds = combatConfig.invulnerabilitySeconds[target.faction];
    const length = distance(target, from);
    target.knockbackX = length ? (target.x - from.x) / length : 1;
    target.knockbackY = length ? (target.y - from.y) / length : 0;
    target.knockbackSeconds = combatConfig.knockbackSeconds;
    return true;
  }

  private updateSwords(deltaSeconds: number, actors: readonly Combatant[], world: CollisionWorld): void {
    for (let index = this.swords.length - 1; index >= 0; index--) {
      const sword = this.swords[index];
      validateWeapon(sword.weapon);
      const owner = actors.find((actor) => actor.id === sword.ownerId);
      if (!owner || owner.hp <= 0) { this.swords.splice(index, 1); continue; }
      const activeTime = Math.min(deltaSeconds, sword.weapon.lifetimeSeconds - sword.age);
      const rotation = sword.weapon.angularSpeed * activeTime;
      const samples = Math.max(1, Math.ceil(Math.abs(rotation) / sword.weapon.maximumHitAngleStep));
      const startAngle = sword.angle;
      for (let sample = 0; sample <= samples; sample++) {
        sword.angle = startAngle + rotation * sample / samples;
        sword.x = owner.x + Math.cos(sword.angle) * sword.weapon.orbitRadius;
        sword.y = owner.y + Math.sin(sword.angle) * sword.weapon.orbitRadius;
        const sweep = swordSweep(owner, sword.angle, sword.weapon);
        for (const target of actors) {
          if (target.faction === sword.faction || target.hp <= 0 || sword.hitIds.has(target.id)) continue;
          if (distance(owner, target) > sword.weapon.attackRange) continue;
          if (bladeHitsBody(sweep, sword.angle, sweep.length, sword.weapon.bladeWidth, target)
            && lineIsClear(owner, target, 0, world, [])) {
            // Each swing may affect each opposing target once, including an invulnerable contact.
            sword.hitIds.add(target.id);
            this.hit(target, sword.faction, sword.damage, owner);
          }
        }
      }
      sword.age += activeTime;
      if (sword.age >= sword.weapon.lifetimeSeconds - Number.EPSILON) this.swords.splice(index, 1);
    }
  }

  private updateBullets(deltaSeconds: number, actors: readonly Combatant[], world: CollisionWorld): void {
    for (let index = this.bullets.length - 1; index >= 0; index--) {
      const bullet = this.bullets[index];
      const weapon = bullet.weapon;
      validateWeapon(weapon);
      const activeTime = Math.max(0, Math.min(deltaSeconds, weapon.lifetimeSeconds - bullet.age, (weapon.maximumTravelDistance - bullet.travelled) / weapon.speed));
      const from = { x: bullet.x, y: bullet.y };
      const to = { x: bullet.x + bullet.velocityX * activeTime, y: bullet.y + bullet.velocityY * activeTime };
      let firstHit = Infinity;
      let victim: Combatant | undefined;
      for (const target of actors) {
        if (target.hp <= 0 || target.faction === bullet.faction) continue;
        const t = segmentRoundedRectangleHit(from, to, target, target.size / 2, target.size / 2, weapon.radius);
        if (t !== undefined && t < firstHit) { firstHit = t; victim = target; }
      }
      for (const obstacle of world.obstacles) {
        const t = obstacleBulletHit(from, to, weapon.radius, obstacle);
        if (t !== undefined && t <= firstHit) { firstHit = t; victim = undefined; }
      }
      for (const axis of world.unbounded ? [] : ['x', 'y'] as const) {
        const max = (axis === 'x' ? world.width : world.height) - weapon.radius;
        const delta = to[axis] - from[axis];
        if (from[axis] < weapon.radius || from[axis] > max) { firstHit = 0; victim = undefined; }
        else if (delta && (to[axis] < weapon.radius || to[axis] > max)) {
          const t = ((delta < 0 ? weapon.radius : max) - from[axis]) / delta;
          if (t <= firstHit) { firstHit = t; victim = undefined; }
        }
      }
      if (firstHit !== Infinity) {
        if (victim) this.hit(victim, bullet.faction, bullet.damage, from);
        this.bullets.splice(index, 1);
        continue;
      }
      bullet.x = to.x;
      bullet.y = to.y;
      bullet.age += activeTime;
      bullet.travelled += weapon.speed * activeTime;
      if (bullet.age >= weapon.lifetimeSeconds - Number.EPSILON || bullet.travelled >= weapon.maximumTravelDistance - Number.EPSILON) this.bullets.splice(index, 1);
    }
  }
}
