import type { CharacterId } from './characters';

export const playerLightConfig = {
  enabled: true, // 눈 주변 발광 표시 여부
  radius: 12, // 눈 중심의 빛 번짐 반경 (월드 px, 0 초과)
  coreRadius: 1.1, // 눈 중심 밝은 점 반경 (월드 px, 0 초과)
  haloAlpha: 0.6, // 빛 번짐 중심의 누적 불투명도 (0~1)
  coreAlpha: 0.7, // 중심 밝은 점 불투명도 (0~1)
  rings: 16, // 부드러운 번짐을 구성하는 겹 수 (정수, 1 이상)
  depth: 10.1, // 플레이어 위, HP 표시 아래의 렌더 순서
};

export const playerEyeColors: Record<CharacterId, number> = {
  mechanic: 0xffca63, // 정비공 눈빛: 따뜻한 금색 (RGB)
  signal: 0x7ef8ff, // 기술자 눈빛: 하늘색 (RGB)
  carrier: 0xe9ffa0, // 운반원 눈빛: 옅은 연두색 (RGB)
};
