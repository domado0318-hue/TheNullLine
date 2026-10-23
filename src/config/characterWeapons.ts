// 캐릭터 전용 공격과 발동 조건. 스킬별 레벨 수치는 skills.ts에서 관리한다.
export const characterWeapons = {
  mechanic: {
    interval: 0.8, // 절단기 생성 간격 (초)
    duration: 0.55, // 한 바퀴 지속시간 (초), 최대 공속의 생성 간격 0.56초보다 짧게 유지
    radius: 64, // 플레이어 중심에서 톱날 중심까지의 거리 (px)
    range: 112, // 표적 탐색·최대 타격 중심 거리 (px)
    length: 64, // 톱날 지름·반경 방향 판정 길이 (px)
    width: 18, // 회전 궤적 접선 방향 판정 폭 (px)
    angleStep: 0.1, // 회전 판정 샘플 최대 간격 (rad)
    knockback: 12, // 일반 밀쳐내기 (px)
    strongEvery: 4, // 강타 주기 (공격 횟수)
    strongBonus: 50, // 강타 피해 증가 (%)
    strongKnockback: 60, // 강타 밀쳐내기 (px)
    chargeDistance: 500, // 관성 절삭 충전 거리 (px)
    crowdRadius: 180, // 작업 자세 주변 적 검사 반경 (px)
    crowdCount: 3, // 작업 자세 필요 적 수 (명)
    shieldDuration: 3, // 충격 회수 보호막 (초)
    healCooldown: 8, // 긴급 정비 재사용 대기 (초)
    killCount: 12, // 회수 정비 발동 처치 수
  },
  signal: {
    interval: 0.9, // 방전 간격 (초)
    range: 460, // 최초 표적 사거리 (px)
    chainRange: 150, // 전이 거리 (px)
    chainCount: 3, // 최초 대상 포함 최대 적 수
    retention: 80, // 전이 피해 유지율 (%)
    crowdRadius: 150, // 공진 밀집 검사 반경 (px)
    crowdCount: 3, // 공진/잔류 전하 필요 적 수
    chargeDistance: 400, // 이동 축전 충전 거리 (px)
    slow: 30, // 이동 축전 둔화 (%)
    shieldDuration: 4, // 잔류 전하 보호막 (초)
    shieldCooldown: 6, // 잔류 전하 재사용 (초)
    deathCooldown: 3, // 차단 방전 재사용 (초)
    deathRadius: 100, // 차단 방전 폭발 반경 (px)
    healDelay: 8, // 무피해 재충전 준비 (초)
    healInterval: 2, // 준비 후 회복 간격 (초)
    branchCount: 2, // 첫 대상에서 추가로 분기하는 최대 적 수 (명)
    overloadRadius: 90, // 종단 과부하 반경 (px)
    overloadMinimum: 2, // 과부하에 필요한 기본 연쇄 대상 수 (명)
    pulseSlow: 30, // 접지 펄스 이동 둔화 (%)
    pulseSlowDuration: 1.5, // 접지 펄스 둔화 유지 (초)
  },
  carrier: {
    interval: 1.2, // 함정 설치 간격 (초)
    armSeconds: 0.4, // 설치 후 감지 준비 (초)
    radius: 10, // 함정 표시 반경 (px)
    triggerRange: 55, // 적 중심 감지 거리 (px)
    blastRadius: 100, // 폭발 반경 (px)
    damage: 1.3, // 기본 공격력 배율
    knockback: 15, // 폭발 밀쳐내기 (px)
    lifetime: 10, // 함정 수명 (초)
    maximum: 8, // 동시 함정 수
    chargeDistance: 500, // 강화 충전 이동 거리 (px)
    chargeBonus: 50, // 강화 함정 피해 증가 (%)
    slowDuration: 2, // 점착 둔화 유지 (초)
    movingSeconds: 2, // 운반 관성 준비 시간 (초)
    stoppedSeconds: 0.3, // 운반 관성 해제까지 멈춤 시간 (초)
    shieldCount: 3, // 보호막 발동에 필요한 적중 수
    shieldDuration: 4, // 충격 포장재 보호막 (초)
    shieldCooldown: 6, // 충격 포장재 재사용 (초)
    killCount: 15, // 잔여 물자 발동 처치 수
    scrapMaximum: 3, // 기본 함정과 별도로 유지하는 파편 덫 상한 (개)
    trailSlow: 30, // 점착 흔적 이동 둔화 (%)
    trailSlowDuration: 1, // 점착 흔적 적중 후 둔화 유지 (초)
  },
  vulnerabilityDuration: 3, // 균열/취약 신호 지속 (초)
  killSpeedDuration: 3, // 처치 이동 속도 효과 지속 (초)
  effectDuration: 0.18, // 순간 타격 시각 효과 지속 (초)
  zoneTick: 0.5, // 장판 피해 주기 (초)
  zoneDuration: 3, // 장판 수명 (초)
  projectileGap: 3, // 몸체 외곽과 투사체 사이 간격 (px)
};

