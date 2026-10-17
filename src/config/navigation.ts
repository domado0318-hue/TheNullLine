export const navigationConfig = {
  collisionStep: 4, // 충돌 검사용 최대 이동 단계 길이 (px, 0보다 커야 함)
  cellSize: 32, // 경로 탐색 격자 한 변 길이 (px)
  clearance: 2, // 경로/예약 위치에서 개체 외곽에 더할 안전 여유 (px)
  nearestCellSearchRadius: 3, // 주변의 유효 경로 격자를 찾을 반경 (칸)
  maximumExpandedNodes: 12000, // 경로 탐색 한 번에 확장할 최대 노드 수
  repathIntervalSeconds: 0.55, // 경로를 다시 계산하는 최소 주기 (초)
  targetRepathDistance: 24, // 목표가 이동해 경로 재계산을 허용할 거리 (px)
  waypointDistance: 5, // 경로 중간 지점에 도착했다고 판단할 거리 (px)
  smoothingLookahead: 3, // 한 번에 확인할 경로 노드 수
  stuckRepathSeconds: 0.35, // 막힘이 이어질 때 경로 재탐색을 허용할 시간 (초)
  minimumForwardTravelRatio: 0.7, // 요청 이동량 대비 우회 방향을 탐색할 진행 비율 (0~1)
  progressScoreWeight: 0.4, // 우회 점수에서 목표에 가까워진 거리에 적용할 가중치
  stuckTravelRatio: 0.5, // 요청 이동량 대비 막힘으로 판단할 실제 이동 비율 (0~1)
  avoidanceAngles: [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2], // 우회 후보 각도 (rad, 진행 방향 기준)
};
