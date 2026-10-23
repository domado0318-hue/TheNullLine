export type CharacterId = 'mechanic' | 'signal' | 'carrier';
export const characterIds: readonly CharacterId[] = ['mechanic', 'signal', 'carrier'];

export const characters = {
  mechanic: {
    name: '철도 정비공', weapon: '회전 절단기', trait: '네 번째 공격마다 강타',
    description: '근접 돌파 · 적을 밀어내 퇴로를 만듭니다. 원거리 견제에 주의하세요.',
    maxHp: 150, // 시작 최대 HP
    speed: 280, // 이동 속도 (px/초)
    color: 0xffd580, // 캐릭터 및 무기 색 (0xRRGGBB)
  },
  signal: {
    name: '신호 기술자', weapon: '연쇄 방전기', trait: '가까운 적 최대 3명에게 전이',
    description: '연쇄 감전 · 밀집한 적에 강합니다. 낮은 체력과 흩어진 적에 주의하세요.',
    maxHp: 100, // 시작 최대 HP
    speed: 300, // 이동 속도 (px/초)
    color: 0x7cdbff, // 캐릭터 및 무기 색 (0xRRGGBB)
  },
  carrier: {
    name: '폐기물 운반원', weapon: '폐배터리 살포기', trait: '이동할수록 다음 함정 강화',
    description: '이동과 유인 · 지나간 길에 함정을 남깁니다. 막다른 길과 포위에 주의하세요.',
    maxHp: 120, // 시작 최대 HP
    speed: 320, // 이동 속도 (px/초)
    color: 0xa7ea91, // 캐릭터 및 무기 색 (0xRRGGBB)
  },
} satisfies Record<CharacterId, { name: string; weapon: string; trait: string; description: string; maxHp: number; speed: number; color: number }>;

export const characterRules = {
  attackDamage: 24, // 기본 공격력
  pickupRadius: 150, // 경험치 흡수 시작 반경 (px)
  maxSkillLevel: 5, // 최초 습득 포함 최대 선택 횟수
  choices: 3, // 레벨업 카드 수
  maximumReduction: 0.5, // 피해/간격 감소 상한 (비율)
  maximumVulnerability: 0.5, // 받는 피해 증가 상한 (비율)
  maximumSlow: 0.6, // 둔화 상한 (비율)
  supplyHeal: 0.25, // 보급 회복량 (최대 HP 비율)
  supplyShield: 0.2, // 보급 보호막 (최대 HP 비율)
  supplyShieldSeconds: 10, // 보급 보호막 유지 (초)
  supplyPickupRadius: 800, // 보급 회수 반경 (px)
};
