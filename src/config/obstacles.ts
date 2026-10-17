export const obstacleConfig = {
  referenceArea: 3000 * 3000, // 기준 월드 면적: px²
  countAtReferenceArea: 8, // 기준 면적에 배치할 장애물 수 (개)
  minSizeRatio: 0.8, // 플레이어 한 변에 대한 배율; 원은 지름 기준
  maxSizeRatio: 2.5, // 플레이어 한 변 대비 장애물 최대 크기 배율 (원은 지름)
  extraPassageWidth: 8, // 플레이어 대각선 길이에 더할 통로 여유: px
  rectangleColor: 0xb87942, // 사각형 장애물 색상 (0xRRGGBB)
  circleColor: 0x9b72b0, // 원형 장애물 색상 (0xRRGGBB)
};
