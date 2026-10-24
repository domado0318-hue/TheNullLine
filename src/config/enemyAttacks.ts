import type { EnemyId } from './enemyRoster';
export type AttackKind = 'melee'|'shot'|'lob'|'charge'|'explode'|'summon'|'hook'|'beam'|'shield'|'command'|'stamp'|'call';
export interface EnemyAttack {
  kind: AttackKind;
  windup: number; // 공격 전조 시간 (초)
  recovery: number; // 공격 후 빈틈 (초)
  interval: number; // 준비 시작 간 최소 주기 (초)
  damage: number; // Player 최대 HP 대비 피해 (비율)
  range: number; // 준비 시작 가능 중심 거리 (px)
  radius?: number; // 폭발·근접 반경 (px)
  arc?: number; // 근접/확산 각도 (라디안)
  count?: number; // 동시 탄·소환 수 (개/마리)
  bursts?: number; // 연속 발사·표시 횟수
  gap?: number; // 연속 발사·표시 간격 (초)
  delay?: number; // 위치 표시 후 판정 지연 (초)
  length?: number; // 돌진·절단·인양 길이 (px)
  width?: number; // 절단·인양·돌진 폭 (px)
  active?: number; // 빔·돌진 유지 시간 (초)
  repeats?: number; // 연속 공격 횟수
  secondWindup?: number; // 2회째 전조 (초)
}
export const enemyAttacks: Record<Exclude<EnemyId,'B01'|'B02'|'B03'>,EnemyAttack> = {
  E01: {
    kind: 'melee', // 공격 판정 종류
    windup: .5, // 공격 전조 (초)
    recovery: .8, // 공격 후 빈틈 (초)
    interval: 1.3, // 준비 시작 간 최소 주기 (초)
    damage: .06, // Player 최대 HP 대비 피해 비율
    range: 76, // 준비 시작 가능 중심 거리 (px)
    radius: 82, // 공격·효과 반경 (px)
    arc: Math.PI*.7, // 공격·확산 각도 (라디안)
  },
  E02: {
    kind: 'melee', // 공격 판정 종류
    windup: .35, // 공격 전조 (초)
    recovery: 1, // 공격 후 빈틈 (초)
    interval: 1.35, // 준비 시작 간 최소 주기 (초)
    damage: .04, // Player 최대 HP 대비 피해 비율
    range: 68, // 준비 시작 가능 중심 거리 (px)
    radius: 74, // 공격·효과 반경 (px)
    arc: Math.PI*.6, // 공격·확산 각도 (라디안)
  },
  E03: {
    kind: 'melee', // 공격 판정 종류
    windup: 1, // 공격 전조 (초)
    recovery: 1.5, // 공격 후 빈틈 (초)
    interval: 2.5, // 준비 시작 간 최소 주기 (초)
    damage: .12, // Player 최대 HP 대비 피해 비율
    range: 108, // 준비 시작 가능 중심 거리 (px)
    radius: 120, // 공격·효과 반경 (px)
    arc: Math.PI*.85, // 공격·확산 각도 (라디안)
  },
  E04: {
    kind: 'shot', // 공격 판정 종류
    windup: .6, // 공격 전조 (초)
    recovery: .35, // 공격 후 빈틈 (초)
    interval: 2.4, // 준비 시작 간 최소 주기 (초)
    damage: .05, // Player 최대 HP 대비 피해 비율
    range: 350, // 준비 시작 가능 중심 거리 (px)
    count: 1, // 동시 탄·소환 수 (개/마리)
  },
  E05: {
    kind: 'shot', // 공격 판정 종류
    windup: .8, // 공격 전조 (초)
    recovery: .35, // 공격 후 빈틈 (초)
    interval: 3.2, // 준비 시작 간 최소 주기 (초)
    damage: .03, // Player 최대 HP 대비 피해 비율
    range: 350, // 준비 시작 가능 중심 거리 (px)
    count: 1, // 동시 탄·소환 수 (개/마리)
    bursts: 3, // 연속 발사·표시 횟수 (회)
    gap: .2, // 연속 발사·표시 간격 (초)
  },
  E06: {
    kind: 'shot', // 공격 판정 종류
    windup: .9, // 공격 전조 (초)
    recovery: .35, // 공격 후 빈틈 (초)
    interval: 3.6, // 준비 시작 간 최소 주기 (초)
    damage: .04, // Player 최대 HP 대비 피해 비율
    range: 290, // 준비 시작 가능 중심 거리 (px)
    count: 5, // 동시 탄·소환 수 (개/마리)
    arc: Math.PI/3, // 공격·확산 각도 (라디안)
  },
  E07: {
    kind: 'lob', // 공격 판정 종류
    windup: 0, // 공격 전조 (초)
    recovery: .6, // 공격 후 빈틈 (초)
    interval: 4.5, // 준비 시작 간 최소 주기 (초)
    damage: .10, // Player 최대 HP 대비 피해 비율
    range: 350, // 준비 시작 가능 중심 거리 (px)
    radius: 72, // 공격·효과 반경 (px)
    delay: 1.3, // 위치 표시 후 판정 지연 (초)
  },
  E08: {
    kind: 'charge', // 공격 판정 종류
    windup: .9, // 공격 전조 (초)
    recovery: 1.4, // 공격 후 빈틈 (초)
    interval: 4.5, // 준비 시작 간 최소 주기 (초)
    damage: .10, // Player 최대 HP 대비 피해 비율
    range: 360, // 준비 시작 가능 중심 거리 (px)
    length: 336, // 공격 길이 (px)
    width: 40, // 공격 폭 (px)
    active: .55, // 실제 공격·효과 지속 (초)
  },
  E09: {
    kind: 'melee', // 공격 판정 종류
    windup: .8, // 공격 전조 (초)
    recovery: 1.2, // 공격 후 빈틈 (초)
    interval: 2, // 준비 시작 간 최소 주기 (초)
    damage: .08, // Player 최대 HP 대비 피해 비율
    range: 86, // 준비 시작 가능 중심 거리 (px)
    radius: 94, // 공격·효과 반경 (px)
    arc: Math.PI*.65, // 공격·확산 각도 (라디안)
  },
  E10: {
    kind: 'charge', // 공격 판정 종류
    windup: 1, // 공격 전조 (초)
    recovery: 1.6, // 공격 후 빈틈 (초)
    interval: 3.5, // 준비 시작 간 최소 주기 (초)
    damage: .10, // Player 최대 HP 대비 피해 비율
    range: 220, // 준비 시작 가능 중심 거리 (px)
    length: 168, // 공격 길이 (px)
    width: 48, // 공격 폭 (px)
    active: .4, // 실제 공격·효과 지속 (초)
  },
  E11: {
    kind: 'explode', // 공격 판정 종류
    windup: .9, // 공격 전조 (초)
    recovery: 0, // 공격 후 빈틈 (초)
    interval: .9, // 준비 시작 간 최소 주기 (초)
    damage: .10, // Player 최대 HP 대비 피해 비율
    range: 100, // 준비 시작 가능 중심 거리 (px)
    radius: 120, // 공격·효과 반경 (px)
  },
  E12: {
    kind: 'explode', // 공격 판정 종류
    windup: 1.2, // 공격 전조 (초)
    recovery: 0, // 공격 후 빈틈 (초)
    interval: 1.2, // 준비 시작 간 최소 주기 (초)
    damage: .10, // Player 최대 HP 대비 피해 비율
    range: 100, // 준비 시작 가능 중심 거리 (px)
    radius: 96, // 공격·효과 반경 (px)
    count: 3, // 동시 탄·소환 수 (개/마리)
    delay: .8, // 위치 표시 후 판정 지연 (초)
  },
  E13: {
    kind: 'summon', // 공격 판정 종류
    windup: 1.3, // 공격 전조 (초)
    recovery: 8, // 공격 후 빈틈 (초)
    interval: 9.3, // 준비 시작 간 최소 주기 (초)
    damage: 0, // Player 최대 HP 대비 피해 비율
    range: 500, // 준비 시작 가능 중심 거리 (px)
    count: 2, // 동시 탄·소환 수 (개/마리)
  },
  E14: {
    kind: 'summon', // 공격 판정 종류
    windup: 1.5, // 공격 전조 (초)
    recovery: 9, // 공격 후 빈틈 (초)
    interval: 10.5, // 준비 시작 간 최소 주기 (초)
    damage: 0, // Player 최대 HP 대비 피해 비율
    range: 500, // 준비 시작 가능 중심 거리 (px)
    count: 2, // 동시 탄·소환 수 (개/마리)
  },
  E15: {
    kind: 'hook', // 공격 판정 종류
    windup: 1, // 공격 전조 (초)
    recovery: 1.6, // 공격 후 빈틈 (초)
    interval: 4.8, // 준비 시작 간 최소 주기 (초)
    damage: .06, // Player 최대 HP 대비 피해 비율
    range: 384, // 준비 시작 가능 중심 거리 (px)
    length: 384, // 공격 길이 (px)
    width: 38.4, // 공격 폭 (px)
    active: .35, // 실제 공격·효과 지속 (초)
  },
  E16: {
    kind: 'beam', // 공격 판정 종류
    windup: 1.2, // 공격 전조 (초)
    recovery: 1.4, // 공격 후 빈틈 (초)
    interval: 4.5, // 준비 시작 간 최소 주기 (초)
    damage: .10, // Player 최대 HP 대비 피해 비율
    range: 432, // 준비 시작 가능 중심 거리 (px)
    length: 432, // 공격 길이 (px)
    width: 48, // 공격 폭 (px)
    active: .5, // 실제 공격·효과 지속 (초)
  },
  E17: {
    kind: 'shield', // 공격 판정 종류
    windup: 1.2, // 공격 전조 (초)
    recovery: 4.8, // 공격 후 빈틈 (초)
    interval: 6, // 준비 시작 간 최소 주기 (초)
    damage: 0, // Player 최대 HP 대비 피해 비율
    range: 500, // 준비 시작 가능 중심 거리 (px)
    radius: 336, // 공격·효과 반경 (px)
    count: 2, // 동시 탄·소환 수 (개/마리)
    active: 4, // 실제 공격·효과 지속 (초)
  },
  X01: {
    kind: 'charge', // 공격 판정 종류
    windup: .9, // 공격 전조 (초)
    recovery: 2, // 공격 후 빈틈 (초)
    interval: 5.8, // 준비 시작 간 최소 주기 (초)
    damage: .10, // Player 최대 HP 대비 피해 비율
    range: 360, // 준비 시작 가능 중심 거리 (px)
    length: 336, // 공격 길이 (px)
    width: 48, // 공격 폭 (px)
    active: .55, // 실제 공격·효과 지속 (초)
    repeats: 2, // 연속 공격 횟수 (회)
    secondWindup: .7, // 두 번째 전조 (초)
  },
  X02: {
    kind: 'summon', // 공격 판정 종류
    windup: 1.3, // 공격 전조 (초)
    recovery: 8, // 공격 후 빈틈 (초)
    interval: 9.3, // 준비 시작 간 최소 주기 (초)
    damage: 0, // Player 최대 HP 대비 피해 비율
    range: 500, // 준비 시작 가능 중심 거리 (px)
    count: 3, // 동시 탄·소환 수 (개/마리)
  },
  X03: {
    kind: 'beam', // 공격 판정 종류
    windup: 1.2, // 공격 전조 (초)
    recovery: 1.8, // 공격 후 빈틈 (초)
    interval: 7, // 준비 시작 간 최소 주기 (초)
    damage: .10, // Player 최대 HP 대비 피해 비율
    range: 432, // 준비 시작 가능 중심 거리 (px)
    length: 432, // 공격 길이 (px)
    width: 48, // 공격 폭 (px)
    active: .5, // 실제 공격·효과 지속 (초)
    repeats: 2, // 연속 공격 횟수 (회)
    secondWindup: 1, // 두 번째 전조 (초)
    gap: .4, // 연속 발사·표시 간격 (초)
  },
};
export const enemyAttackVisuals = {
  shotWarningWidth: 24, // 일반 사격 방향 경고선 폭 (px, 피해 판정과 독립)
  bossShotWarningWidth: 44, // 보스 사격 방향 경고선 폭 (px, 피해 판정과 독립)
  projectileScale: 1.6, // 일반 탄환 이미지 확대 배율 (충돌 반경 유지)
  bossProjectileScale: 2.8, // 보스 탄환 이미지 확대 배율 (충돌 반경 유지)
  windupSquash: 0.08, // 준비 중 캐릭터 몸체 압축 비율 (표시 전용)
  activeLungePixels: 10, // 발동 순간 공격 방향으로 뻗는 표시 거리 (px)
  recoveryRecoilPixels: 3, // 회복 중 공격 반대 방향 반동 거리 (px)
  activeTiltRadians: 0.08, // 발동 순간 몸체 기울기 (라디안)
};
export const enemyCombatConfig = {
  spawnGrace: 1, // 등장 후 공격 금지 시간 (초)
  summonFirstDelay: 2, // 소환자의 첫 준비 시작 대기 (초)
  summonLimit: 2, // 개체당 성공 소환 횟수 상한 (회)
  summonedAlive: 4, // 일반 소환자의 전장 전체 생존 상한 (마리)
  firingSlots: 2, // 동시에 사격 동작 중인 일반 적 상한 (마리)
  bossFiringSlots: 1, // 보스 사격 중 증원 사격 상한 (마리)
  projectileSpeed: 270, // 일반 탄 속도 (px/초), 플레이 테스트 조정값
  projectileRadius: 5, // 일반 탄 반경 (px)
  projectileLifetime: 5, // 일반 탄 수명 (초)
  shieldReduction: .25, // 중계 피해 감소 비율
  frontalArc: Math.PI*2/3, // 방패 정면 범위 (라디안, 120도)
  frontalGuard: .7, // 방패병 정면 피해 감소 비율
  frontalAssault: .5, // 강습 방패병 정면 피해 감소 비율
  maximumReduction: .7, // 방패+중계의 최종 피해 감소 상한 (비율)
  pullDistance: 96, // 인양 최대 이동 거리 (px, 2U)
  pullSeconds: .35, // 인양 진행 시간 (초)
  pullImmunity: 2, // 인양 이후 재인양 면역 (초)
  pullSafety: .6, // 인양 종료 후 특수 공격 잠금 (초)
  splitRadius: 57.6, // 소형 분열 폭발 반경 (px, 1.2U)
  splitOffset: 108, // 분열 폭탄 착지 중심 거리 (px)
  splitDamage: .06, // 소형 폭발 피해 / Player 최대 HP
  bossTurn: .8, // 보스 패턴 사이 이동·방향 조정 (초)
  bossTransition: 1.5, // 보스 단계 전환 시간 (초)
  bossCall: 1.5, // 보스 증원 위치 표시 시간 (초)
  meleeApproach: 2, // 보스 근접 공격 전 최대 접근 시간 (초)
  safeCorridor: 144, // 위험 배치 시 확보할 몸체 제외 도주 폭 (px, 3U)
};
export const bossAttacks: Record<'B01'|'B02'|'B03',Record<string,EnemyAttack>> = {
  B01: {
    melee: {
      kind: 'melee', // 공격 판정 종류
      windup: 1, // 공격 전조 (초)
      recovery: 1.6, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .15, // Player 최대 HP 대비 피해 비율
      range: 180, // 준비 시작 가능 중심 거리 (px)
      radius: 190, // 공격·효과 반경 (px)
      arc: Math.PI*.85, // 공격·확산 각도 (라디안)
    },
    shot: {
      kind: 'shot', // 공격 판정 종류
      windup: .8, // 공격 전조 (초)
      recovery: 1.2, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .04, // Player 최대 HP 대비 피해 비율
      range: 500, // 준비 시작 가능 중심 거리 (px)
      count: 1, // 동시 탄·소환 수 (개/마리)
      bursts: 3, // 연속 발사·표시 횟수 (회)
      gap: .25, // 연속 발사·표시 간격 (초)
    },
    charge: {
      kind: 'charge', // 공격 판정 종류
      windup: 1.2, // 공격 전조 (초)
      recovery: 2, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .15, // Player 최대 HP 대비 피해 비율
      range: 650, // 준비 시작 가능 중심 거리 (px)
      length: 600, // 공격 길이 (px)
      width: 100, // 공격 폭 (px)
      active: .8, // 실제 공격·효과 지속 (초)
    },
    lob: {
      kind: 'lob', // 공격 판정 종류
      windup: 0, // 공격 전조 (초)
      recovery: 1.4, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .12, // Player 최대 HP 대비 피해 비율
      range: 600, // 준비 시작 가능 중심 거리 (px)
      radius: 90, // 공격·효과 반경 (px)
      delay: 1.4, // 위치 표시 후 판정 지연 (초)
    },
  },
  B02: {
    shot: {
      kind: 'shot', // 공격 판정 종류
      windup: .9, // 공격 전조 (초)
      recovery: 1.3, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .05, // Player 최대 HP 대비 피해 비율
      range: 600, // 준비 시작 가능 중심 거리 (px)
      count: 1, // 동시 탄·소환 수 (개/마리)
      bursts: 3, // 연속 발사·표시 횟수 (회)
      gap: .25, // 연속 발사·표시 간격 (초)
    },
    lob: {
      kind: 'lob', // 공격 판정 종류
      windup: 0, // 공격 전조 (초)
      recovery: 1.5, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .12, // Player 최대 HP 대비 피해 비율
      range: 600, // 준비 시작 가능 중심 거리 (px)
      radius: 90, // 공격·효과 반경 (px)
      delay: 1.4, // 위치 표시 후 판정 지연 (초)
      bursts: 2, // 연속 발사·표시 횟수 (회)
      gap: .7, // 연속 발사·표시 간격 (초)
    },
    melee: {
      kind: 'melee', // 공격 판정 종류
      windup: 1, // 공격 전조 (초)
      recovery: 1.8, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .15, // Player 최대 HP 대비 피해 비율
      range: 200, // 준비 시작 가능 중심 거리 (px)
      radius: 210, // 공격·효과 반경 (px)
      arc: Math.PI*150/180, // 공격·확산 각도 (라디안)
    },
    command: {
      kind: 'command', // 공격 판정 종류
      windup: 1.2, // 공격 전조 (초)
      recovery: 2, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: 0, // Player 최대 HP 대비 피해 비율
      range: 1000, // 준비 시작 가능 중심 거리 (px)
      active: 6, // 실제 공격·효과 지속 (초)
    },
  },
  B03: {
    shot: {
      kind: 'shot', // 공격 판정 종류
      windup: 1, // 공격 전조 (초)
      recovery: 1.5, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .04, // Player 최대 HP 대비 피해 비율
      range: 650, // 준비 시작 가능 중심 거리 (px)
      count: 3, // 동시 탄·소환 수 (개/마리)
      arc: Math.PI/9, // 공격·확산 각도 (라디안)
      bursts: 3, // 연속 발사·표시 횟수 (회)
      gap: .3, // 연속 발사·표시 간격 (초)
    },
    melee: {
      kind: 'melee', // 공격 판정 종류
      windup: 1.2, // 공격 전조 (초)
      recovery: 2, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .16, // Player 최대 HP 대비 피해 비율
      range: 210, // 준비 시작 가능 중심 거리 (px)
      radius: 225, // 공격·효과 반경 (px)
      arc: Math.PI*140/180, // 공격·확산 각도 (라디안)
    },
    beam: {
      kind: 'beam', // 공격 판정 종류
      windup: 1.4, // 공격 전조 (초)
      recovery: 1.8, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .12, // Player 최대 HP 대비 피해 비율
      range: 600, // 준비 시작 가능 중심 거리 (px)
      length: 480, // 공격 길이 (px)
      width: 48, // 공격 폭 (px)
      active: .6, // 실제 공격·효과 지속 (초)
    },
    charge: {
      kind: 'charge', // 공격 판정 종류
      windup: 1.3, // 공격 전조 (초)
      recovery: 2.2, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .15, // Player 최대 HP 대비 피해 비율
      range: 650, // 준비 시작 가능 중심 거리 (px)
      length: 600, // 공격 길이 (px)
      width: 96, // 공격 폭 (px)
      active: .8, // 실제 공격·효과 지속 (초)
    },
    stamp: {
      kind: 'stamp', // 공격 판정 종류
      windup: 0, // 공격 전조 (초)
      recovery: 2, // 공격 후 빈틈 (초)
      interval: 0, // 준비 시작 간 최소 주기 (초)
      damage: .10, // Player 최대 HP 대비 피해 비율
      range: 650, // 준비 시작 가능 중심 거리 (px)
      radius: 72, // 공격·효과 반경 (px)
      delay: 1.6, // 위치 표시 후 판정 지연 (초)
      bursts: 3, // 연속 발사·표시 횟수 (회)
      gap: .6, // 연속 발사·표시 간격 (초)
    },
  },
};
