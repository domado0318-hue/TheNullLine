export const uiConfig = {
  fontFamily: 'Arial, "Malgun Gothic", sans-serif', // UI 공통 글꼴
  overlayColor: 0x070b14, // 선택/재시작 화면 배경색 (0xRRGGBB)
  overlayAlpha: 0.92, // 선택/재시작 화면 배경 불투명도 (0~1)
  titleFontSize: 32, // 선택/재시작 제목 글자 크기 (px)
  bodyFontSize: 18, // 설명/조작 안내 글자 크기 (px)
  buttonFontSize: 26, // 버튼 글자 크기 (px)
  buttonWidth: 220, // 버튼 너비 (px)
  buttonHeight: 100, // 버튼 높이 (px)
  buttonSpacing: 260, // 나란한 버튼 중심 간 거리 (px)
  buttonColor: 0x253349, // 버튼 기본 배경색 (0xRRGGBB)
  buttonHoverColor: 0x3c5574, // 포인터가 올라간 버튼 배경색 (0xRRGGBB)
  buttonStrokeColor: 0x7b9cbd, // 버튼 테두리 색상 (0xRRGGBB)
  textColor: '#f4f8ff', // 기본 글자색 (CSS 색상)
  mutedTextColor: '#aabbce', // 보조 글자색 (CSS 색상)
  buttonOffsetY: 20, // 화면 중앙 기준 버튼의 세로 위치 (px)
  titleOffsetY: -130, // 화면 중앙 기준 제목의 세로 위치 (px)
  descriptionOffsetY: -70, // 화면 중앙 기준 설명의 세로 위치 (px)
  hintOffsetY: 100, // 화면 중앙 기준 조작 안내의 세로 위치 (px)
  overlayDepth: 1000, // HTML 선택/재시작 화면의 z-index
  healthBar: {
    height: 6, // HP 바 높이 (px)
    widthPadding: 8, // 개체 너비에 더할 HP 바의 총 너비 여유 (px)
    gap: 6, // 개체 상단과 HP 바 사이 거리 (px)
    backgroundColor: 0x401e2b, // HP 바의 빈 영역 색상 (0xRRGGBB)
    playerColor: 0x65ed94, // Player 남은 HP 색상 (0xRRGGBB)
    enemyColor: 0xff7085, // Enemy 남은 HP 색상 (0xRRGGBB)
    borderColor: 0x0b1018, // HP 바 테두리 색상 (0xRRGGBB)
    borderWidth: 1, // HP 바 테두리 두께 (px)
    depth: 20, // 월드 내 HP 바 표시 깊이
  },
  experience: {
    x: 24, // 화면 왼쪽에서 레벨/경험치 표시까지 거리 (px)
    y: 24, // 화면 위쪽에서 레벨 표시까지 거리 (px)
    levelPrefix: 'Lv.', // 레벨 숫자 앞에 표시할 문구
    levelFontSize: 24, // 레벨 글자 크기 (px)
    levelHeight: 30, // 레벨 표시가 차지할 세로 공간 (px)
    barGap: 8, // 레벨 표시 아래와 경험치 바 사이 거리 (px)
    barWidth: 280, // 경험치 바 너비 (px)
    barHeight: 24, // 경험치 바 높이 (px)
    barFontSize: 14, // 바 중앙의 현재/필요 경험치 글자 크기 (px)
    backgroundColor: 0x172235, // 경험치 바의 빈 영역 색상 (0xRRGGBB)
    fillColor: 0x60c9fa, // 획득한 경험치 영역 색상 (0xRRGGBB)
    borderColor: 0x91aec9, // 경험치 바 테두리 색상 (0xRRGGBB)
    borderWidth: 1, // 경험치 바 테두리 두께 (px)
    depth: 100, // 월드/HP 바보다 위에 표시할 HUD 깊이
  },
};
