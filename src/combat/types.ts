import type { Body, Point } from '../world/geometry';
import { enemyCombatConfig } from '../config/enemyAttacks';

export type Faction = 'player' | 'enemy';
export interface LureTarget extends Point { radius: number; remaining: number }
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
  movementMultiplier?: number; // 상태 효과의 이동 속도 배율, 없으면 1
  facingAngle?: number; // 방향성 방어의 정면 방향 (라디안)
  frontalReduction?: number; // 현재 정면 피해 감소 비율
  damageReduction?: number; // 현재 중계 피해 감소 비율 (중첩하지 않음)
  damageReductionSources?: {hp:number}[]; // 같은 단계 도중 사망한 중계기 효과도 즉시 해제
  archetype?: string; // 문서 기반 적 ID; 기존 검/탄환 적과 구분
}

export function receivedDamage(target: Combatant, from: Point, damage: number): number {
  const direction = Math.atan2(from.y-target.y,from.x-target.x)-(target.facingAngle??0);
  const frontal = Math.abs(Math.atan2(Math.sin(direction),Math.cos(direction))) <= enemyCombatConfig.frontalArc/2 ? target.frontalReduction??0 : 0;
  const relay=target.damageReductionSources&&!target.damageReductionSources.some(source=>source.hp>0)?0:target.damageReduction??0;
  return damage * Math.max(1-enemyCombatConfig.maximumReduction,(1-frontal)*(1-relay));
}

export function createCombatant(body: Body, faction: Faction, maxHp: number, attackDamage: number): Combatant {
  return {
    ...body, faction, hp: maxHp, maxHp, attackDamage,
    hitFlashSeconds: 0, invulnerableSeconds: 0, knockbackSeconds: 0,
    knockbackX: 0, knockbackY: 0, attackLockSeconds: 0,
  };
}