export interface AuxiliaryConfig {
  kind: 'projectile' | 'pulse' | 'zone' | 'cone' | 'slash' | 'passive' | 'trap' | 'lure';
  interval: number; // 자동 발동 간격 (초), 기본 공격에 연결되는 passive는 0
  range: number; // 탐색 또는 부채꼴 거리 (px)
  radius: number; // 투사체·공격 범위 반경 (px)
  speed: number; // 투사체 속도 (px/초), 비투사체는 0
  lifetime: number; // 투사체·장판·함정 수명 (초), 순간 공격 및 스킬별 수명은 0
  pierce: number; // 최대 투사체 적중 수
  knockback: number; // 밀쳐내기 (px)
  explosion: number; // 직격 대신 폭발하는 반경 (px), 없으면 0
  targeted: boolean; // 발동에 사거리 안의 유효 표적이 필요한지 여부
}

// 각 행은 스킬 07~10 순서. 거리 px, 시간 초, 속도 px/초, pierce는 적 수.
export const auxiliaryWeapons: Record<'mechanic' | 'signal' | 'carrier', readonly AuxiliaryConfig[]> = {
  mechanic: [
    { kind: 'slash', interval: 3, range: 140, radius: 140, speed: 0, lifetime: 0, pierce: 0, knockback: 0, explosion: 0, targeted: true },
    { kind: 'pulse', interval: 5, range: 140, radius: 140, speed: 0, lifetime: 0, pierce: 0, knockback: 30, explosion: 0, targeted: false },
    { kind: 'passive', interval: 0, range: 0, radius: 0, speed: 0, lifetime: 0, pierce: 0, knockback: 0, explosion: 0, targeted: false },
    { kind: 'zone', interval: 6, range: 0, radius: 80, speed: 0, lifetime: 3, pierce: 0, knockback: 0, explosion: 0, targeted: false },
  ],
  signal: [
    { kind: 'pulse', interval: 5, range: 150, radius: 150, speed: 0, lifetime: 0, pierce: 0, knockback: 0, explosion: 0, targeted: false },
    { kind: 'passive', interval: 0, range: 0, radius: 0, speed: 0, lifetime: 0, pierce: 0, knockback: 0, explosion: 0, targeted: false },
    { kind: 'zone', interval: 7, range: 400, radius: 100, speed: 0, lifetime: 3, pierce: 0, knockback: 0, explosion: 0, targeted: true },
    { kind: 'passive', interval: 0, range: 0, radius: 0, speed: 0, lifetime: 0, pierce: 0, knockback: 0, explosion: 0, targeted: false },
  ],
  carrier: [
    { kind: 'trap', interval: 3, range: 55, radius: 80, speed: 0, lifetime: 8, pierce: 0, knockback: 0, explosion: 0, targeted: false },
    { kind: 'zone', interval: 4, range: 0, radius: 65, speed: 0, lifetime: 3, pierce: 0, knockback: 0, explosion: 0, targeted: false },
    { kind: 'lure', interval: 6, range: 0, radius: 0, speed: 0, lifetime: 0, pierce: 0, knockback: 0, explosion: 0, targeted: false },
    { kind: 'passive', interval: 0, range: 0, radius: 0, speed: 0, lifetime: 0, pierce: 0, knockback: 0, explosion: 0, targeted: false },
  ],
};
