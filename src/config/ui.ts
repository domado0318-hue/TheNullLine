export const uiConfig = {
  distancePixelsPerMeter: 50, // 플레이어용 거리 1m에 대응하는 월드 거리 (px/m), 시뮬레이션 수치 유지
  art: {
    panelKey: 'railway-panel', // 무광 안내판 텍스처 키
    panel: '/assets/ui/enamel-panel.png', // 글자·금속 광택이 없는 무광 생성 원화
    panelAtlas: '/assets/ui/enamel-panel.json', // 투명 여백을 제외한 안내판 프레임
    iconsKey: 'railway-equipment', // 장비·능력치 아이콘 텍스처 키
    icons: '/assets/ui/equipment-icons.png', // 생성 장비 원화 시트
    iconsAtlas: '/assets/ui/equipment-icons.json', // 장비별 원화 영역
    panelSize: { width: 2171, height: 724 }, // 안내판 원본 크기 (px)
    panelFrame: { x: 31, y: 134, width: 2109, height: 433 }, // 안내판 불투명 영역 (px)
    iconsSize: { width: 1448, height: 1086 }, // 장비 원본 크기 (px)
    iconFrames: {
      saw: { x: 49, y: 49, w: 346, h: 337 }, // saw 원화 영역 (px)
      bolt: { x: 441, y: 44, w: 264, h: 350 }, // bolt 원화 영역 (px)
      battery: { x: 758, y: 53, w: 311, h: 337 }, // battery 원화 영역 (px)
      bearing: { x: 1122, y: 68, w: 307, h: 317 }, // bearing 원화 영역 (px)
      arm: { x: 41, y: 404, w: 377, h: 317 }, // arm 원화 영역 (px)
      shield: { x: 455, y: 402, w: 255, h: 321 }, // shield 원화 영역 (px)
      magnet: { x: 743, y: 428, w: 318, h: 312 }, // magnet 원화 영역 (px)
      boot: { x: 1088, y: 443, w: 340, h: 288 }, // boot 원화 영역 (px)
      pulse: { x: 26, y: 754, w: 385, h: 277 }, // pulse 원화 영역 (px)
      repair: { x: 423, y: 728, w: 321, h: 312 }, // repair 원화 영역 (px)
      heart: { x: 775, y: 769, w: 293, h: 257 }, // heart 원화 영역 (px)
      arrow: { x: 1132, y: 773, w: 298, h: 250 }, // arrow 원화 영역 (px)
    },
    statIconSize: 30, // 캐릭터 능력치 아이콘 크기 (px)
    statGap: 24, // 캐릭터 능력치 사이 간격 (px)
  },
  railway: {
    ink: '#122e35', // 안내판 글자·외곽선 색 (CSS)
    enamel: '#f1e5c4', // 법랑판 바탕색 (CSS)
    edge: '#b6a987', // 법랑판 테두리·나사 색 (CSS)
    teal: '#12333b', // 카드·버튼 기본 바탕색 (CSS)
    tealLight: '#204751', // 카드 초상 배경색 (CSS)
    route: '#efb237', // 선택·노선 띠 색 (CSS)
    muted: '#bbcabf', // 보조 설명 글자색 (CSS)
    warning: '#b84636', // 운행 중단·위험 표시 색 (CSS)
    health: 0xd75b47, // 고정 HP 바 채움색 (0xRRGGBB)
    border: 3, // 안내판 외곽선 두께 (px)
    stripe: 7, // 안내판 아래 노선 띠 높이 (px)
    radius: 5, // 법랑판 모서리 반경 (px)
    screw: 5, // 모서리 고정 나사 지름 (px)
    badgeSize: 48, // 역 번호 원형 표식 크기 (px)
    arrowSize: 58, // 방향 화살표 구획 너비 (px)
    signWidth: 660, // 선택 화면 매달린 표지 너비 (px)
    signHeight: 100, // 선택 화면 원화 안내판 높이 (px)
    rodHeight: 22, // 매달림 지지대 길이 (px)
    iconSize: 104, // 스킬 카드 장비 원화 크기 (px)
    cardTitleSize: 23, // 선택 카드 역명판 제목 크기 (px)
    cardTitleHeight: 48, // 선택 카드 역명판 제목 높이 (px)
    cardFooterHeight: 42, // 캐릭터 선택 화살표 행 높이 (px)
    detailFontSize: 15, // 카드 보조 설명 글자 크기 (px)
    lineHeight: 1.45, // 카드 본문 줄 높이 (비율)
    shadow: 6, // 안내판 아래 그림자 거리 (px)
    hudHeight: 56, // 체력 바 법랑판 높이 (px)
    hudPadding: 14, // HUD 법랑판 내부 여백 (px)
    hudTrackHeight: 28, // 텍스트를 포함한 HP 바 높이 (px)
    barTextStroke: 2, // 채움·빈 바탕 위 공통 글자 외곽선 두께 (px)
    barFontSize: 16, // HP 바 중앙 수치 글자 크기 (px)
    hudNodeRadius: 4, // 경험치 노선 눈금 반경 (px)
    hudNodes: 5, // 경험치 노선 눈금 개수 (정수)
    healthX: 24, // HP 안내판 왼쪽 좌표 (px)
    healthY: 20, // HP 안내판 위쪽 좌표 (px)
    healthWidth: 328, // HP 안내판 너비 (px)
    slotX: 24, // 보유 스킬 첫 슬롯 왼쪽 좌표 (px)
    slotY: 576, // 보유 스킬 첫 행 위쪽 좌표 (px)
    slotSize: 48, // 보유 스킬 슬롯 한 변 (px)
    slotGap: 10, // 보유 스킬 슬롯 간 간격 (px)
    slotColumns: 11, // 보유 스킬 한 행 슬롯 수 (정수, 22개 스킬을 두 행에 표시)
    slotFontSize: 12, // 보유 스킬 이름·레벨 글자 크기 (px)
    skillHudY: 555, // 보유 스킬 안내 글자 위쪽 좌표 (px)
  },
  encounterHud: {
    x: 640, // 스테이지 표시 중심 가로 좌표 (px)
    y: 20, // 스테이지 표시 상단 좌표 (px)
    width: 560, // 스테이지 안내판 너비 (px)
    height: 76, // 스테이지 안내판 높이 (px)
    fontSize: 16, // 스테이지·보스 상태 글자 크기 (px)
    color: '#e3d9bb', // 상태 글자 색 (CSS)
    background: '#172124', // 상태 표시 바탕색 (CSS)
  },
  remainingEnemies: {
    right: 24, // 오른쪽 화면 가장자리 여백 (px)
    y: 20, // 남은 적 안내판 위쪽 좌표 (px)
    width: 268, // 남은 적 안내판 너비 (px)
    height: 56, // 남은 적 안내판 높이 (px)
    fontSize: 24, // 남은 적 수 글자 크기 (px)
  },
  encounterTransition: {
    seconds: 1.5, // Stage·Wave 안내 각각의 일시정지 시간 (초, 양수)
    fontSize: 96, // 화면 중앙 전환 제목 크기 (px)
    detailFontSize: 28, // 전환 보조 문구 크기 (px)
    detailOffsetY: 88, // 중앙 기준 보조 문구 세로 위치 (px)
    backgroundAlpha: 0.65, // 전환 중 화면 어둡기 (0~1)
    depth: 200, // HUD 위에 표시할 전환 안내 깊이
  },
  fontFamily: '"Yangjin", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif', // 메뉴·HUD 공통 글꼴, 양진체 우선
  overlayColor: 0x091c21, // 선택/재시작 화면 배경색 (0xRRGGBB)
  overlayAlpha: 0.87, // 선택/재시작 화면 배경 불투명도 (0~1)
  titleFontSize: 32, // 선택/재시작 제목 글자 크기 (px)
  bodyFontSize: 18, // 설명/조작 안내 글자 크기 (px)
  buttonFontSize: 26, // 버튼 글자 크기 (px)
  buttonWidth: 300, // 버튼 너비 (px)
  buttonHeight: 82, // 버튼 높이 (px)
  buttonSpacing: 340, // 나란한 버튼 중심 간 거리 (px)
  buttonColor: 0x253349, // 버튼 기본 배경색 (0xRRGGBB)
  buttonHoverColor: 0x3c5574, // 포인터가 올라간 버튼 배경색 (0xRRGGBB)
  buttonStrokeColor: 0x7b9cbd, // 버튼 테두리 색상 (0xRRGGBB)
  textColor: '#f1e5c4', // 기본 글자색 (CSS 색상)
  mutedTextColor: '#bbcabf', // 보조 글자색 (CSS 색상)
  buttonOffsetY: 20, // 화면 중앙 기준 버튼의 세로 위치 (px)
  titleOffsetY: -130, // 화면 중앙 기준 제목의 세로 위치 (px)
  descriptionOffsetY: -70, // 화면 중앙 기준 설명의 세로 위치 (px)
  hintOffsetY: 100, // 화면 중앙 기준 조작 안내의 세로 위치 (px)
  overlayDepth: 1000, // HTML 선택/재시작 화면의 z-index
  titleScreen: {
    image: '/assets/ui/title.png', // 선택한 C 타이틀 이미지 경로
    routeImage: '/assets/ui/title-route.svg', // 시작 문구 아래의 지하철 노선 도안
    buttonX: 267, // 시작 버튼 중심의 화면 가로 위치 (px)
    buttonY: 448, // 시작 버튼 중심의 화면 세로 위치 (px)
    buttonWidth: 260, // 시작 버튼 너비 (px)
    buttonHeight: 82, // 시작 버튼 높이 (px)
    fontSize: 28, // 시작 버튼 글자 크기 (px)
    letterSpacing: 5, // 시작 버튼 글자 사이 간격 (px)
    routeWidth: 240, // 시작 문구 아래 노선 너비 (px)
    routeHeight: 18, // 노선과 역 표시 높이 (px)
    routeGap: 12, // 시작 문구와 노선 사이 간격 (px)
    borderWidth: 2, // 시작 버튼 테두리 두께 (px)
    textColor: '#f3e7c8', // 원화 제목과 맞춘 시작 버튼 글자·테두리 색 (CSS 색상)
    backgroundColor: '#101e22', // 시작 버튼 배경색 (CSS 색상)
    hoverColor: '#354343', // 포인터가 올라간 시작 버튼 배경색 (CSS 색상)
  },
  cards: {
    width: 320, // 선택 카드 너비 (px)
    height: 424, // 긴 강화 전후 효과를 포함한 선택 카드 높이 (px)
    gap: 24, // 카드 간격 (px)
    padding: 18, // 카드 안쪽 여백 (px)
    fontSize: 18, // 카드 본문 크기 (px)
    titleOffset: -282, // 중앙 기준 제목 위치 (px)
    descriptionOffset: -222, // 중앙 기준 설명 위치 (px)
    hintOffset: 222, // 중앙 기준 조작 안내 위치 (px)
    ownedOffset: 278, // 중앙 기준 보유 스킬 표시 위치 (px)
    ownedFontSize: 14, // 보유 스킬 글자 크기 (px)
    criticalStatsOffset: 260, // 화면 중앙 기준 현재 치명타 능력치 표시 위치 (px)
    criticalStatsFontSize: 18, // 현재 치명타 능력치 글자 크기 (px)
    inputDelayMs: 350, // 연속 선택 방지 최소 대기 (밀리초)
  },
  characterCards: {
    height: 424, // 캐릭터 이미지를 포함한 선택 카드 높이 (px)
    centerOffsetY: 16, // 화면 중앙 기준 카드 행 세로 이동 (px)
    portraitHeight: 216, // 카드 상단 투명 캐릭터 이미지 높이 (px)
    portraitGap: 12, // 그림과 설명 사이 여백 (px)
    fontSize: 17, // 캐릭터 카드 설명 크기 (px)
    titleOffset: -288, // 화면 중앙 기준 제목 위치 (px)
    descriptionOffset: -233, // 화면 중앙 기준 설명 위치 (px)
    hintOffset: 285, // 화면 중앙 기준 조작 안내 위치 (px)
  },
  characterHud: {
    x: 1256, // 화면 오른쪽 정렬 기준 위치 (px)
    y: 24, // 화면 위 여백 (px)
    fontSize: 18, // 상태 글자 크기 (px)
    shieldRadius: 34, // 캐릭터 보호막 표시 반경 (px)
    shieldColor: 0xb1f3ff, // 보호막 색 (0xRRGGBB)
    effectAlpha: 0.3, // 범위 효과 불투명도 (비율)
    lineWidth: 2, // 공격/보호막 선 두께 (px)
  },
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
    x: 24, // 화면 왼쪽 위 경험치 법랑판 왼쪽 좌표 (px)
    y: 20, // 상단 HUD와 정렬한 경험치 법랑판 위쪽 좌표 (px)
    levelPrefix: 'Lv.', // 레벨 숫자 앞에 표시할 문구
    levelFontSize: 20, // 레벨 글자 크기 (px)
    levelHeight: 30, // 레벨 표시가 차지할 세로 공간 (px)
    levelWidth: 80, // 세 자리 레벨을 포함한 경험치 바 왼쪽 구획 너비 (px)
    barGap: 8, // 레벨 표시 아래와 경험치 바 사이 거리 (px)
    barWidth: 220, // 경험치 바 너비 (px)
    barHeight: 28, // 텍스트를 포함한 경험치 바 높이 (px)
    barFontSize: 16, // 바 중앙의 현재/필요 경험치 글자 크기 (px)
    backgroundColor: 0x172235, // 경험치 바의 빈 영역 색상 (0xRRGGBB)
    fillColor: 0xefb237, // 획득한 경험치 영역 색상 (0xRRGGBB)
    borderColor: 0x91aec9, // 경험치 바 테두리 색상 (0xRRGGBB)
    borderWidth: 1, // 경험치 바 테두리 두께 (px)
    depth: 100, // 월드/HP 바보다 위에 표시할 HUD 깊이
  },
};
