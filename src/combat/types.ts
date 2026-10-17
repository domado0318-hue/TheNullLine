import type { Body } from '../world/geometry';

export type Faction = 'player' | 'enemy';
export interface Combatant extends Body {
  faction: Faction;
  hp: number;
  maxHp: number;
  attackDamage: number;
  hitFlashSeconds: number;
  invulnerableSeconds: number;
  knockbackSeconds: number;
  knockbackX: number;
  knockbackY: number;
  attackLockSeconds: number;
}

export function createCombatant(body: Body, faction: Faction, maxHp: number, attackDamage: number): Combatant {
  return {
    ...body, faction, hp: maxHp, maxHp, attackDamage,
    hitFlashSeconds: 0, invulnerableSeconds: 0, knockbackSeconds: 0,
    knockbackX: 0, knockbackY: 0, attackLockSeconds: 0,
  };
}
