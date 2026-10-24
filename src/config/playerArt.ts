import type { CharacterId } from './characters';

export const playerArtConfig = {
  displaySize: 64, // 투명 여백 포함 스프라이트 표시 한 변 (px), 충돌 몸체는 기존 48px 유지
  frameRate: 9, // 이동 애니메이션 초당 프레임 수 (프레임/초)
  framesPerDirection: 4, // 앞·앞 대각선·옆·뒤 대각선·뒤 각 방향의 프레임 수
  idleCycleSeconds: 2.4, // 정지 호흡 한 주기 (초), 0 초과
  idleHeightPixels: 1.8, // 들숨에서 늘어나는 논리 셀 높이 (px), 0 이상
  idleWidthPixels: 0.4, // 들숨에서 늘어나는 논리 셀 너비 (px), 0 이상
  attackMotionSeconds: 0.18, // 공격 자세가 뻗고 복귀하는 전체 시간 (초)
  attackReachPixels: 4, // 공격 방향으로 스프라이트가 이동하는 최대 거리 (px)
  attackTiltRadians: 0.12, // 공격 방향으로 기울이는 최대 각도 (라디안)
  strongAttackScale: 1.06, // 강화 공격 때 스프라이트 표시 크기 배율
  footAnchor: 285 / 320, // 원본 셀의 발바닥 기준 Y 위치 (0~1 비율)
  depth: 10, // 월드 내 플레이어 그림 표시 깊이 (HP 바보다 아래)
};

// 앞·앞 대각선·옆·뒤 대각선·뒤 순서. 양발을 지면에 둔 기존 자세의 열 번호.
export const playerIdlePoses: Record<CharacterId, readonly number[]> = {
  mechanic: [0, 0, 0, 0, 0],
  signal: [0, 0, 0, 0, 0],
  carrier: [3, 3, 1, 1, 1],
};

export const playerArt: Record<CharacterId, { key: string; sheet: string; atlas: string; portrait: string }> = {
  mechanic: { key: 'player-mechanic-v5', sheet: '/assets/players/mechanic-walk.png', atlas: '/assets/players/mechanic-walk.json',
    portrait: '/assets/players/mechanic-portrait.png' },
  signal: { key: 'player-signal-v7', sheet: '/assets/players/signal-walk.png', atlas: '/assets/players/signal-walk.json',
    portrait: '/assets/players/signal-portrait.png' },
  carrier: { key: 'player-carrier-v7', sheet: '/assets/players/carrier-walk.png', atlas: '/assets/players/carrier-walk.json',
    portrait: '/assets/players/carrier-portrait.png' },
};
