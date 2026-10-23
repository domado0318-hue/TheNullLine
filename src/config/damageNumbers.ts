export const damageNumberConfig = {
  fontSize: 24, // 일반 피해 글자 크기 (px)
  criticalFontSize: 32, // 치명타 글자 크기 (px)
  receivedFontSize: 28, // 플레이어 피격 피해 글자 크기 (px)
  color: '#fff0cf', // 일반 피해 글자색 (CSS)
  criticalColor: '#ffbe45', // 치명타 글자색 (CSS)
  receivedColor: '#ff7474', // 플레이어 피격 피해 글자색 (CSS)
  stroke: '#182126', // 일반 피해 외곽선 색 (CSS)
  criticalStroke: '#652716', // 치명타 외곽선 색 (CSS)
  receivedStroke: '#491720', // 플레이어 피격 피해 외곽선 색 (CSS)
  strokeThickness: 4, // 외곽선 두께 (px)
  lifetime: 0.85, // 표시 지속 시간 (초, 0 초과)
  fadeStart: 0.45, // 사라지기 시작하는 수명 비율 (0~1 미만)
  rise: 52, // 수명 동안 위로 떠오르는 거리 (px)
  topGap: 14, // 적 스프라이트 위쪽과 숫자 사이 거리 (px)
  laneGap: 18, // 연속 피해 숫자의 가로 분산 간격 (px)
  drift: 12, // 수명 동안 추가 가로 이동 거리 (px)
  popSeconds: 0.12, // 최초 확대에서 기본 크기로 돌아오는 시간 (초, 0 초과)
  popScale: 1.15, // 일반 피해 최초 확대 배율
  criticalPopScale: 1.35, // 치명타 최초 확대 배율
  maximum: 80, // 동시에 표시·재사용하는 텍스트 상한 (양의 정수)
  depth: 40, // 월드·HP 바 위, HUD 아래 표시 깊이
};
