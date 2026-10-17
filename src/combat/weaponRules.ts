import type { SwordConfig, WeaponConfig } from '../config/weapons';
import { assertNonNegative, assertPositive } from '../config/validate';
import { lineIsClear } from '../world/geometry';
import type { CollisionWorld, Point } from '../world/geometry';

export function validateWeapon(weapon: WeaponConfig): void {
  const name = `weapons.${weapon.kind}`;
  assertPositive(`${name}.intervalSeconds`, weapon.intervalSeconds);
  assertNonNegative(`${name}.attackRange`, weapon.attackRange);
  assertNonNegative(`${name}.damageMultiplier`, weapon.damageMultiplier);
  assertPositive(`${name}.lifetimeSeconds`, weapon.lifetimeSeconds);
  if (weapon.kind === 'sword') {
    assertNonNegative(`${name}.orbitRadius`, weapon.orbitRadius);
    assertPositive(`${name}.angularSpeed`, Math.abs(weapon.angularSpeed));
    assertPositive(`${name}.bladeLength`, weapon.bladeLength);
    assertPositive(`${name}.bladeWidth`, weapon.bladeWidth);
    assertPositive(`${name}.maximumHitAngleStep`, weapon.maximumHitAngleStep);
  } else {
    assertPositive(`${name}.radius`, weapon.radius);
    assertPositive(`${name}.speed`, weapon.speed);
    assertPositive(`${name}.maximumTravelDistance`, weapon.maximumTravelDistance);
    assertNonNegative(`${name}.spawnGap`, weapon.spawnGap);
    assertNonNegative(`${name}.attackLockSeconds`, weapon.attackLockSeconds);
  }
}

export function effectiveAttackRange(weapon: WeaponConfig, targetSize: number): number {
  // A larger configured range must not let AI stop outside the sword's real reach.
  return weapon.kind === 'sword'
    ? Math.min(weapon.attackRange, weapon.orbitRadius + weapon.bladeLength / 2 + targetSize / 2)
    : weapon.attackRange;
}

export function clearAttackLine(from: Point, to: Point, weapon: WeaponConfig, world: CollisionWorld): boolean {
  return lineIsClear(from, to, weapon.kind === 'bullet' ? weapon.radius * 2 : 0, world, [], weapon.kind === 'bullet' ? 'circle' : 'square');
}

export function swordSweep(owner: Point, angle: number, weapon: SwordConfig): { x: number; y: number; length: number } {
  const length = weapon.orbitRadius + weapon.bladeLength / 2;
  return { x: owner.x + Math.cos(angle) * length / 2, y: owner.y + Math.sin(angle) * length / 2, length };
}
