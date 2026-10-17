export type WeaponKind = 'sword' | 'bullet';

interface CommonWeaponConfig {
  kind: WeaponKind; // 공격 방식: 검 또는 탄환
  intervalSeconds: number; // 공격 생성 간격 (초)
  attackRange: number; // 소유자 중심과 대상 중심 사이의 최대 발사/공격 거리: px
  damageMultiplier: number; // 소유자의 attackDamage에 곱할 배율
  color: number; // 무기 색상 (0xRRGGBB)
}
export interface SwordConfig extends CommonWeaponConfig {
  kind: 'sword'; // 회전 검 공격
  orbitRadius: number; // 검 중심의 회전 반지름: px
  angularSpeed: number; // rad/초
  lifetimeSeconds: number; // 검 한 개의 유지 시간 (초)
  bladeLength: number; // 검 길이 (px)
  bladeWidth: number; // 검 폭 (px)
  maximumHitAngleStep: number; // 회전 중 판정 누락을 막는 각도 간격: rad
}
export interface BulletConfig extends CommonWeaponConfig {
  kind: 'bullet'; // 직선 탄환 공격
  radius: number; // 탄환 반지름 (px)
  speed: number; // px/초
  lifetimeSeconds: number; // 탄환 최대 유지 시간 (초)
  maximumTravelDistance: number; // 탄환 최대 이동 거리 (px)
  spawnGap: number; // 발사자 외곽과 탄환 외곽 사이의 생성 여유 (px)
  attackLockSeconds: number; // Enemy만 적용하는 발사 직후 이동 정지 시간
}
export type WeaponConfig = SwordConfig | BulletConfig;

export const playerSwordConfig: SwordConfig = {
  kind: 'sword', // Player 회전 검
  intervalSeconds: 0.5, // 검 생성 간격 (초)
  attackRange: 160, // 공격 가능한 최대 중심 거리 (px, Enemy 검보다 긴 초기 사거리)
  damageMultiplier: 1, // Player 기본 공격력에 곱할 배율
  color: 0xffe18a, // 검 색상 (0xRRGGBB)
  orbitRadius: 120, // Player 중심에서 검 중심까지의 거리 (px)
  angularSpeed: Math.PI * 4, // 검 회전 속도 (rad/초, 현재 초당 2회전)
  lifetimeSeconds: 0.5, // 검 한 개의 유지 시간 (초)
  bladeLength: 48, // 검 길이 (px, 끝 도달 거리 = 120 + 48/2 = 144)
  bladeWidth: 10, // 검 폭 (px)
  maximumHitAngleStep: 0.1, // 회전 중 타격 검사 최대 각도 간격 (rad, 0보다 커야 함)
};
export const playerBulletConfig: BulletConfig = {
  kind: 'bullet', // Player 직선 탄환
  intervalSeconds: 0.35, // 탄환 생성 간격 (초)
  attackRange: 800, // 가장 가까운 Enemy를 찾는 최대 중심 거리 (px)
  damageMultiplier: 1, // Player 기본 공격력에 곱할 배율
  color: 0xffe18a, // 탄환 색상 (0xRRGGBB)
  radius: 5, // 탄환 반지름 (px)
  speed: 620, // 탄환 이동 속도 (px/초)
  lifetimeSeconds: 1.6, // 탄환 최대 유지 시간 (초)
  maximumTravelDistance: 900, // 탄환 최대 이동 거리 (px)
  spawnGap: 3, // Player 외곽과 탄환 외곽 사이의 생성 여유 (px)
  attackLockSeconds: 0, // 발사 이동 잠금 시간 (초, Player에는 적용하지 않음)
};
export const enemySwordConfig: SwordConfig = {
  kind: 'sword', // Enemy 1 (근접 타입) 회전 검
  intervalSeconds: 1.2, // 검 생성 간격 (초)
  attackRange: 82, // 공격/추적 정지 기준 중심 거리 (px, Player 검과 거리 차이 확보)
  damageMultiplier: 1, // Enemy 기본 공격력에 곱할 배율
  color: 0xff8a9f, // 검 색상 (0xRRGGBB)
  orbitRadius: 44, // Enemy 중심에서 검 중심까지의 거리 (px)
  angularSpeed: Math.PI * 4, // 검 회전 속도 (rad/초)
  lifetimeSeconds: 0.5, // 검 한 개의 유지 시간 및 Enemy 이동 잠금 시간 (초)
  bladeLength: 28, // 검 길이 (px, 끝 도달 거리 = 44 + 28/2 = 58)
  bladeWidth: 10, // 검 폭 (px)
  maximumHitAngleStep: 0.1, // 회전 중 타격 검사 최대 각도 간격 (rad, 0보다 커야 함)
};
export const enemyBulletConfig: BulletConfig = {
  kind: 'bullet', // Enemy 2 (원거리 타입) 직선 탄환
  intervalSeconds: 1.4, // 탄환 생성 간격 (초)
  attackRange: 380, // 발사/추적 정지 기준 중심 거리 (px)
  damageMultiplier: 1, // Enemy 기본 공격력에 곱할 배율
  color: 0x80e4ff, // 탄환 색상 (0xRRGGBB)
  radius: 6, // 탄환 반지름 (px)
  speed: 250, // 탄환 이동 속도 (px/초)
  lifetimeSeconds: 2.5, // 탄환 최대 유지 시간 (초)
  maximumTravelDistance: 600, // 탄환 최대 이동 거리 (px)
  spawnGap: 3, // Enemy 외곽과 탄환 외곽 사이의 생성 여유 (px)
  attackLockSeconds: 0.18, // 발사 직후 Enemy 이동 잠금 시간 (초)
};

export const getPlayerWeapon = (kind: WeaponKind): WeaponConfig => kind === 'sword' ? playerSwordConfig : playerBulletConfig;
export const getEnemyWeapon = (kind: 'horizontal' | 'circular'): WeaponConfig => kind === 'horizontal' ? enemySwordConfig : enemyBulletConfig;
