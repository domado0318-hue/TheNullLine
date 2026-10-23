export const platformConfig = {
  groundDepth: -100, // 바닥과 외곽 배경 렌더 순서
  footprintWidth: 128, // 시설물 바닥 충돌 가로 크기 (px)
  footprintHeight: 64, // 시설물 바닥 충돌 세로 크기 (px)
  actorDepth: 10, // 플레이어와 시설물의 기준 렌더 순서
  occlusionAlpha: 0.4, // 플레이어를 가리는 시설물 불투명도 (0 초과~1 이하)
  occlusionPadding: 32, // 플레이어 가림 판정 여백 (px)
  companionOffsets: [ // 중심 시설물 기준 보조 소품의 위치와 충돌 크기 (px), 배열 순서가 원화 변형 1·2에 대응
    { x: -140, y: 24, width: 48, height: 40 },
    { x: 155, y: -12, width: 64, height: 48 },
  ],
  benchPositions: [ // 바닥 크기에 비례하는 시설물 중심 좌표 (0~1), 중앙과 긴 회피 통로 확보
    { x: 0.38, y: 0.32 },
    { x: 0.62, y: 0.32 },
    { x: 0.38, y: 0.68 },
    { x: 0.62, y: 0.68 },
  ],
};
